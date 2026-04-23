// src/hooks/usePrivateTip.ts
//
// FIX 2: DOUBLE-SUBMIT GUARD
//   Added `isSending` ref that blocks re-entry into sendTip while a tx is in flight.
//   This prevents the same transaction being broadcast twice, which causes the
//   "already been processed" error on the second attempt.
//
// FIX 2b: AlreadyProcessedError treated as SUCCESS
//   If the transaction was already confirmed on a previous attempt (e.g. the user
//   double-clicked before the first confirmation arrived), we treat it as a
//   successful tip instead of showing an error. The tip DID land on-chain.

import { useState, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  runFullTipFlow,
  AlreadyProcessedError,
  type FullTipFlowResult,
  type TipFlowPhase,
} from "@/lib/light/shielded-transfer";
import { recordTipInVault } from "@/lib/anchor/privybag-client";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

export type TipStatus =
  | "idle"
  | "wrapping"
  | "transferring"
  | "recording"
  | "success"
  | "error";

export interface UsePrivateTipReturn {
  status: TipStatus;
  result: FullTipFlowResult | null;
  error: string | null;
  isSending: boolean;
  sendTip: (params: {
    creatorAddress: string;
    amountSol: number;
    wrapFirst?: boolean;
  }) => Promise<void>;
  reset: () => void;
}

export function usePrivateTip(): UsePrivateTipReturn {
  const { publicKey, signTransaction, connected } = useWallet();
  const [status, setStatus] = useState<TipStatus>("idle");
  const [result, setResult] = useState<FullTipFlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // FIX 2: Use a ref (not state) for the in-flight guard so it never causes
  // a stale-closure issue inside the async sendTip callback.
  const isSendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);

  const sendTip = useCallback(
    async ({
      creatorAddress,
      amountSol,
      wrapFirst = false,
    }: {
      creatorAddress: string;
      amountSol: number;
      wrapFirst?: boolean;
    }) => {
      // FIX 2: Hard guard — if a tx is already in flight, reject immediately
      if (isSendingRef.current) {
        console.warn("[usePrivateTip] sendTip called while already in progress — ignoring.");
        return;
      }

      if (!connected || !publicKey || !signTransaction) {
        setError("Wallet not connected. Please connect your wallet first.");
        setStatus("error");
        return;
      }

      // Lock
      isSendingRef.current = true;
      setIsSending(true);
      setError(null);
      setResult(null);
      setStatus("transferring");

      const wallet = { publicKey, signTransaction };
      const creatorKey = new PublicKey(creatorAddress);
      const tipLamports = BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));

      console.log(
        "[usePrivateTip] sendTip — amount:", amountSol, "SOL,",
        "creator:", creatorAddress.slice(0, 8),
        "wrapFirst:", wrapFirst
      );

      try {
        const handleProgress = (phase: TipFlowPhase) => {
          const map: Record<string, TipStatus> = {
            wrap: "wrapping",
            shielded: "transferring",
            depositing: "transferring",
            vault: "recording",
            recording: "recording",
          };
          const next = (map[phase] ?? "transferring") as TipStatus;
          console.log("[usePrivateTip] Phase:", phase, "→", next);
          setStatus(next);
        };

        const flowResult = await runFullTipFlow(
          { wallet, creatorPublicKey: creatorKey, tipAmount: tipLamports, wrapFirst },
          recordTipInVault,
          handleProgress
        );

        setResult(flowResult);
        setStatus("success");
        console.log("[usePrivateTip] ✅ Tip flow complete.");
      } catch (err: any) {
        // FIX 2b: AlreadyProcessedError means the tx DID confirm — treat as success
        if (
          err instanceof AlreadyProcessedError ||
          err?.name === "AlreadyProcessedError" ||
          String(err?.message).includes("already been processed")
        ) {
          console.log(
            "[usePrivateTip] AlreadyProcessedError — tx was confirmed on a previous attempt.",
            "Treating as success."
          );
          // We don't have a result object here, but the tip landed — show success
          setStatus("success");
          setResult({
            success: true,
            transferSignatures: [],
            depositSignature: "already-confirmed",
            vaultAddress: "",
            recipientAta: creatorKey,
            vaultUpdateSignature: null,
          } as FullTipFlowResult);
          return;
        }

        const msg = err?.message ?? "Tip failed. Please try again.";
        console.error("[usePrivateTip] Error:", msg);
        setError(msg);
        setStatus("error");
      } finally {
        // Always unlock, regardless of outcome
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    [connected, publicKey, signTransaction]
  );

  const reset = useCallback(() => {
    if (isSendingRef.current) return; // don't reset mid-flight
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, isSending, sendTip, reset };
}
