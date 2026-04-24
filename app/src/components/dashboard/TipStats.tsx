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
import { motion, AnimatePresence } from "framer-motion";

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
      if (sig) setClaimTx(sig);
    } catch (e: any) {
      if (
        e instanceof AlreadyProcessedError ||
        String(e?.message).includes("already been processed")
      ) {
        setClaimTx("already-confirmed");
      } else {
        alert(`Claim failed: ${e.message}`);
      }
    }
  };

  // ── Withdraw vault SOL → wallet ────────────────────────────────────────────

  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !isOwner) return;

    if (!stats?.withdrawableSol || stats.withdrawableSol < 0.000_01) {
      alert("No withdrawable vault balance.");
      return;
    }

    setIsWithdrawing(true);
    setWithdrawTx(null);
    try {
      const sig = await withdrawFromVault({ publicKey, signTransaction });
      if (sig) {
        setWithdrawTx(sig);
        refresh();
      }
    } catch (e: any) {
      if (
        e instanceof AlreadyProcessedError ||
        String(e?.message).includes("already been processed")
      ) {
        setWithdrawTx("already-confirmed");
        refresh();
      } else {
        alert(`Withdraw failed: ${e.message}`);
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-40 bg-gray-900 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    // ... (error state)
    return stats ? null : (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4"
      >
        <Shield className="w-10 h-10 text-gray-700" />
        <div>
          <p className="font-semibold text-gray-300 mb-1">No vault found</p>
          <p className="text-sm text-gray-500">
            You haven&apos;t initialized your PrivyBag vault yet.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AnimatePresence mode="popLayout">
        {/* ── New Tip Banner ────────────────────────────────────────────────── */}
        {newTip && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.10) 100%)",
                border: "1px solid rgba(34,197,94,0.35)",
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
          </motion.div>
        )}

        {/* ── Success Toasts (Claim/Withdraw) ───────────────────────────────── */}
        {(claimTx || withdrawTx) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
            style={{
              background: claimTx 
                ? "linear-gradient(135deg, rgba(109,40,217,0.18) 0%, rgba(59,130,246,0.10) 100%)"
                : "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.10) 100%)",
              border: claimTx 
                ? "1px solid rgba(109,40,217,0.35)"
                : "1px solid rgba(16,185,129,0.35)",
            }}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <CheckCircle2 className={`w-4 h-4 ${claimTx ? "text-purple-400" : "text-green-400"} flex-shrink-0`} />
              <span className={claimTx ? "text-purple-300" : "text-green-300"}>
                {claimTx ? "Tips claimed — SOL sent to your wallet!" : "Withdrawal confirmed!"}
              </span>
              {((claimTx && claimTx !== "already-confirmed") || (withdrawTx && withdrawTx !== "already-confirmed")) && (
                <a
                  href={`https://explorer.solana.com/tx/${claimTx || withdrawTx}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className={`text-xs ${claimTx ? "text-purple-400 hover:text-purple-300" : "text-green-400 hover:text-green-300"} underline flex items-center gap-1`}
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button onClick={() => { setClaimTx(null); setWithdrawTx(null); }} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Tip Statistics</h2>
        <PrivacyBadge label="Aggregate Only" size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Total Tips",
            value: stats.tipCount,
            sub: "private tips received",
            icon: TrendingUp,
            color: "purple",
            bg: "bg-purple-950",
            border: "border-purple-900",
            text: "text-purple-400"
          },
          {
            label: "Total Received",
            value: `${stats.totalReceivedSol.toFixed(4)} SOL`,
            sub: "compressed + vault",
            icon: Coins,
            color: "green",
            bg: "bg-green-950",
            border: "border-green-900",
            text: "text-green-400"
          },
          {
            label: "Unclaimed (Compressed)",
            value: `${stats.unclaimedSol.toFixed(4)} SOL`,
            sub: "in Light compressed ATA",
            icon: Zap,
            color: "yellow",
            bg: "bg-yellow-950",
            border: "border-yellow-900",
            text: "text-yellow-400",
            action: isOwner && stats.unclaimedSol > 0.000_01 ? {
              label: isClaiming ? "Claiming…" : "Claim",
              fn: handleClaim,
              disabled: isClaiming,
              icon: DownloadCloud
            } : null
          },
          {
            label: "In Vault",
            value: `${stats.vaultSol.toFixed(4)} SOL`,
            sub: stats.withdrawableSol > 0.000_01 ? `${stats.withdrawableSol.toFixed(4)} SOL withdrawable` : "below rent-exempt",
            icon: Lock,
            color: "blue",
            bg: "bg-blue-950",
            border: "border-blue-900",
            text: "text-blue-400",
            action: isOwner && stats.withdrawableSol > 0.000_01 ? {
              label: isWithdrawing ? "Withdrawing…" : "Withdraw",
              fn: handleWithdraw,
              disabled: isWithdrawing,
              icon: DownloadCloud
            } : null
          }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className={`${stat.bg} ${stat.border} border rounded-2xl p-5 flex flex-col gap-3 shadow-lg shadow-black/20 transition-all hover:shadow-purple-500/5`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <stat.icon className={`w-4 h-4 ${stat.text}`} />
                <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
              </div>
              {stat.action && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={stat.action.fn}
                  disabled={stat.action.disabled}
                  className={`flex items-center gap-1.5 px-2.5 py-1 ${stat.bg.replace('950', '500')}/15 hover:${stat.bg.replace('950', '500')}/25
                             ${stat.text} rounded-lg text-xs font-semibold transition-all disabled:opacity-50`}
                >
                  <stat.action.icon className="w-3 h-3" />
                  {stat.action.label}
                </motion.button>
              )}
            </div>
            <div>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-900/40 backdrop-blur-sm border border-gray-800 rounded-xl p-4 flex flex-col gap-2 text-xs text-gray-500"
      >
        <p className="text-gray-400 font-medium mb-1">Balance locations</p>
        {[
          { color: "bg-yellow-400", text: "Compressed", detail: "in Light Protocol ATA. Use Claim to convert." },
          { color: "bg-blue-400", text: "Vault", detail: "native SOL in PDA. Use Withdraw to move to wallet." },
          { color: "bg-gray-500", text: "Claimed", detail: `${stats.totalClaimedSol.toFixed(4)} SOL total withdrawn.` }
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${item.color} flex-shrink-0`} />
            <span><span className={item.color.replace('bg-', 'text-')}>{item.text}</span> — {item.detail}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
