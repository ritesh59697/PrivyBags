// src/hooks/useCreatorDashboard.ts
//
// FIX 3: SEPARATED BALANCES
//   The old version mixed compressed (Light Protocol) balance with vault (Anchor PDA)
//   balance into a single "unclaimed" number. This caused:
//     - Dashboard showing 0.35 SOL unclaimed
//     - Withdraw failing with "vault below rent exempt"
//     - Because the 0.35 SOL was compressed (Light ATA), NOT in the vault
//
//   New structure:
//     compressedSol   — wSOL in the creator's Light compressed ATA (from shielded tips)
//     vaultSol        — native SOL in the Anchor vault PDA (from claimed/deposited tips)
//     withdrawableSol — vaultSol minus rent-exempt minimum (what can actually be withdrawn)
//     totalReceivedSol — compressedSol + vaultSol (total in either location)
//     unclaimedSol    — compressedSol (pending claim/decompress)
//     totalClaimedSol — from on-chain vault data
//
// FIX 4: CLAIM FLOW
//   claimCompressedFunds() decompresses the creator's Light ATA balance and sends
//   it to the vault PDA (or directly to their wallet). This is the missing step
//   between "received tip" and "can withdraw".
//
// FLOW:
//   Fan sends tip → creator's Light compressed ATA (compressedSol ↑)
//   Creator clicks "Claim" → claimCompressedFunds() → vault PDA (vaultSol ↑, compressedSol ↓)
//   Creator clicks "Withdraw" → withdrawFromVault() → creator wallet

