"use client";
// src/providers/NotificationProvider.tsx
//
// ── PRODUCTION FIXES (Vercel) ────────────────────────────────────────────────
//
// Fix 1 (WebSocket killed by serverless):
//   onAccountChange() subscriptions die within seconds on Vercel because
//   serverless functions have no persistent process. WebSocket is now an
//   opportunistic BONUS trigger — client-side polling (every 10s) is the
//   PRIMARY mechanism that actually works in production.
//
// Fix 2 (Wrong notification amount):
//   total_received_lamports in the Vault PDA is only updated when deposit/
//   shielded_tip is called. Tips that arrive purely via Light Protocol
//   compression never increment it. We now track the COMPRESSED ATA balance
//   as the notification signal — this reflects ALL incoming tips correctly.
//
// Fix 3 (Stale RPC singleton):
//   getLightRpc() is now SSR-safe (see connection.ts). We additionally reset
//   it on caught network errors so the next poll gets a fresh connection.

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
import { getLightRpc, resetLightRpc } from "@/lib/light/connection";
import { deriveCreatorVaultAddress } from "@/lib/light/shielded-transfer";
import { LAMPORTS_PER_SOL, WSOL_MINT } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TipNotification {
  id: string;
  receivedSol: number;
  recipient: string;
  timestamp: number;
  read: boolean;
  sig?: string;
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
  markAllRead: () => {},
  dismiss: () => {},
});

