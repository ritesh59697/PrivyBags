"use client";
// src/components/dashboard/TipStats.tsx
//
// FIX 3: SEPARATED BALANCE DISPLAY
//   Shows compressedSol, vaultSol, and withdrawableSol as distinct values.
//   "Unclaimed" now means compressedSol (funds in Light that need claim step).
//   "Available to withdraw" means withdrawableSol (in vault, ready now).
//
// FIX 4: CLAIM BUTTON
//   Decompresses creator's Light wSOL → native SOL → creator wallet.
//   This is the missing step between receiving a shielded tip and withdrawing.
//
// FIX 5: WITHDRAW LOGIC
//   Only enabled when withdrawableSol > 0 (vault has SOL above rent-exempt).
//   Not mixed with compressedSol anymore.

import { PublicKey } from "@solana/web3.js";
import {
  Shield, TrendingUp, Coins, Lock, DownloadCloud,
  Bell, X, ExternalLink, CheckCircle2, Zap
} from "lucide-react";
import { useCreatorDashboard } from "@/hooks/useCreatorDashboard";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { AlreadyProcessedError } from "@/lib/light/shielded-transfer";
import { withdrawFromVault } from "@/lib/anchor/privybag-client";

interface TipStatsProps {
  creatorPublicKey: PublicKey;
}

