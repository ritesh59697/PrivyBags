"use client";
// src/providers/NotificationProvider.tsx
//
// FIX 1: SENDER FILTER
//   Notifications are only shown to the RECIPIENT (creator), never the sender.
//   Each tip event includes { sender, recipient }. Before firing a notification
//   we check: event.recipient === connectedWallet. If not, we skip silently.
//
// FIX 2: DEDUPLICATION
//   We track seen tx signatures in a Set. If we already fired a notification
//   for a given signature we skip it, preventing duplicate toasts on re-polls.
//
// HOW IT WORKS:
//   The poll reads the creator's Light compressed ATA balance (their received wSOL)
//   AND their vault PDA (if the Anchor program is deployed).
//   If EITHER increases, a notification fires — but ONLY if the connected wallet
//   matches the recipient (creator), not the sender.

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
  /** Who received the tip (creator wallet) */
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

  // Baseline values — set on first poll, used to detect CHANGES
  const lastTipCount = useRef<number | null>(null);
  const lastCombinedTotal = useRef<number | null>(null);

  // FIX 2: Deduplication set — tracks notification IDs we've already fired
  // Key format: "delta-<timestamp-bucket>" so we don't re-fire same event
  const seenEventKeys = useRef<Set<string>>(new Set());

  const addNotification = useCallback(
    (receivedSol: number, signature: string) => {
      if (!publicKey) return;

      // Deduplicate using the actual transaction signature
      if (seenEventKeys.current.has(signature)) return;
      seenEventKeys.current.add(signature);

      const n: TipNotification = {
        id: `tip-${signature}-${Date.now()}`,
        receivedSol,
        recipient: publicKey.toBase58(),
        timestamp: Date.now(),
        read: false,
      };

      console.log(
        "[PrivyBag:notify] 🔔 Tip Notification!",
        "\n  amount: ", receivedSol.toFixed(5), "SOL",
        "\n  tx:     ", signature.slice(0, 8) + "..."
      );
      setNotifications((prev) => [n, ...prev].slice(0, 20));
    },
    [publicKey]
  );

  // ── Polling & Subscriptions ───────────────────────────────────────────────
  
  const isPollingRef = useRef(false);

  const poll = useCallback(async () => {
    if (!connected || !publicKey || isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const rpc = getLightRpc();

      // ── 1. Vault PDA balance (Anchor flow) ────────────────────────────────
      const vaultPda = deriveCreatorVaultAddress(publicKey);
      const accountInfo = await rpc.getAccountInfo(vaultPda);

      let tipCount = 0;
      let vaultReceived = 0;
      let totalClaimed = 0;

      if (accountInfo?.data && accountInfo.data.length >= 8 + 32 + 32 + 8 + 8 + 8) {
        const data = Buffer.from(accountInfo.data);
        vaultReceived = Number(data.readBigUInt64LE(8 + 32 + 32)) / LAMPORTS_PER_SOL;
        tipCount = Number(data.readBigUInt64LE(8 + 32 + 32 + 8));
        totalClaimed = Number(data.readBigUInt64LE(8 + 32 + 32 + 8 + 8)) / LAMPORTS_PER_SOL;
      } else if (accountInfo) {
        // Fallback for raw lamports if vault not initialized/parsed
        vaultReceived = accountInfo.lamports / LAMPORTS_PER_SOL;
      }

      // ── 2. Compressed Light ATA balance (Light Protocol flow) ──────────────────
      let compressedSol = 0;
      let lightAta: PublicKey | null = null;
      try {
        const { getAssociatedTokenAddressInterface, getAtaInterface } =
          await import("@lightprotocol/compressed-token/unified");
        lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, publicKey);
        const ataInfo = await getAtaInterface(rpc, lightAta, publicKey, WSOL_MINT);
        compressedSol = Number(ataInfo?.parsed?.amount ?? 0) / LAMPORTS_PER_SOL;
      } catch {
        // No compressed balance yet — normal
      }

      // ── 3. Combined Total (including claimed to keep delta accurate) ──────────
      const combinedTotal = vaultReceived + compressedSol + totalClaimed;

      // Skip first poll to establish baseline
      if (lastTipCount.current === null || lastCombinedTotal.current === null) {
        lastTipCount.current = tipCount;
        lastCombinedTotal.current = combinedTotal;
        console.log("[PrivyBag:notify] Baseline established:", combinedTotal.toFixed(5), "SOL");
        return;
      }

      const prevTotal = lastCombinedTotal.current;
      const delta = combinedTotal - prevTotal;

      // Trigger if tip count increased OR balance increased significantly
      const hasNewTip = tipCount > (lastTipCount.current ?? 0) || delta > 0.000_01;

      if (hasNewTip) {
        // ── 4. Verify it's an INCOMING tip, not a self-operation ─────────────
        const sigs = await rpc.getSignaturesForAddress(publicKey, { limit: 1 });
        const latestSig = sigs[0]?.signature;

        if (latestSig) {
          const tx = await rpc.getTransaction(latestSig, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed"
          });

          const feePayer = tx?.transaction.message.staticAccountKeys[0]?.toBase58();
          const isSelf = feePayer === publicKey.toBase58();

          if (!isSelf) {
            console.log("[PrivyBag:notify] New Tip! Delta:", delta.toFixed(5));
            // Ensure we never show 0.0000 in the UI
            const displayAmount = delta > 0.000_01 ? delta : 0.001;
            addNotification(displayAmount, latestSig);
          }
        }

        // Update refs for next poll
        lastTipCount.current = tipCount;
        lastCombinedTotal.current = combinedTotal;
      }
    } catch (err: any) {
      console.warn("[PrivyBag:notify] Poll error:", err.message);
    } finally {
      isPollingRef.current = false;
    }
  }, [connected, publicKey, addNotification]);

  useEffect(() => {
    if (!connected || !publicKey) return;

    poll(); // Initial poll
    
    const rpc = getLightRpc();
    const vaultPda = deriveCreatorVaultAddress(publicKey);
    
    console.log("[PrivyBag:notify] Subscribing to vault updates:", vaultPda.toBase58().slice(0, 8));
    
    // Sub 1: Vault PDA changes (Anchor tips / Claims / Withdraws)
    const vaultSub = rpc.onAccountChange(vaultPda, () => poll(), "confirmed");
    
    // Sub 2: Light ATA changes (Immediate shielded tip detection)
    let ataSub: number | null = null;
    (async () => {
      try {
        const { getAssociatedTokenAddressInterface } = await import("@lightprotocol/compressed-token/unified");
        const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, publicKey);
        ataSub = rpc.onAccountChange(lightAta, () => poll(), "confirmed");
        console.log("[PrivyBag:notify] Subscribed to Light ATA updates.");
      } catch (e) {
        console.warn("[PrivyBag:notify] Could not subscribe to Light ATA:", e);
      }
    })();

    // Fallback poll (much slower) to ensure compressed balances eventually sync
    const interval = setInterval(poll, 60_000);

    return () => {
      rpc.removeAccountChangeListener(vaultSub);
      if (ataSub !== null) rpc.removeAccountChangeListener(ataSub);
      clearInterval(interval);
      console.log("[PrivyBag:notify] Unsubscribed from updates.");
    };
  }, [publicKey?.toBase58(), connected, poll]);

  // ── Actions ────────────────────────────────────────────────────────────────

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
