"use client";
// src/components/tip/PrivateTipForm.tsx

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Shield, Info, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

import { usePrivateTip } from "@/hooks/usePrivateTip";
import { useBagsCreator } from "@/hooks/useBagsCreator";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";
import { TxStatus } from "@/components/ui/TxStatus";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

const PRESETS = [0.01, 0.05, 0.1, 0.5, 1];

interface PrivateTipFormProps {
  creatorSlug: string;
}

export function PrivateTipForm({ creatorSlug }: PrivateTipFormProps) {
  const { connected } = useWallet();
  const { creator, loading: creatorLoading } = useBagsCreator(creatorSlug);

  const [amountSol, setAmountSol] = useState<string>("0.05");
  const [showInfo, setShowInfo] = useState(false);

  const { status, result, error, sendTip, reset } = usePrivateTip();

  const isProcessing = ["wrapping", "transferring", "recording"].includes(status);
  const isSuccess = status === "success";

  const parsedAmount = parseFloat(amountSol) || 0;
  const isValidAmount = parsedAmount >= 0.001 && parsedAmount <= 10;

  // Deposit sig is the main tx
  const depositSig = (result as any)?.depositSignature ??
    result?.transferSignatures?.[result.transferSignatures.length - 1];
  const vaultSig = result?.vaultUpdateSignature ?? undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAmount || !creator || isProcessing) return;

    console.log("[PrivyBag] Initiating tip flow — amount (SOL):", parsedAmount);

    await sendTip({
      creatorAddress: creator.walletAddress,
      amountSol: parsedAmount,
      wrapFirst: true, // vault pattern — no wrapping needed
    });
  }

  function handleReset() {
    reset();
    setAmountSol("0.05");
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  if (creatorLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-20 bg-gray-900 rounded-2xl" />
        <div className="h-12 bg-gray-900 rounded-xl" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <p className="text-gray-400 text-sm">
          Creator <span className="text-white font-medium">@{creatorSlug}</span> not found.
        </p>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-green-950 border border-green-800 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-900 flex items-center justify-center">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Tip Sent Privately!</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Your SOL went to a vault PDA — not directly to the creator.
              No single transaction links your wallet to theirs.
            </p>
          </div>

          {/* Privacy breakdown */}
          <div className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-gray-300 mb-3">What happened on-chain:</p>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span>Your wallet → Vault PDA  <span className="text-gray-500">(this tx)</span></span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Vault PDA → Creator wallet  <span className="text-gray-600">(when creator withdraws)</span></span>
              </div>
              <div className="mt-1 text-gray-600 pl-4">
                ↑ No single tx shows your wallet sending to the creator directly
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2 text-xs w-full">
            {depositSig && depositSig !== "already-processed" && (
              <a
                href={`https://explorer.solana.com/tx/${depositSig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300"
              >
                <ExternalLink className="w-3 h-3" />
                View deposit tx (Fan → Vault PDA)
              </a>
            )}
            {vaultSig && (
              <a
                href={`https://explorer.solana.com/tx/${vaultSig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-300"
              >
                <ExternalLink className="w-3 h-3" />
                View stats update tx
              </a>
            )}
          </div>
        </div>

        <button
          onClick={handleReset}
          className="w-full py-3 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Send another tip
        </button>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Private Tip</h1>
        <PrivacyBadge size="sm" />
      </div>

      {/* Creator */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <CreatorCard creator={creator} />
        <div className="border-t border-gray-800 px-5 py-2.5 flex items-center justify-between">
          <span className="text-xs text-gray-600">Sending to vault (not directly to creator)</span>
          <span className="text-xs text-gray-500 font-mono">
            {creator.walletAddress.slice(0, 6)}…{creator.walletAddress.slice(-6)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-gray-300">Tip Amount (SOL)</label>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmountSol(String(preset))}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                parseFloat(amountSol) === preset
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
              )}
            >
              {preset} SOL
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0.001"
          max="10"
          step="0.001"
          value={amountSol}
          onChange={(e) => setAmountSol(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                     text-white text-sm placeholder:text-gray-600
                     focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-700"
        />
      </div>

      {/* Privacy explainer */}
      <div className="flex items-start gap-3 bg-purple-950 border border-purple-900 rounded-xl p-4">
        <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-purple-300">How privacy works</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your SOL goes to a vault PDA (intermediary), not directly to the creator.
            This breaks the on-chain link between your wallet and theirs.
          </p>
          <div className="text-xs text-gray-600 mt-1 font-mono">
            You → [Vault PDA] → Creator
          </div>
        </div>
      </div>

      {/* Info toggle */}
      <button
        type="button"
        onClick={() => setShowInfo(!showInfo)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 self-start transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        {showInfo ? "Hide technical details" : "How does this protect my privacy?"}
      </button>

      {showInfo && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-400 flex flex-col gap-2 leading-relaxed">
          <p>
            <span className="text-white font-medium">What a normal tip looks like:</span>
            <br />
            A direct SOL transfer from your wallet to the creator shows up on any Solana
            explorer, permanently linking your address to theirs.
          </p>
          <p>
            <span className="text-white font-medium">What PrivyBag does instead:</span>
            <br />
            TX 1 (now): Your wallet → Vault PDA — only shows you paid a PDA.
            <br />
            TX 2 (later): Vault PDA → Creator — only shows a PDA paid the creator.
            <br />
            No single transaction ever shows your wallet → creator directly.
          </p>
        </div>
      )}

      {/* Tx status */}
      <TxStatus status={status} error={error} txSignature={depositSig} />

      {/* Submit */}
      {!connected ? (
        <WalletMultiButton
          style={{
            width: "100%", justifyContent: "center", background: "#5b21b6",
            borderRadius: "0.75rem", fontSize: "0.875rem", height: "3rem"
          }}
        />
      ) : (
        <button
          type="submit"
          disabled={!isValidAmount || isProcessing || !creator}
          className={clsx(
            "w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
            isProcessing
              ? "bg-purple-800 text-purple-300 cursor-wait"
              : isValidAmount && creator
                ? "bg-purple-600 hover:bg-purple-500 text-white"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
          )}
        >
          <Shield className="w-4 h-4" />
          {isProcessing
            ? status === "transferring"
              ? "Depositing into vault…"
              : "Recording stats…"
            : `Send ${isValidAmount ? parsedAmount : "—"} SOL Privately`}
        </button>
      )}

      <p className="text-center text-xs text-gray-600">
        SOL held in vault PDA · creator withdraws separately · no direct link on-chain
      </p>
    </form>
  );
}
