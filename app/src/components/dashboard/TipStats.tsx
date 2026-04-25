"use client";
// src/components/dashboard/TipStats.tsx

import { PublicKey } from "@solana/web3.js";
import {
  TrendingUp, Coins, Zap, Lock,
  DownloadCloud, Bell, X, ExternalLink,
  CheckCircle2, RefreshCw, ShieldCheck,
} from "lucide-react";
import { useCreatorDashboard } from "@/hooks/useCreatorDashboard";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { AlreadyProcessedError } from "@/lib/light/shielded-transfer";
import { withdrawFromVault } from "@/lib/anchor/privybag-client";
import { motion, AnimatePresence } from "framer-motion";

interface TipStatsProps {
  creatorPublicKey: PublicKey;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  accentColor: string;
  bgColor: string;
  icon: React.ElementType;
  index: number;
  action?: {
    label: string;
    fn: () => void;
    disabled: boolean;
    icon: React.ElementType;
  } | null;
  errorMsg?: string | null;
}

function StatCard({ label, value, sub, accentColor, bgColor, icon: Icon, index, action, errorMsg }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className="relative rounded-2xl p-5 flex flex-col gap-4 group"
      style={{
        background: bgColor,
        border: `1px solid ${accentColor}18`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${accentColor}0a, transparent 60%)` }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}22` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
          <span
            className="text-xs uppercase tracking-wider"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            {label}
          </span>
        </div>

        {action && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.fn}
            disabled={action.disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            style={{
              background: `${accentColor}12`,
              border: `1px solid ${accentColor}25`,
              color: accentColor,
              fontFamily: "var(--font-display)",
            }}
          >
            <action.icon className="w-3 h-3" />
            {action.label}
          </motion.button>
        )}
      </div>

      {/* Value */}
      <div>
        <p
          className="mb-1"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1.625rem",
            color: accentColor,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>
      </div>

      {errorMsg && (
        <p className="text-xs" style={{ color: "#f87171" }}>{errorMsg}</p>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleClaim = async () => {
    if (!publicKey || !signTransaction || !isOwner) return;
    setClaimTx(null);
    try {
      const sig = await claimCompressedFunds({ publicKey, signTransaction });
      if (sig) setClaimTx(sig);
    } catch (e: any) {
      if (e instanceof AlreadyProcessedError || String(e?.message).includes("already been processed")) {
        setClaimTx("already-confirmed");
      } else {
        alert(`Claim failed: ${e.message}`);
      }
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !signTransaction || !isOwner) return;
    if (!stats?.withdrawableSol || stats.withdrawableSol < 0.000_01) {
      alert("No withdrawable vault balance.\n\nIf you have compressed tips, use Claim first.");
      return;
    }
    setIsWithdrawing(true);
    setWithdrawTx(null);
    try {
      const sig = await withdrawFromVault({ publicKey, signTransaction });
      if (sig) { setWithdrawTx(sig); refresh(); }
    } catch (e: any) {
      if (e instanceof AlreadyProcessedError || String(e?.message).includes("already been processed")) {
        setWithdrawTx("already-confirmed"); refresh();
      } else {
        alert(`Withdraw failed: ${e.message}`);
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-7 w-44 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── No vault ────────────────────────────────────────────────────────────────
  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-12 text-center flex flex-col items-center gap-4"
        style={{ background: "rgba(13,18,32,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
        >
          <ShieldCheck className="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>
            No vault found
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Send your first tip to initialize the vault PDA.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Stat cards config ───────────────────────────────────────────────────────
  const cards: StatCardProps[] = [
    {
      label: "Total Tips",
      value: stats.tipCount,
      sub: "shielded tips received",
      accentColor: "#8b5cf6",
      bgColor: "rgba(109,40,217,0.06)",
      icon: TrendingUp,
      index: 0,
      action: null,
    },
    {
      label: "Total Received",
      value: `${stats.totalReceivedSol.toFixed(4)} SOL`,
      sub: "compressed + vault combined",
      accentColor: "#22c55e",
      bgColor: "rgba(34,197,94,0.05)",
      icon: Coins,
      index: 1,
      action: null,
    },
    {
      label: "Unclaimed",
      value: `${stats.unclaimedSol.toFixed(4)} SOL`,
      sub: "in Light compressed ATA",
      accentColor: "#f59e0b",
      bgColor: "rgba(245,158,11,0.05)",
      icon: Zap,
      index: 2,
      action: isOwner && stats.unclaimedSol > 0.000_01
        ? { label: isClaiming ? "Claiming…" : "Claim", fn: handleClaim, disabled: isClaiming, icon: DownloadCloud }
        : null,
      errorMsg: claimError,
    },
    {
      label: "In Vault",
      value: `${stats.vaultSol.toFixed(4)} SOL`,
      sub: stats.withdrawableSol > 0.000_01
        ? `${stats.withdrawableSol.toFixed(4)} SOL withdrawable`
        : "below rent-exempt minimum",
      accentColor: "#3b82f6",
      bgColor: "rgba(59,130,246,0.05)",
      icon: Lock,
      index: 3,
      action: isOwner && stats.withdrawableSol > 0.000_01
        ? { label: isWithdrawing ? "Withdrawing…" : "Withdraw", fn: handleWithdraw, disabled: isWithdrawing, icon: DownloadCloud }
        : null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Alerts ───────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="popLayout">

        {/* New tip banner */}
        {newTip && (
          <motion.div
            key="new-tip"
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.6, repeat: 3 }}
                  className="w-2 h-2 rounded-full bg-green-400"
                />
                <Bell className="w-3.5 h-3.5 text-green-400" />
                <span className="text-sm font-semibold text-green-300">New tip received!</span>
              </div>
              <button onClick={dismissNewTip} style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Claim / Withdraw success */}
        {(claimTx || withdrawTx) && (
          <motion.div
            key="tx-success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{
              background: claimTx ? "rgba(109,40,217,0.08)" : "rgba(34,197,94,0.07)",
              border: `1px solid ${claimTx ? "rgba(139,92,246,0.25)" : "rgba(34,197,94,0.2)"}`,
            }}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${claimTx ? "text-purple-400" : "text-green-400"}`} />
              <span className={`text-sm font-medium ${claimTx ? "text-purple-300" : "text-green-300"}`}>
                {claimTx ? "Tips claimed — SOL sent to your wallet" : "Withdrawal confirmed"}
              </span>
              {(claimTx && claimTx !== "already-confirmed") || (withdrawTx && withdrawTx !== "already-confirmed") ? (
                <a
                  href={`https://explorer.solana.com/tx/${claimTx || withdrawTx}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs underline transition-colors"
                  style={{ color: claimTx ? "#a78bfa" : "#4ade80" }}
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
            <button onClick={() => { setClaimTx(null); setWithdrawTx(null); }} style={{ color: "var(--text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.125rem",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Vault Statistics
          </h2>
          {/* Active badge */}
          {stats.isActive && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                color: "#22c55e",
                fontFamily: "var(--font-display)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active
            </span>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, rotate: 180 }}
          onClick={handleRefresh}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 transition-all ${isRefreshing ? "animate-spin" : ""}`}
            style={{ color: "var(--text-muted)" }}
          />
        </motion.button>
      </div>

      {/* Privacy notice */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
        style={{
          background: "rgba(109,40,217,0.05)",
          border: "1px solid rgba(139,92,246,0.12)",
        }}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Individual sender wallets and amounts are never stored on-chain. Aggregate totals only.
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Balance legend ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl p-4 flex flex-col gap-2.5"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-widest mb-1"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Balance locations
        </p>
        {[
          { dot: "#f59e0b", label: "Compressed", info: "In Light Protocol ATA — use Claim to convert to native SOL" },
          { dot: "#3b82f6", label: "Vault", info: "Native SOL in PDA — use Withdraw to send to your wallet" },
          { dot: "#6b7280", label: "Claimed", info: `${stats.totalClaimedSol.toFixed(4)} SOL total withdrawn to date` },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.dot }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="font-semibold" style={{ color: r.dot }}>{r.label}</span>{" — "}{r.info}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}