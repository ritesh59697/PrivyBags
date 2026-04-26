"use client";
// src/providers/NotificationProvider.tsx
//
// BUG 4 FIX: NOTIFICATIONS NOT FIRING IN PRODUCTION
// ──────────────────────────────────────────────────
// Root cause: The poll() callback was in useCallback([connected, publicKey,
// addNotification]). addNotification was in useCallback([publicKey]).
// This meant:
//   1. Wallet connects → publicKey set → addNotification gets new identity
//   2. poll() gets new identity (because addNotification changed)
//   3. useEffect sees poll() changed → removes old subscription, creates new one
//   4. New subscription has [poll] dep → poll() is the version from STEP 2
//   5. That poll() has a stale addNotification closure from before publicKey was set
//   6. In production (slower React reconciliation), this race loses every time
//
// Fix: publicKey stored in a REF. addNotification reads the ref at call time
// rather than capturing publicKey in its closure. poll() has no deps except
// the stable ref. useEffect only runs on wallet connect/disconnect.
// Subscription is created ONCE and never torn down until wallet disconnects.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getLightRpc } from "@/lib/light/connection";
import { deriveCreatorVaultAddress } from "@/lib/light/shielded-transfer";
import { LAMPORTS_PER_SOL, WSOL_MINT } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TipNotification {
  id: string;
  receivedSol: number;
  recipient: string;
  timestamp: number;
  read: boolean;
}

interface NotificationCtx {
  notifications: TipNotification[];
  unreadCount: number;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<NotificationCtx>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => { },
  dismiss: () => { },
});

