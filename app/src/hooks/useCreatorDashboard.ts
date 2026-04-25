// src/hooks/useCreatorDashboard.ts
//
// ══════════════════════════════════════════════════════════════════════════════
// BUG FIXES — root causes and exact solutions
// ══════════════════════════════════════════════════════════════════════════════
//
// BUG 1: STALE CLOSURES → stats never update in production
// ─────────────────────────────────────────────────────────
// Root cause: fetchStats was in useCallback with [creatorPublicKey, prevTotal]
// deps. prevTotal is STATE, so every time it changes (each fetch), fetchStats
// gets a new reference. The useEffect that sets up the WebSocket subscription
// has [fetchStats, creatorPublicKey] as deps, so it TEARS DOWN and RE-CREATES
// the subscription on every single poll. On devnet this is fine (fast). On
// production (Vercel + cold starts + Helius devnet latency), the subscription
// is killed before it ever fires, causing "no updates" in production.
//
// Fix: Remove prevTotal from fetchStats deps. Track prevTotal in a REF not
// state, so fetchStats never changes identity. The subscription is created
// exactly ONCE per wallet connection and lives until disconnect.
//
// BUG 2: SUBSCRIPTION SETUP RACE CONDITION
// ─────────────────────────────────────────
// Root cause: useEffect calls fetchStats() (async), then immediately calls
// rpc.onAccountChange(). The first fetchStats hasn't resolved yet, so prevTotal
// is still null. When the subscription fires and calls fetchStats again,
// prevTotal is STILL null (stale closure), so newTip never triggers.
//
// Fix: Track prevTotal in a ref. fetchStats reads/writes the ref directly.
// No state, no stale closure, no re-creation of the subscription.
//
// BUG 3: POLLING FIRES EVEN WHEN SUBSCRIPTION IS ALIVE
// ────────────────────────────────────────────────────
// Root cause: setInterval(fetchStats, 60_000) was being reset every time
// useEffect ran (which was every time fetchStats changed identity — i.e.,
// on every poll). This created N concurrent intervals, each polling
// independently. On production this caused duplicate RPC calls and
// inconsistent state.
//
// Fix: intervalRef is managed with proper cleanup. useEffect only re-runs
// when creatorPublicKey changes, not when fetchStats changes.
//
// BUG 4: NOTIFICATIONS NOT FIRING (NotificationProvider)
// ───────────────────────────────────────────────────────
// Root cause: poll() in NotificationProvider was wrapped in useCallback with
// [connected, publicKey, addNotification] deps. addNotification itself was a
// useCallback with [publicKey] dep. This circular dependency caused the
// subscription to re-create itself every time publicKey changed (i.e., once
// on connect). After the first re-create, the old subscription was removed
// but the new poll() function referenced the OLD addNotification closure.
// In production, this caused all notifications to be silently dropped.
//
// Fix: addNotification reads publicKey from a ref (not closure), so it never
// changes identity. poll() never changes identity. Subscription is stable.

