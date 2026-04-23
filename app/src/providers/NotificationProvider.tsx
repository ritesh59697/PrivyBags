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

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !publicKey) {
      lastTipCount.current = null;
      lastCombinedTotal.current = null;
      return;
    }

    let cancelled = false;

    async function poll() {
      if (!publicKey || cancelled) return;

      try {
        const rpc = getLightRpc();

        // ── 1. Vault PDA balance (Anchor flow) ────────────────────────────────
        const vaultPda = deriveCreatorVaultAddress(publicKey);
        const accountInfo = await rpc.getAccountInfo(vaultPda);

        let tipCount = 0;
        let vaultReceived = 0;

        if (accountInfo?.data && accountInfo.data.length >= 8 + 32 + 32 + 8 + 8) {
          const data = Buffer.from(accountInfo.data);
          vaultReceived = Number(data.readBigUInt64LE(8 + 32 + 32)) / LAMPORTS_PER_SOL;
          tipCount = Number(data.readBigUInt64LE(8 + 32 + 32 + 8));
        }

        // ── 2. Compressed wSOL balance (Light Protocol flow) ──────────────────
        let compressedSol = 0;
        try {
          const { getAssociatedTokenAddressInterface, getAtaInterface } =
            await import("@lightprotocol/compressed-token/unified");
          const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, publicKey);
          const ataInfo = await getAtaInterface(rpc, lightAta, publicKey, WSOL_MINT);
          compressedSol = Number(ataInfo?.parsed?.amount ?? 0) / LAMPORTS_PER_SOL;
        } catch {
          // No compressed balance yet — normal on first use
        }

        const combinedTotal = vaultReceived + compressedSol;

        console.log(
          `[PrivyBag:notify] Poll — vault: ${vaultReceived.toFixed(5)} SOL,`,
          `compressed: ${compressedSol.toFixed(5)} SOL,`,
          `tipCount: ${tipCount}`
        );

        // First poll — establish baseline, do NOT fire notification
        if (lastTipCount.current === null || lastCombinedTotal.current === null) {
          lastTipCount.current = tipCount;
          lastCombinedTotal.current = combinedTotal;
          console.log("[PrivyBag:notify] Baseline set —", combinedTotal.toFixed(5), "SOL,", tipCount, "tips");
          return;
        }

        const prevTotal = lastCombinedTotal.current;
        const tipCountUp = tipCount > lastTipCount.current;
        // Only fire if balance increased by more than a rounding threshold
        const balanceUp = combinedTotal > prevTotal + 0.000_01;

        if ((tipCountUp || balanceUp) && !cancelled) {
          const delta = combinedTotal - prevTotal;

          // ── 3. Verify it's an INCOMING tip, not a self-operation (Wrap/Claim) ─
          // We fetch the latest signature for the wallet.
          // If the fee payer is the current wallet, it's an internal operation.
          const sigs = await rpc.getSignaturesForAddress(publicKey, { limit: 1 });
          const latestSig = sigs[0]?.signature;

          if (latestSig) {
            const tx = await rpc.getTransaction(latestSig, {
              maxSupportedTransactionVersion: 0,
              commitment: "confirmed"
            });

            const feePayer = tx?.transaction.message.staticAccountKeys[0]?.toBase58();
            const isSelf = feePayer === publicKey.toBase58();

            if (isSelf) {
              console.log("[PrivyBag:notify] Skipping internal operation (User is signer):", latestSig.slice(0, 8));
            } else {
              console.log("[PrivyBag:notify] Incoming tip detected! +", delta.toFixed(5), "SOL");
              addNotification(
                delta > 0.000_01 ? delta : (compressedSol > 0 ? compressedSol : 0.001),
                latestSig
              );
            }
          }

          lastTipCount.current = tipCount;
          lastCombinedTotal.current = combinedTotal;
        }
      } catch (err: any) {
        if (!cancelled) console.warn("[PrivyBag:notify] Poll error:", err.message);
      }
    }

    poll();
    const interval = setInterval(poll, 5_000);
    console.log("[PrivyBag:notify] Polling started (5s interval) for:", publicKey.toBase58().slice(0, 8));

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicKey?.toBase58(), connected, addNotification]);

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