export function useNotifications() {
  return useContext(Ctx);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const [notifications, setNotifications] = useState<TipNotification[]>([]);

  // All mutable state in refs — zero stale closures possible
  const publicKeyRef = useRef<PublicKey | null>(null);
  const lastCompressedRef = useRef<number | null>(null);  // Fix 2: track ATA balance
  const lastTipCountRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);
  const seenSigsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with wallet state
  useEffect(() => {
    publicKeyRef.current = publicKey ?? null;
  }, [publicKey]);

  // addNotification — stable identity, reads publicKey from ref
  const addNotification = useCallback((receivedSol: number, sig: string) => {
    const pk = publicKeyRef.current;
    if (!pk) return;

    if (seenSigsRef.current.has(sig)) return;
    seenSigsRef.current.add(sig);

    const n: TipNotification = {
      id: `tip-${sig.slice(0, 8)}-${Date.now()}`,
      receivedSol,
      recipient: pk.toBase58(),
      timestamp: Date.now(),
      read: false,
      sig,
    };

    console.log("[PrivyBag:notify] 🔔 New tip:", receivedSol.toFixed(5), "SOL | sig:", sig.slice(0, 8));
    setNotifications((prev) => [n, ...prev].slice(0, 20));
  }, []); // intentionally empty — reads from refs

  // poll — stable identity, reads everything from refs
  // Fix 1: This is called by setInterval (10s) as PRIMARY. WebSocket is bonus.
  // Fix 2: Uses compressed ATA balance as the change signal.
  const poll = useCallback(async () => {
    const pk = publicKeyRef.current;
    if (!pk || isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const rpc = getLightRpc();

      // ── Fix 2: Use compressed ATA balance as the tip signal ─────────────
      // total_received_lamports in the Vault PDA is only updated when
      // deposit/shielded_tip is called explicitly. Light Protocol compressed
      // tips may not call that instruction, so the PDA field stays stale.
      // The compressed ATA balance always reflects real incoming tips.
      let compressedSol = 0;
      let tipCount = 0;

      try {
        const { getAssociatedTokenAddressInterface, getAtaInterface } =
          await import("@lightprotocol/compressed-token/unified");
        const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, pk);
        const ataInfo = await getAtaInterface(rpc, lightAta, pk, WSOL_MINT);
        compressedSol = Number(ataInfo?.parsed?.amount ?? 0) / LAMPORTS_PER_SOL;
      } catch {
        // No compressed balance yet — normal on first use
      }

      // Also read tip count from Vault PDA for a secondary signal
      try {
        const vaultPda = deriveCreatorVaultAddress(pk);
        const accountInfo = await rpc.getAccountInfo(vaultPda);
        if (accountInfo?.data && accountInfo.data.length >= 8 + 32 + 32 + 8 + 8) {
          const data = Buffer.from(accountInfo.data);
          tipCount = Number(data.readBigUInt64LE(8 + 32 + 32 + 8));
        }
      } catch {
        // Vault may not exist yet
      }

      // First poll — set baseline, don't fire a notification
      if (lastCompressedRef.current === null || lastTipCountRef.current === null) {
        lastCompressedRef.current = compressedSol;
        lastTipCountRef.current = tipCount;
        console.log("[PrivyBag:notify] Baseline set:", compressedSol.toFixed(5), "SOL compressed,", tipCount, "tips");
        return;
      }

      const prevCompressed = lastCompressedRef.current;
      const delta = compressedSol - prevCompressed;
      const hasNewTip = tipCount > lastTipCountRef.current || delta > 0.000_01;

      if (!hasNewTip) return;

      // Verify it's an INCOMING transaction (fee payer ≠ connected wallet)
      // to avoid firing a notification when the creator themselves sends
      const rpcForSigs = getLightRpc();
      const sigs = await rpcForSigs.getSignaturesForAddress(pk, { limit: 3 });

      let notified = false;
      for (const sigInfo of sigs) {
        const latestSig = sigInfo.signature;
        if (seenSigsRef.current.has(latestSig)) continue;

        const tx = await rpcForSigs.getTransaction(latestSig, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });

        const feePayer = tx?.transaction.message.staticAccountKeys[0]?.toBase58();
        const isSelf = feePayer === pk.toBase58();

        if (!isSelf) {
          // Use actual delta if positive, otherwise fall back to the tip count delta
          const displayAmount = delta > 0.000_01 ? delta : 0.001;
          addNotification(displayAmount, latestSig);
          notified = true;
          break;
        }
      }

      if (notified) {
        // Update refs only after successful notification
        lastCompressedRef.current = compressedSol;
        lastTipCountRef.current = tipCount;
      }
    } catch (err: any) {
      console.warn("[PrivyBag:notify] Poll error:", err.message);
      // Fix 3: Reset stale RPC on network errors so next poll gets a fresh connection
      if (err.message?.includes("fetch") || err.message?.includes("network") || err.message?.includes("ECONNREFUSED")) {
        console.warn("[PrivyBag:notify] Network error — resetting RPC singleton");
        resetLightRpc();
      }
    } finally {
      isPollingRef.current = false;
    }
  }, []); // intentionally empty — reads everything from refs

  // ── Subscription setup ────────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !publicKey) {
      // Reset on disconnect
      lastCompressedRef.current = null;
      lastTipCountRef.current = null;
      seenSigsRef.current.clear();
      return;
    }

    console.log("[PrivyBag:notify] Wallet connected:", publicKey.toBase58().slice(0, 8));

    // Run initial poll to set baseline
    poll();

    // Fix 1: PRIMARY mechanism — 10s polling. Reliable on Vercel serverless.
    // WebSocket subscriptions die within seconds on Vercel, so we can't rely on them.
    const interval = setInterval(poll, 10_000);

    // Fix 1: WebSocket as BONUS — fires immediately when a change happens,
    // complementing the 10s poll. May not fire on Vercel, but helps locally.
    let vaultSub: number | null = null;
    let ataSub: number | null = null;

    try {
      const rpc = getLightRpc();
      const vaultPda = deriveCreatorVaultAddress(publicKey);
      vaultSub = rpc.onAccountChange(vaultPda, () => {
        console.log("[PrivyBag:notify] Vault change event (WebSocket)");
        poll();
      }, "confirmed");
    } catch (e) {
      console.warn("[PrivyBag:notify] Vault WebSocket subscription failed:", e);
    }

    (async () => {
      try {
        const { getAssociatedTokenAddressInterface } =
          await import("@lightprotocol/compressed-token/unified");
        const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, publicKey);
        const rpc = getLightRpc();
        ataSub = rpc.onAccountChange(lightAta, () => {
          console.log("[PrivyBag:notify] Light ATA change event (WebSocket)");
          poll();
        }, "confirmed");
        console.log("[PrivyBag:notify] Light ATA WebSocket subscribed (bonus)");
      } catch (e) {
        console.warn("[PrivyBag:notify] Light ATA WebSocket failed (non-fatal):", e);
      }
    })();

    return () => {
      clearInterval(interval);
      try {
        const rpc = getLightRpc();
        if (vaultSub !== null) rpc.removeAccountChangeListener(vaultSub);
        if (ataSub !== null) rpc.removeAccountChangeListener(ataSub);
      } catch {}
      console.log("[PrivyBag:notify] Subscriptions cleaned up");
    };
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
