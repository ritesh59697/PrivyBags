import { CheckCircle, XCircle, Loader2, Shield, ExternalLink } from "lucide-react";
import type { TipStatus } from "@/hooks/usePrivateTip";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

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
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.98, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -5 }}
        className={`rounded-2xl border p-5 flex flex-col gap-4 text-sm shadow-xl ${
          isSuccess
            ? "bg-green-950/40 border-green-800/50 shadow-green-900/10"
            : isError
            ? "bg-red-950/40 border-red-800/50 shadow-red-900/10"
            : "bg-gray-900 border-gray-800 shadow-black/40"
        }`}
      >
        <div className="flex items-center gap-3 font-bold tracking-tight">
          <div className="relative flex items-center justify-center">
            {isLoading && (
              <>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 rounded-full border-2 border-purple-500/20 border-t-purple-500" 
                />
                <Loader2 className="w-3 h-3 text-purple-400 absolute animate-pulse" />
              </>
            )}
            {isSuccess && <CheckCircle className="w-5 h-5 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)]" />}
            {isError   && <XCircle className="w-5 h-5 text-red-400" />}
          </div>
          
          <motion.span
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={clsx(
              "uppercase tracking-widest text-[10px]",
              isSuccess ? "text-green-400" : isError ? "text-red-400" : "text-purple-400"
            )}
          >
            {STEP_LABELS[status]}
          </motion.span>
        </div>

        {isSuccess && txSignature && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/20 p-3 rounded-xl border border-white/5">
              <Shield className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span>Identity and amount cryptographically shielded</span>
            </div>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between text-xs text-purple-400 font-bold bg-purple-500/5 hover:bg-purple-500/10 p-3 rounded-xl transition-all border border-purple-500/10"
            >
              <span>View on Solana Explorer</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </motion.div>
        )}

        {isError && error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-red-400 leading-relaxed bg-red-500/5 p-3 rounded-xl border border-red-500/10 font-mono"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