import { useState, useEffect, useCallback, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { getLightRpc } from "@/lib/light/connection";
import { deriveCreatorVaultAddress, type WalletAdapterSigner, AlreadyProcessedError } from "@/lib/light/shielded-transfer";
import { LAMPORTS_PER_SOL, WSOL_MINT } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatorStats {
  // On-chain vault data (from Anchor PDA)
  tipCount: number;
  totalClaimedSol: number;
  isActive: boolean;

  // Compressed Light ATA balance (pending claim)
  compressedSol: number;

  // Vault PDA native SOL
  vaultSol: number;

  // Derived values
  withdrawableSol: number;   // vaultSol - rentExempt (what can be withdrawn NOW)
  totalReceivedSol: number;   // compressedSol + vaultSol (everything, either location)
  unclaimedSol: number;   // compressedSol (in Light, needs claim step first)
}

export interface UseCreatorDashboardReturn {
  stats: CreatorStats | null;
  loading: boolean;
  error: string | null;
  newTip: boolean;
  refresh: () => void;
  dismissNewTip: () => void;

  // FIX 4: Claim flow
  isClaiming: boolean;
  claimError: string | null;
  claimCompressedFunds: (wallet: WalletAdapterSigner) => Promise<string | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCreatorDashboard(
  creatorPublicKey: PublicKey | null
): UseCreatorDashboardReturn {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTip, setNewTip] = useState(false);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);

  // Claim state
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // ── Fetch stats ─────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!creatorPublicKey) return;

    if (!stats) setLoading(true);
    setError(null);

    try {
      const rpc = getLightRpc();

      // ── 1. Vault PDA (Anchor) ─────────────────────────────────────────────
      const vaultPda = deriveCreatorVaultAddress(creatorPublicKey);
      const accountInfo = await rpc.getAccountInfo(vaultPda);

      let tipCount = 0;
      let totalClaimed = 0;
      let isActive = true;
      let vaultSol = 0;
      let rentExempt = 0;

      if (accountInfo) {
        // Raw lamports in the vault PDA account
        vaultSol = accountInfo.lamports / LAMPORTS_PER_SOL;
        rentExempt = (await rpc.getMinimumBalanceForRentExemption(
          accountInfo.data?.length ?? 0
        )) / LAMPORTS_PER_SOL;

        // Parse Anchor account data if present
        if (accountInfo.data && accountInfo.data.length >= 8 + 32 + 32 + 8 + 8 + 8 + 1) {
          const data = Buffer.from(accountInfo.data);
          // Layout: discriminator(8) + creator(32) + bags_token_mint(32)
          //         + total_received(8) + tip_count(8) + total_claimed(8)
          //         + is_active(1) + ...
          const totalReceived_raw = Number(data.readBigUInt64LE(8 + 32 + 32));
          tipCount = Number(data.readBigUInt64LE(8 + 32 + 32 + 8));
          totalClaimed = Number(data.readBigUInt64LE(8 + 32 + 32 + 8 + 8)) / LAMPORTS_PER_SOL;
          isActive = data[8 + 32 + 32 + 8 + 8 + 8] === 1;
        }
      }

      const withdrawableSol = Math.max(0, vaultSol - rentExempt);

      // ── 2. Compressed Light ATA balance ─────────────────────────────────
      // FIX 3: This is the REAL source of "unclaimed" funds after a shielded tip.
      // Do NOT mix this with vaultSol for withdraw calculations.
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

      // Detect new tips by comparing with previous total
      if (prevTotal !== null && totalReceivedSol > prevTotal + 0.000_01) {
        console.log("[useCreatorDashboard] New tip detected! +", (totalReceivedSol - prevTotal).toFixed(5), "SOL");
        setNewTip(true);
      }
      setPrevTotal(totalReceivedSol);

      // Atomic state update — prevent flickering by only updating if values actually changed
      setStats(prev => {
        const hasChanged = !prev || 
          prev.compressedSol !== newStats.compressedSol || 
          prev.vaultSol !== newStats.vaultSol || 
          prev.tipCount !== newStats.tipCount;
        
        if (!hasChanged) return prev;
        return newStats;
      });

    } catch (err: any) {
      console.error("[useCreatorDashboard] Fetch error:", err.message);
      setError(err.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [creatorPublicKey?.toBase58(), prevTotal]);

  // Use a ref for the interval to prevent multiple timers if the component re-renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // ── Production-Safe Polling (Vercel Friendly) ────────────────────────────
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchStats();
    }, 8_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchStats, creatorPublicKey?.toBase58()]);

  const refresh = useCallback(() => { fetchStats(); }, [fetchStats]);
  const dismissNewTip = useCallback(() => setNewTip(false), []);

  // ── FIX 4: Claim compressed funds ─────────────────────────────────────────
  //
  // This decompresses the creator's Light wSOL balance and sends it
  // to their wallet (or vault PDA). This is the missing step between
  // "tip received in Light ATA" and "funds available to withdraw".
  //
  // Uses Light Protocol's transferInterface / decompress internally.
  // Sends funds directly to the creator's wallet (not the vault PDA)
  // for maximum simplicity.
  const claimCompressedFunds = useCallback(
    async (wallet: WalletAdapterSigner): Promise<string | null> => {
      if (!creatorPublicKey) return null;
      if (!stats?.compressedSol || stats.compressedSol < 0.000_01) {
        throw new Error("No compressed balance to claim.");
      }

      setIsClaiming(true);
      setClaimError(null);

      try {
        const rpc = getLightRpc();
        const amountLamports = Math.floor(stats.compressedSol * LAMPORTS_PER_SOL);

        console.log(
          "[useCreatorDashboard] Claiming compressed funds...",
          "\n  amount:", amountLamports.toString(), "lamports",
          `\n  (~${stats.compressedSol.toFixed(5)} SOL)`
        );

        // Import Light SDK for building instructions (we can't use helper functions that expect a raw Keypair)
        const { createUnwrapInstructions } = await import("@lightprotocol/compressed-token/unified");
        const { Transaction, ComputeBudgetProgram, SystemProgram } = await import("@solana/web3.js");
        const { signAndSendTx } = await import("@/lib/light/shielded-transfer");
        const {
          createAssociatedTokenAccountInstruction,
          createCloseAccountInstruction,
          getAssociatedTokenAddressSync,
          TOKEN_PROGRAM_ID,
        } = await import("@solana/spl-token");

        // 1. Ensure the native SPL wSOL ATA exists to receive the decompressed funds
        const splAta = getAssociatedTokenAddressSync(
          WSOL_MINT, wallet.publicKey, false, TOKEN_PROGRAM_ID
        );
        const ataInfo = await rpc.getAccountInfo(splAta);
        
        if (!ataInfo) {
          console.log("[useCreatorDashboard] SPL wSOL ATA missing. Creating it first...");
          const createTx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
            createAssociatedTokenAccountInstruction(
              wallet.publicKey, splAta, wallet.publicKey, WSOL_MINT
            )
          );
          const { blockhash } = await rpc.getLatestBlockhash();
          createTx.recentBlockhash = blockhash;
          createTx.feePayer = wallet.publicKey;

          try {
            await signAndSendTx(rpc, createTx, wallet);
            console.log("[useCreatorDashboard] SPL wSOL ATA created.");
            // Wait a bit for the account to be visible to the SDK simulation
            await new Promise(r => setTimeout(r, 2000));
          } catch (e: any) {
             // If it already exists or was confirmed, we can continue
             if (!String(e?.message).includes("already in use") && 
                 !String(e?.message).includes("already been processed")) {
               throw e;
             }
          }
        }

        // 2. Build unwrap batches (this automatically decompresses the Light balance into the splAta)
        console.log("[useCreatorDashboard] Building unwrap instructions...");
        const unwrapBatches = await createUnwrapInstructions(
          rpc,
          splAta,              // destination (now confirmed to exist)
          wallet.publicKey,    // owner
          WSOL_MINT,           // mint
          amountLamports,      // amount
          wallet.publicKey     // payer
        );

        if (unwrapBatches.length === 0) {
          throw new Error("No unwrap instructions generated");
        }

        // Append close-account to the final batch (to convert SPL wSOL back to native SOL in the wallet)
        const closeIx = createCloseAccountInstruction(
          splAta,
          wallet.publicKey,    // destination for the recovered SOL
          wallet.publicKey     // authority
        );
        unwrapBatches[unwrapBatches.length - 1].push(closeIx);

        // 3. Sign and send batches sequentially
        let finalSig: string | null = null;
        for (let i = 0; i < unwrapBatches.length; i++) {
          const batch = unwrapBatches[i];
          console.log(`[useCreatorDashboard] Sending batch ${i + 1}/${unwrapBatches.length}...`);

          const tx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 }),
            // Filter out any SDK-injected compute budget instructions to avoid duplicates
            ...batch.filter(ix => ix.programId.toBase58() !== ComputeBudgetProgram.programId.toBase58())
          );

          const { blockhash } = await rpc.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = wallet.publicKey;

          finalSig = await signAndSendTx(rpc, tx, wallet);
          console.log(`[useCreatorDashboard] Batch ${i + 1} confirmed:`, finalSig);
        }

        if (!finalSig) throw new Error("Transaction failed");

        console.log("[useCreatorDashboard] ✅ Claim complete — native SOL in wallet:", finalSig);
        console.log("[useCreatorDashboard] Explorer: https://explorer.solana.com/tx/" + finalSig + "?cluster=devnet");

        // Refresh stats after claim
        await fetchStats();
        return finalSig;
      } catch (err: any) {
        if (
          err instanceof AlreadyProcessedError ||
          err?.name === "AlreadyProcessedError" ||
          String(err?.message).includes("already been processed")
        ) {
          console.log("[useCreatorDashboard] Claim already confirmed — refreshing stats.");
          await fetchStats();
          return err?.signature ?? "already-confirmed";
        }
        const msg = err?.message ?? "Claim failed";
        console.error("[useCreatorDashboard] Claim error:", msg);
        setClaimError(msg);
        throw err;
      } finally {
        setIsClaiming(false);
      }
    },
    [creatorPublicKey, stats?.compressedSol, fetchStats]
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