export function TipStats({ creatorPublicKey }: TipStatsProps) {
  const {
    stats, loading, error, refresh,
    newTip, dismissNewTip,
    isClaiming, claimError, claimCompressedFunds,
  } = useCreatorDashboard(creatorPublicKey);

  const { publicKey, signTransaction } = useWallet();
  const isOwner = publicKey?.equals(creatorPublicKey) ?? false;

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [claimTx, setClaimTx] = useState<string | null>(null);
  const [withdrawTx, setWithdrawTx] = useState<string | null>(null);

  // ── Claim compressed → wallet ──────────────────────────────────────────────

  const handleClaim = async () => {
    if (!publicKey || !signTransaction || !isOwner) return;
    setClaimTx(null);

    try {
      const sig = await claimCompressedFunds({ publicKey, signTransaction });
      if (sig) {
        setClaimTx(sig);
        refresh();
      }
    } catch (e: any) {
      if (
        e instanceof AlreadyProcessedError ||
        String(e?.message).includes("already been processed")
      ) {
        setClaimTx("already-confirmed");
        refresh();
      } else {
        alert(`Claim failed: ${e.message}`);
      }
    }
  };

  // ── Withdraw vault SOL → wallet ────────────────────────────────────────────
  // FIX 5: Only withdraws from vault PDA — does NOT touch compressed balance

  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !isOwner) return;

    // FIX 5: Guard — only withdraw if vault has actual withdrawable balance
    if (!stats?.withdrawableSol || stats.withdrawableSol < 0.000_01) {
      alert(
        "No withdrawable vault balance.\n\n" +
        "If you have unclaimed compressed tips, use the 'Claim Tips' button first."
      );
      return;
    }

    setIsWithdrawing(true);
    setWithdrawTx(null);
    try {
      const sig = await withdrawFromVault({ publicKey, signTransaction });
      if (sig) {
        setWithdrawTx(sig);
        refresh();
      } else {
        alert("Nothing to withdraw or vault empty.");
      }
    } catch (e: any) {
      if (
        e instanceof AlreadyProcessedError ||
        String(e?.message).includes("already been processed")
      ) {
        setWithdrawTx("already-confirmed");
        refresh();
      } else {
        console.error(e);
        alert(`Withdraw failed: ${e.message}`);
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-40 bg-gray-900 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-900 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950 border border-red-800 rounded-2xl p-5 text-sm text-red-400">
        Could not load vault stats: {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
        <Shield className="w-10 h-10 text-gray-700" />
        <div>
          <p className="font-semibold text-gray-300 mb-1">No vault found</p>
          <p className="text-sm text-gray-500">
            You haven&apos;t initialized your PrivyBag vault yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── New Tip Banner ────────────────────────────────────────────────── */}
      {newTip && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.10) 100%)",
            border: "1px solid rgba(34,197,94,0.35)",
            animation: "fadeSlideDown 0.3s ease",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <Bell className="w-4 h-4 text-green-400" />
            <span className="text-green-300">🎉 New tip received!</span>
          </div>
          <button onClick={dismissNewTip} className="text-green-600 hover:text-green-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Claim success toast ───────────────────────────────────────────── */}
      {claimTx && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.18) 0%, rgba(59,130,246,0.10) 100%)",
            border: "1px solid rgba(109,40,217,0.35)",
          }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-purple-300">Tips claimed — SOL sent to your wallet!</span>
            {claimTx !== "already-confirmed" && (
              <a
                href={`https://explorer.solana.com/tx/${claimTx}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button onClick={() => setClaimTx(null)} className="text-purple-600 hover:text-purple-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Withdraw success toast ────────────────────────────────────────── */}
      {withdrawTx && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.10) 100%)",
            border: "1px solid rgba(16,185,129,0.35)",
          }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-green-300">Withdrawal confirmed!</span>
            {withdrawTx !== "already-confirmed" && (
              <a
                href={`https://explorer.solana.com/tx/${withdrawTx}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-green-400 hover:text-green-300 underline flex items-center gap-1"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button onClick={() => setWithdrawTx(null)} className="text-green-600 hover:text-green-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Tip Statistics</h2>
        <PrivacyBadge label="Aggregate Only" size="sm" />
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2.5 bg-purple-950 border border-purple-900 rounded-xl p-3.5">
        <Shield className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          Individual sender wallets and tip amounts are never stored on-chain.
          Only aggregate totals are visible to you.
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Total tips */}
        <div className="bg-purple-950 border border-purple-900 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500 font-medium">Total Tips</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{stats.tipCount}</p>
            <p className="text-xs text-gray-600 mt-0.5">private tips received</p>
          </div>
        </div>

        {/* Total received (compressed + vault combined) */}
        <div className="bg-green-950 border border-green-900 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500 font-medium">Total Received</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{stats.totalReceivedSol.toFixed(4)} SOL</p>
            <p className="text-xs text-gray-600 mt-0.5">compressed + vault</p>
          </div>
        </div>

        {/* FIX 3+4: Unclaimed = compressed balance — with Claim button */}
        <div className="bg-yellow-950 border border-yellow-900 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-500 font-medium">Unclaimed (Compressed)</span>
            </div>
            {isOwner && stats.unclaimedSol > 0.000_01 && (
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/15 hover:bg-yellow-500/25
                           text-yellow-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <DownloadCloud className="w-3 h-3" />
                {isClaiming ? "Claiming…" : "Claim"}
              </button>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{stats.unclaimedSol.toFixed(4)} SOL</p>
            <p className="text-xs text-gray-600 mt-0.5">in Light compressed ATA</p>
          </div>
          {claimError && (
            <p className="text-xs text-red-400 leading-snug">{claimError}</p>
          )}
          {isOwner && stats.unclaimedSol > 0.000_01 && (
            <p className="text-xs text-gray-600">
              ↑ Click Claim to decompress → native SOL
            </p>
          )}
        </div>

        {/* FIX 3+5: Vault SOL — separate from compressed, with Withdraw */}
        <div className="bg-blue-950 border border-blue-900 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-500 font-medium">In Vault</span>
            </div>
            {/* FIX 5: Only show Withdraw when vault has withdrawable SOL */}
            {isOwner && stats.withdrawableSol > 0.000_01 && (
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/25
                           text-blue-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <DownloadCloud className="w-3 h-3" />
                {isWithdrawing ? "Withdrawing…" : "Withdraw"}
              </button>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.vaultSol.toFixed(4)} SOL</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {stats.withdrawableSol > 0.000_01
                ? `${stats.withdrawableSol.toFixed(4)} SOL withdrawable`
                : "below rent-exempt minimum"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Balance breakdown legend ──────────────────────────────────────── */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col gap-2 text-xs text-gray-500">
        <p className="text-gray-400 font-medium mb-1">Balance locations</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
          <span><span className="text-yellow-400">Compressed</span> — in Light Protocol ATA. Use <strong className="text-gray-400">Claim</strong> to convert to native SOL.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span><span className="text-blue-400">Vault</span> — native SOL in PDA. Use <strong className="text-gray-400">Withdraw</strong> to move to your wallet.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
          <span><span className="text-gray-400">Claimed</span> — {stats.totalClaimedSol.toFixed(4)} SOL total withdrawn from vault.</span>
        </div>
      </div>

      {/* Vault status */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-600">
        <span>
          Vault:{" "}
          <span className={stats.isActive ? "text-green-400" : "text-red-400"}>
            {stats.isActive ? "Active" : "Inactive"}
          </span>
        </span>
        <span className="font-mono">{creatorPublicKey.toBase58().slice(0, 8)}…</span>
      </div>

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
