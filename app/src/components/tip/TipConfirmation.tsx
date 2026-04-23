// src/components/tip/TipConfirmation.tsx
//
// Post-tip success screen. Shows a privacy summary and explorer link.
// Imported by PrivateTipForm when status === "success".

import { Shield, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import type { BagsCreator } from "@/lib/bags/client";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";

interface TipConfirmationProps {
  creator: BagsCreator;
  amountSol: number;
  txSignature: string;
  onReset: () => void;
}

export function TipConfirmation({
  creator,
  amountSol,
  txSignature,
  onReset,
}: TipConfirmationProps) {
  const [copied, setCopied] = useState(false);

  function copySignature() {
    navigator.clipboard.writeText(txSignature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const explorerUrl = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;

  return (
    <div className="flex flex-col gap-6">
      {/* Success hero */}
      <div className="bg-green-950/20 border border-green-800/30 rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-900/30 border border-green-700/40 flex items-center justify-center">
            <Shield className="w-10 h-10 text-green-400" />
          </div>
          <CheckCircle className="w-6 h-6 text-green-400 absolute -bottom-1 -right-1 bg-gray-950 rounded-full" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white">Tip Sent Privately!</h2>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Your{" "}
            <span className="text-white font-semibold">{amountSol} SOL</span> tip
            reached{" "}
            <span className="text-white font-semibold">{creator.displayName}</span>{" "}
            through a ZK shielded transfer.
          </p>
        </div>

        <PrivacyBadge label="ZK Shielded ✓" />
      </div>

      {/* Privacy breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          What was kept private
        </h3>
        <div className="flex flex-col gap-2.5">
          {[
            {
              label: "Your wallet address",
              detail: "Not linked to this tip on-chain",
            },
            {
              label: "Exact tip amount",
              detail: "Hidden in ZK compressed account state",
            },
            {
              label: "Sender ↔ creator link",
              detail: "Broken by Light Protocol ZK proof",
            },
          ].map(({ label, detail }) => (
            <div key={label} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white">{label}</p>
                <p className="text-xs text-gray-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction details */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          Transaction
        </p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-gray-400 font-mono truncate flex-1">
            {txSignature}
          </code>
          <button
            onClick={copySignature}
            className="flex-shrink-0 text-gray-600 hover:text-gray-400 transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-gray-600 hover:text-purple-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <p className="text-xs text-gray-600">
          Explorer shows a Light compressed-token transfer — no direct sender ↔ recipient trace
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-3 rounded-xl border border-gray-700 text-sm text-gray-400
                     hover:text-white hover:border-gray-600 transition-colors"
        >
          Send another tip
        </button>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm
                     text-gray-400 hover:text-white hover:border-gray-700 transition-colors
                     flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Explorer
        </a>
      </div>
    </div>
  );
}