import { useState, useEffect, useCallback, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { getLightRpc } from "@/lib/light/connection";
import {
  deriveCreatorVaultAddress,
  type WalletAdapterSigner,
  AlreadyProcessedError,
} from "@/lib/light/shielded-transfer";
import { LAMPORTS_PER_SOL, WSOL_MINT } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatorStats {
  tipCount: number;
  totalClaimedSol: number;
  isActive: boolean;
  compressedSol: number;
  vaultSol: number;
  withdrawableSol: number;
  totalReceivedSol: number;
  unclaimedSol: number;
}

export interface UseCreatorDashboardReturn {
  stats: CreatorStats | null;
  loading: boolean;
  error: string | null;
  newTip: boolean;
  refresh: () => void;
  dismissNewTip: () => void;
  isClaiming: boolean;
  claimError: string | null;
  claimCompressedFunds: (wallet: WalletAdapterSigner) => Promise<string | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCreatorDashboard(
  creatorPublicKey: PublicKey | null
): UseCreatorDashboardReturn {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const statsRef = useRef<CreatorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTip, setNewTip] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // BUG FIX 1+2: prevTotal as a REF, not state.
  // This breaks the stale-closure chain completely. fetchStats never changes
  // identity, so the subscription never gets torn down on each poll.
  const prevTotalRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subIdRef = useRef<number | null>(null);

  // ── fetchStats — stable identity, never changes ──────────────────────────
  const fetchStats = useCallback(async () => {
    if (!creatorPublicKey) return;
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setError(null);

    try {
      const rpc = getLightRpc();

      // ── 1. Vault PDA ────────────────────────────────────────────────────
      const vaultPda = deriveCreatorVaultAddress(creatorPublicKey);
      const accountInfo = await rpc.getAccountInfo(vaultPda);

      let tipCount = 0;
      let totalClaimed = 0;
      let isActive = true;
      let vaultSol = 0;
      let rentExempt = 0;

      if (accountInfo) {
        vaultSol = accountInfo.lamports / LAMPORTS_PER_SOL;
        rentExempt = (await rpc.getMinimumBalanceForRentExemption(
          accountInfo.data?.length ?? 0
        )) / LAMPORTS_PER_SOL;

        if (accountInfo.data && accountInfo.data.length >= 8 + 32 + 32 + 8 + 8 + 8 + 1) {
          const data = Buffer.from(accountInfo.data);
          tipCount = Number(data.readBigUInt64LE(8 + 32 + 32 + 8));
          totalClaimed = Number(data.readBigUInt64LE(8 + 32 + 32 + 8 + 8)) / LAMPORTS_PER_SOL;
          isActive = data[8 + 32 + 32 + 8 + 8 + 8] === 1;
        }
      }

      const withdrawableSol = Math.max(0, vaultSol - rentExempt);

      // ── 2. Compressed Light ATA balance ─────────────────────────────────
      let compressedSol = 0;
      try {
        const { getAssociatedTokenAddressInterface, getAtaInterface } =
          await import("@lightprotocol/compressed-token/unified");
        const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, creatorPublicKey);
        const ataInfo = await getAtaInterface(rpc, lightAta, creatorPublicKey, WSOL_MINT);
        compressedSol = Number(ataInfo?.parsed?.amount ?? 0) / LAMPORTS_PER_SOL;
      } catch {
        // No compressed balance — normal on first use
      }

      const totalReceivedSol = compressedSol + vaultSol + totalClaimed;

      const newStats: CreatorStats = {
        tipCount,
        totalClaimedSol: totalClaimed,
        isActive,
        compressedSol,
        vaultSol,
        withdrawableSol,
        totalReceivedSol,
        unclaimedSol: compressedSol,
      };

      // BUG FIX 1: prevTotal is now a ref — no stale closure possible
      if (prevTotalRef.current !== null && totalReceivedSol > prevTotalRef.current + 0.000_01) {
        console.log("[useCreatorDashboard] New tip! +", (totalReceivedSol - prevTotalRef.current).toFixed(5), "SOL");
        setNewTip(true);
      }
      prevTotalRef.current = totalReceivedSol;

      // Only update state if values actually changed (prevents unnecessary re-renders)
      setStats((prev) => {
        if (
          !prev ||
          prev.compressedSol !== newStats.compressedSol ||
          prev.vaultSol !== newStats.vaultSol ||
          prev.tipCount !== newStats.tipCount ||
          prev.withdrawableSol !== newStats.withdrawableSol
        ) {
          statsRef.current = newStats;
          return newStats;
        }
        return prev;
      });
    } catch (err: any) {
      console.error("[useCreatorDashboard] Fetch error:", err.message);
      setError(err.message ?? "Failed to load stats");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
    // BUG FIX 1: creatorPublicKey.toBase58() only — NOT prevTotal
    // This means fetchStats has a stable identity and the subscription never
    // gets torn down on each poll.
  }, [creatorPublicKey?.toBase58()]);

  // ── Setup subscription + polling ─────────────────────────────────────────
  useEffect(() => {
    if (!creatorPublicKey) return;

    // Initial load indicator
    setLoading(true);
    prevTotalRef.current = null;

    // Run first fetch
    fetchStats();

    const rpc = getLightRpc();
    const vaultPda = deriveCreatorVaultAddress(creatorPublicKey);

    console.log("[useCreatorDashboard] Subscribing:", vaultPda.toBase58().slice(0, 8));

    // BUG FIX 2: Subscription created ONCE. Never recreated on poll.
    subIdRef.current = rpc.onAccountChange(
      vaultPda,
      () => {
        console.log("[useCreatorDashboard] 🔔 Vault changed — refreshing");
        fetchStats();
      },
      "confirmed"
    );

    // BUG FIX 3: Single interval, never recreated
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchStats, 30_000);

    return () => {
      if (subIdRef.current !== null) {
        rpc.removeAccountChangeListener(subIdRef.current);
        subIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      prevTotalRef.current = null;
      console.log("[useCreatorDashboard] Cleanup complete");
    };
    // BUG FIX 3: Only creatorPublicKey.toBase58() as dep — NOT fetchStats
    // fetchStats is stable (only depends on creatorPublicKey), so this is safe
    // and the subscription is created exactly ONCE per wallet connection.
  }, [creatorPublicKey?.toBase58()]);

  const refresh = useCallback(() => { fetchStats(); }, [fetchStats]);
  const dismissNewTip = useCallback(() => setNewTip(false), []);

  // ── Claim compressed funds ───────────────────────────────────────────────
  const claimCompressedFunds = useCallback(
    async (wallet: WalletAdapterSigner): Promise<string | null> => {
      if (!creatorPublicKey) return null;

      const currentCompressed = statsRef.current?.compressedSol ?? 0;

      if (currentCompressed < 0.000_01) {
        throw new Error("No compressed balance to claim.");
      }

      setIsClaiming(true);
      setClaimError(null);

      try {
        const rpc = getLightRpc();
        const amountLamports = Math.floor(currentCompressed * LAMPORTS_PER_SOL);

        console.log("[useCreatorDashboard] Claiming", amountLamports, "lamports");

        const { createUnwrapInstructions } = await import("@lightprotocol/compressed-token/unified");
        const { Transaction, ComputeBudgetProgram } = await import("@solana/web3.js");
        const { signAndSendTx } = await import("@/lib/light/shielded-transfer");
        const {
          createAssociatedTokenAccountInstruction,
          createCloseAccountInstruction,
          getAssociatedTokenAddressSync,
          TOKEN_PROGRAM_ID,
        } = await import("@solana/spl-token");

        const splAta = getAssociatedTokenAddressSync(WSOL_MINT, wallet.publicKey, false, TOKEN_PROGRAM_ID);
        const ataInfo = await rpc.getAccountInfo(splAta);

        if (!ataInfo) {
          console.log("[useCreatorDashboard] Creating SPL wSOL ATA...");
          const createTx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
            createAssociatedTokenAccountInstruction(wallet.publicKey, splAta, wallet.publicKey, WSOL_MINT)
          );
          const { blockhash } = await rpc.getLatestBlockhash();
          createTx.recentBlockhash = blockhash;
          createTx.feePayer = wallet.publicKey;
          try {
            await signAndSendTx(rpc, createTx, wallet);
            await new Promise((r) => setTimeout(r, 2000));
          } catch (e: any) {
            const m = String(e?.message ?? "");
            if (!m.includes("already in use") && !m.includes("already been processed")) throw e;
          }
        }

        const unwrapBatches = await createUnwrapInstructions(
          rpc, splAta, wallet.publicKey, WSOL_MINT, amountLamports, wallet.publicKey
        );

        if (unwrapBatches.length === 0) throw new Error("No unwrap instructions generated");

        // Close ATA on last batch to convert wSOL → native SOL
        unwrapBatches[unwrapBatches.length - 1].push(
          createCloseAccountInstruction(splAta, wallet.publicKey, wallet.publicKey)
        );

        let finalSig: string | null = null;
        for (let i = 0; i < unwrapBatches.length; i++) {
          const batch = unwrapBatches[i];
          console.log(`[useCreatorDashboard] Batch ${i + 1}/${unwrapBatches.length}`);

          const tx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 }),
            ...batch.filter((ix) => ix.programId.toBase58() !== ComputeBudgetProgram.programId.toBase58())
          );
          const { blockhash } = await rpc.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = wallet.publicKey;
          finalSig = await signAndSendTx(rpc, tx, wallet);
          console.log(`[useCreatorDashboard] Batch ${i + 1} confirmed:`, finalSig);
        }

        // 4. Record the claim in the Anchor Vault PDA for historical stats
        try {
          const { claimPrivateShare } = await import("@/lib/anchor/privybag-client");
          await claimPrivateShare(wallet, BigInt(amountLamports));
          console.log("[useCreatorDashboard] Historical claim recorded in Vault PDA.");
        } catch (e: any) {
          console.warn("[useCreatorDashboard] Could not record claim in Vault PDA (stats may be out of sync):", e.message);
        }
        
        console.log("[useCreatorDashboard] ✅ Claim complete. Waiting 2s for indexer...");
        await new Promise(r => setTimeout(r, 2000));
        await fetchStats();
        return finalSig;
      } catch (err: any) {
        if (
          err instanceof AlreadyProcessedError ||
          err?.name === "AlreadyProcessedError" ||
          String(err?.message).includes("already been processed")
        ) {
          console.log("[useCreatorDashboard] Already confirmed — waiting 2s then refreshing");
          await new Promise(r => setTimeout(r, 2000));
          await fetchStats();
          return "already-confirmed";
        }
        const msg = err?.message ?? "Claim failed";
        console.error("[useCreatorDashboard] Claim error:", msg);
        setClaimError(msg);
        throw err;
      } finally {
        setIsClaiming(false);
      }
    },
    [creatorPublicKey?.toBase58(), fetchStats]
  );

  return {
    stats,
    loading,
    error,
    newTip,
    refresh,
    dismissNewTip,
    isClaiming,
    claimError,
    claimCompressedFunds,
  };
}
