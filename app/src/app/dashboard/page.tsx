"use client";
// src/app/dashboard/page.tsx

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Wallet, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TipStats } from "@/components/dashboard/TipStats";
import { FeeShareConfig } from "@/components/dashboard/FeeShareConfig";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

// ─── Gradient orb ────────────────────────────────────────────────────────────
function Orb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-full pointer-events-none blur-[100px] ${className}`}
    />
  );
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();

  return (
    <main className="relative min-h-screen z-content">
      <Orb className="w-[500px] h-[400px] -top-32 left-1/2 -translate-x-1/2 bg-purple-700/[0.07]" />
      <Orb className="w-[300px] h-[300px] bottom-0 right-0 bg-blue-700/[0.04]" />

      <div className="max-w-5xl mx-auto px-5 py-12">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(109,40,217,0.12)",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
              }}
            >
              Creator Dashboard
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  lineHeight: 1.1,
                }}
              >
                Vault Overview
              </h1>
              {connected && publicKey && (
                <p
                  className="mt-1.5 font-mono text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {publicKey.toBase58().slice(0, 12)}…{publicKey.toBase58().slice(-8)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Tip Page
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </motion.div>

        {/* ── Not connected ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {!connected && (
            <motion.div
              key="connect-prompt"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl p-14 flex flex-col items-center gap-6 text-center"
              style={{
                background: "rgba(13,18,32,0.6)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(109,40,217,0.1)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <Wallet className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h2
                  className="mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    color: "var(--text-primary)",
                  }}
                >
                  Connect your wallet
                </h2>
                <p
                  className="max-w-xs text-sm"
                  style={{ color: "var(--text-secondary)", fontWeight: 300 }}
                >
                  Connect the wallet you used to register on Bags.fm to view
                  your vault and claim tips.
                </p>
              </div>
              <WalletMultiButton />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Dashboard content ───────────────────────────────────────────── */}
        <AnimatePresence>
          {connected && publicKey && (
            <motion.div
              key="dashboard-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              {/* Stats panel */}
              <section
                className="rounded-2xl p-6 sm:p-8"
                style={{
                  background: "rgba(13,18,32,0.7)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <TipStats creatorPublicKey={publicKey} />
              </section>

              {/* Divider */}
              <div
                className="flex items-center gap-4"
                style={{ color: "var(--text-muted)" }}
              >
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                <span
                  className="text-[10px] uppercase tracking-widest flex-shrink-0"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                >
                  Fee Sharing
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>

              {/* Fee share panel */}
              <section
                className="rounded-2xl p-6 sm:p-8"
                style={{
                  background: "rgba(13,18,32,0.7)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <FeeShareConfig creatorPublicKey={publicKey} />
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
