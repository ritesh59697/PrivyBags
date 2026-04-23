// src/components/ui/TxStatus.tsx

import { CheckCircle, XCircle, Loader2, Shield } from "lucide-react";
import type { TipStatus } from "@/hooks/usePrivateTip";

const STEP_LABELS: Record<TipStatus, string> = {
  idle:        "",
  wrapping:    "Wrapping SOL → compressed token…",
  transferring:"Generating ZK proof + sending shielded transfer…",
  recording:   "Recording tip in creator vault…",
  success:     "Private tip sent successfully!",
  error:       "Something went wrong",
};

interface TxStatusProps {
  status: TipStatus;
  error: string | null;
  txSignature?: string;
}

export function TxStatus({ status, error, txSignature }: TxStatusProps) {
  if (status === "idle") return null;

  const isLoading = ["wrapping", "transferring", "recording"].includes(status);
  const isSuccess = status === "success";
  const isError   = status === "error";

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 text-sm ${
        isSuccess
          ? "bg-green-950/40 border-green-800/50"
          : isError
          ? "bg-red-950/40 border-red-800/50"
          : "bg-gray-900 border-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 font-medium">
        {isLoading && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-4 h-4 text-green-400" />}
        {isError   && <XCircle className="w-4 h-4 text-red-400" />}
        <span
          className={
            isSuccess ? "text-green-300" : isError ? "text-red-300" : "text-gray-300"
          }
        >
          {STEP_LABELS[status]}
        </span>
      </div>

      {isSuccess && txSignature && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Shield className="w-3 h-3 text-purple-400" />
            Sender identity + amount shielded via ZK compression
          </div>
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
          >
            View on Solana Explorer →
          </a>
        </div>
      )}

      {isError && error && (
        <p className="text-xs text-red-400 leading-relaxed">{error}</p>
      )}
    </div>
  );
}