export function useNotifications() {
  return useContext(Ctx);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const [notifications, setNotifications] = useState<TipNotification[]>([]);

  // BUG FIX 4: Store mutable values in refs so callbacks never go stale
  const publicKeyRef = useRef<PublicKey | null>(null);
  const lastTipCountRef = useRef<number | null>(null);
  const lastCombinedTotalRef = useRef<number | null>(null);
  const lastCompressedRef = useRef<number | null>(null);  // compressed ATA baseline
  const isPollingRef = useRef(false);
  const seenSigsRef = useRef<Set<string>>(new Set());

  // ── localStorage helpers for compressed balance baseline ─────────────────
  // Persisting the baseline means subscription teardowns don't reset it to 0,
  // which would cause the full existing balance to appear as a "new tip".
  function loadCompressedBaseline(pk: PublicKey): number {
    try {
      const v = localStorage.getItem(`pb_baseline_${pk.toBase58()}`);
      return v ? parseFloat(v) : 0;
    } catch { return 0; }
  }
  function saveCompressedBaseline(pk: PublicKey, amount: number) {
    try {
      localStorage.setItem(`pb_baseline_${pk.toBase58()}`, amount.toFixed(9));
    } catch { }
  }

  // Keep ref in sync with wallet state
  useEffect(() => {
    publicKeyRef.current = publicKey ?? null;
  }, [publicKey]);

  // BUG FIX 4: addNotification has NO deps — it reads publicKey from the ref
  // at call time, so it never changes identity and never causes poll() to
  // change identity.
  const addNotification = useCallback((receivedSol: number, sig: string) => {
    const pk = publicKeyRef.current;
    if (!pk) return;

    // Deduplicate by tx signature
    if (seenSigsRef.current.has(sig)) return;
    seenSigsRef.current.add(sig);

    // Increment the localStorage tip count so Total Tips card updates.
    // This is the source of truth when the vault PDA is not initialized.
    try {
      const tipKey = `pb_tips_${pk.toBase58()}`;
      const prev = parseInt(localStorage.getItem(tipKey) ?? "0", 10);
      localStorage.setItem(tipKey, String(prev + 1));
    } catch { }

    const n: TipNotification = {
      id: `tip-${sig.slice(0, 8)}-${Date.now()}`,
      receivedSol,
      recipient: pk.toBase58(),
      timestamp: Date.now(),
      read: false,
    };

    console.log("[PrivyBag:notify] 🔔 New tip:", receivedSol.toFixed(5), "SOL");
    setNotifications((prev) => [n, ...prev].slice(0, 20));
  }, []); // ← intentionally empty deps

  // BUG FIX 4: poll has NO deps — reads everything from refs at call time.
  const poll = useCallback(async () => {
    const pk = publicKeyRef.current;
    if (!pk || isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const rpc = getLightRpc();

      // ── Compressed ATA balance — primary delta source ─────────────────────
      // The Vault PDA is never initialized for creators who receive tips purely
      // via Light Protocol (no deposit ix). So we use the compressed ATA
      // balance as the delta source — same approach as useCreatorDashboard.
      let compressedSol = 0;
      try {
        const { getAssociatedTokenAddressInterface, getAtaInterface } =
          await import("@lightprotocol/compressed-token/unified");
        const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, pk);
        const ataInfo = await getAtaInterface(rpc, lightAta, pk, WSOL_MINT);
        compressedSol = Number(ataInfo?.parsed?.amount ?? 0) / LAMPORTS_PER_SOL;
      } catch {
        // ATA not yet initialized or query failed — keep compressedSol = 0
      }

      // ── Tip count from Vault PDA (best-effort, may be 0) ─────────────────
      let tipCount = 0;
      try {
        const vaultPda = deriveCreatorVaultAddress(pk);
        const accountInfo = await rpc.getAccountInfo(vaultPda);
        if (accountInfo?.data && accountInfo.data.length >= 8 + 32 + 32 + 8 + 8 + 8) {
          const data = Buffer.from(accountInfo.data);
          tipCount = Number(data.readBigUInt64LE(8 + 32 + 32 + 8));
        }
      } catch { }

      // ── First poll: set baseline, never fire a notification ───────────────
      if (lastCompressedRef.current === null || lastTipCountRef.current === null) {
        lastCompressedRef.current = compressedSol;
        lastTipCountRef.current = tipCount;
        console.log("[PrivyBag:notify] Baseline:", compressedSol.toFixed(5), "SOL compressed");
        return;
      }

      const prevCompressed = lastCompressedRef.current;
      const delta = compressedSol - prevCompressed;
      const tipCountRose = tipCount > lastTipCountRef.current;

      // A genuine new tip: compressed balance increased OR on-chain tip count rose
      const hasNewTip = delta > 0.000_01 || tipCountRose;

      // Always update refs (even if no new tip) so next cycle sees fresh baseline
      lastCompressedRef.current = compressedSol;
      saveCompressedBaseline(pk, compressedSol);
      lastTipCountRef.current = tipCount;

      if (!hasNewTip) return;

      // Verify it's an INCOMING transaction (fee payer ≠ connected wallet)
      const sigs = await rpc.getSignaturesForAddress(pk, { limit: 1 });
      const latestSig = sigs[0]?.signature;

      if (latestSig) {
        const tx = await rpc.getTransaction(latestSig, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });

        const feePayer = tx?.transaction.message.staticAccountKeys[0]?.toBase58();
        const isSelf = feePayer === pk.toBase58();

        if (!isSelf) {
          // delta is the amount of new tokens just received
          // If delta is 0 but tipCountRose (vault PDA tracked it), use 0.001 as fallback
          const displayAmount = delta > 0.000_01 ? delta : 0.001;
          addNotification(displayAmount, latestSig);
        }
      }
    } catch (err: any) {
      console.warn("[PrivyBag:notify] Poll error:", err.message);
    } finally {
      isPollingRef.current = false;
    }
  }, []); // ← intentionally empty deps — reads everything from refs

  // ── Subscription setup ────────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !publicKey) {
      // Reset on disconnect
      lastTipCountRef.current = null;
      lastCombinedTotalRef.current = null;
      lastCompressedRef.current = null;
      seenSigsRef.current.clear();
      return;
    }

    // Load persisted compressed baseline so reconnects don't reset to 0
    // (which would make the full existing balance show as a "new" tip)
    const persisted = loadCompressedBaseline(publicKey);
    if (persisted > 0) {
      lastCompressedRef.current = persisted;
      lastTipCountRef.current = 0;
      console.log("[PrivyBag:notify] Loaded persisted baseline:", persisted.toFixed(5), "SOL");
    }

    // Run initial poll
    poll();

    const rpc = getLightRpc();
    const vaultPda = deriveCreatorVaultAddress(publicKey);

    console.log("[PrivyBag:notify] Subscribing for:", publicKey.toBase58().slice(0, 8));

    // BUG FIX 4: poll is stable (empty deps), so this subscription is
    // created ONCE per wallet connection and stays alive permanently.
    const vaultSub = rpc.onAccountChange(vaultPda, poll, "confirmed");

    // Also subscribe to Light ATA if possible
    let ataSub: number | null = null;
    (async () => {
      try {
        const { getAssociatedTokenAddressInterface } =
          await import("@lightprotocol/compressed-token/unified");
        const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, publicKey);
        ataSub = rpc.onAccountChange(lightAta, poll, "confirmed");
        console.log("[PrivyBag:notify] Light ATA subscribed");
      } catch (e) {
        console.warn("[PrivyBag:notify] Light ATA subscription failed:", e);
      }
    })();

    // Fallback poll every 30s (compressed accounts don't always trigger WS)
    const interval = setInterval(poll, 30_000);

    return () => {
      rpc.removeAccountChangeListener(vaultSub);
      if (ataSub !== null) rpc.removeAccountChangeListener(ataSub);
      clearInterval(interval);
      console.log("[PrivyBag:notify] Subscriptions removed");
    };
    // BUG FIX 4: Only [connected, publicKey?.toBase58()] as deps.
    // poll is stable (empty deps), so it's safe to omit from the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey?.toBase58()]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Ctx.Provider value={{ notifications, unreadCount, markAllRead, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}
