"use client";
// src/app/page.tsx — PrivyBag Landing Page

import Link from "next/link";
import Image from "next/image";
import { CreatorSearch } from "@/components/creator/CreatorSearch";
import { useRef, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ShieldCheck, Zap, BarChart3, EyeOff,
  ArrowRight, ChevronRight, Lock, Globe,
  Layers, GitBranch, Sparkles,
} from "lucide-react";

// ─── Scroll reveal hook ──────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: threshold });
  return { ref, inView };
}

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Vault PDA Indirection",
    desc: "Tips route through a program-controlled Vault PDA. No single transaction ever links your wallet to the creator's.",
    accent: "#8b5cf6",
    tag: "Privacy",
  },
  {
    icon: Zap,
    title: "Compressed Transactions",
    desc: "Built on Light Protocol's ZK Compression. Drastically reduced on-chain footprint with cryptographic guarantees.",
    accent: "#3b82f6",
    tag: "Performance",
  },
  {
    icon: EyeOff,
    title: "Anonymous Support",
    desc: "Support your favourite creators without leaving a financial trace. Your identity stays yours.",
    accent: "#06b6d4",
    tag: "Anonymity",
  },
  {
    icon: BarChart3,
    title: "Creator Analytics",
    desc: "Creators see aggregated vault stats — total volume, tip counts, and claimable balance — without knowing who sent what.",
    accent: "#a78bfa",
    tag: "Dashboard",
  },
];

// ─── Trust stats ─────────────────────────────────────────────────────────────
const STATS = [
  { value: "2-TX", label: "Privacy model" },
  { value: "0", label: "Wallet links exposed" },
  { value: "Devnet", label: "Live network" },
  { value: "Bags", label: "Ecosystem" },
];

// ─── How it works ────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Search a creator",
    desc: "Find any Bags.fm creator by their Twitter handle. Or paste a wallet address directly.",
  },
  {
    n: "02",
    title: "Send privately",
    desc: "Your SOL goes to a Vault PDA — not to the creator's wallet. Explorer shows Fan → Vault only.",
  },
  {
    n: "03",
    title: "Creator claims",
    desc: "The creator withdraws from their vault in a separate transaction. Vault → Creator. No link.",
  },
];

// ─── Component: Animated gradient orb ────────────────────────────────────────
function GradientOrb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`}
    />
  );
}

// ─── Component: Feature card ─────────────────────────────────────────────────
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const { ref, inView } = useReveal();
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl p-6 cursor-default"
      style={{
        background: "rgba(13,18,32,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${feature.accent}14, transparent 60%)` }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${feature.accent}18`, border: `1px solid ${feature.accent}30` }}
        >
          <Icon className="w-5 h-5" style={{ color: feature.accent }} />
        </div>
        <span
          className="text-[10px] font-display font-700 uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{
            background: `${feature.accent}12`,
            color: feature.accent,
            border: `1px solid ${feature.accent}20`,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
          }}
        >
          {feature.tag}
        </span>
      </div>

      <h3
        className="mb-2 text-white"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.0625rem" }}
      >
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {feature.desc}
      </p>
    </motion.div>
  );
}

// ─── Component: Stat pill ────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4">
      <span
        className="text-2xl"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
      <span className="label-caps">{label}</span>
    </div>
  );
}

// ─── Component: Step ─────────────────────────────────────────────────────────
function Step({
  step,
  index,
  last,
}: {
  step: (typeof STEPS)[number];
  index: number;
  last: boolean;
}) {
  const { ref, inView } = useReveal();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex gap-6"
    >
      {/* Number + line */}
      <div className="flex flex-col items-center">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(109,40,217,0.12)",
            border: "1px solid rgba(139,92,246,0.25)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "0.8125rem",
            color: "var(--purple-400)",
            letterSpacing: "0.05em",
          }}
        >
          {step.n}
        </div>
        {!last && (
          <div className="w-px flex-1 mt-3" style={{ background: "rgba(255,255,255,0.06)" }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-10">
        <h3
          className="mb-1.5 text-white"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}
        >
          {step.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {step.desc}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Mock dashboard preview ───────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "rgba(13,18,32,0.9)",
        border: "1px solid rgba(139,92,246,0.15)",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      {/* Mock topbar */}
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex gap-1.5">
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
          ))}
        </div>
        <div
          className="mx-auto text-xs font-medium px-4 py-1 rounded-md"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
          }}
        >
          privybag.app/dashboard
        </div>
      </div>

      {/* Mock stats grid */}
      <div className="p-5 grid grid-cols-2 gap-3">
        {[
          { label: "Total Tips", val: "47", color: "#8b5cf6", sub: "private tips" },
          { label: "Total Received", val: "2.84 SOL", color: "#22c55e", sub: "compressed + vault" },
          { label: "Unclaimed", val: "0.35 SOL", color: "#f59e0b", sub: "in Light ATA" },
          { label: "In Vault", val: "2.49 SOL", color: "#3b82f6", sub: "withdrawable" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              {s.label}
            </p>
            <p className="text-xl" style={{ color: s.color, fontFamily: "var(--font-display)", fontWeight: 800 }}>
              {s.val}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Mock activity row */}
      <div className="px-5 pb-5">
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(34,197,94,0.05)",
            border: "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,197,94,0.12)" }}
            >
              <Zap className="w-4 h-4" style={{ color: "#22c55e" }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">New tip received</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                +0.05 SOL · Vault PDA · 2s ago
              </p>
            </div>
            <div className="ml-auto">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                Private
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(8,11,20,0.9), transparent)" }}
      />
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -40]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.6]);

  return (
    <main className="z-content relative overflow-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex flex-col items-center justify-center px-5 pt-24 pb-20 grid-dots"
      >
        {/* Orbs */}
        <GradientOrb className="w-[700px] h-[500px] -top-40 left-1/2 -translate-x-1/2 bg-purple-700/[0.08]" />
        <GradientOrb className="w-[400px] h-[400px] top-1/2 -right-32 bg-blue-600/[0.05]" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full"
            style={{
              background: "rgba(109,40,217,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="label-caps" style={{ color: "var(--purple-400)" }}>
              Live on Solana Devnet · Bags Hackathon 2026
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="heading-xl mb-6"
          >
            Tip creators.{" "}
            <span
              className="text-glow"
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #3b82f6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Leave no trace.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 max-w-2xl"
            style={{
              color: "var(--text-secondary)",
              fontSize: "clamp(1rem, 1.8vw, 1.2rem)",
              lineHeight: "1.65",
              fontWeight: 300,
            }}
          >
            PrivyBag routes tips through a Vault PDA on Solana — breaking the
            direct on-chain link between fan and creator. Built for the{" "}
            <span style={{ color: "var(--text-primary)" }}>Bags.fm</span> ecosystem.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-3 justify-center"
          >
            <Link href="#search" className="btn-primary text-sm">
              Start Tipping Privately
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard" className="btn-ghost text-sm">
              Creator Dashboard
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-2 mt-8"
            style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>No wallet link exposed · Two-transaction privacy model · Open source</span>
          </motion.div>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-lg mx-auto mt-16"
          style={{ filter: "drop-shadow(0 40px 80px rgba(109,40,217,0.2))" }}
        >
          <DashboardPreview />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div
            className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-2 rounded-full bg-purple-400/60"
            />
          </div>
        </motion.div>
      </section>

      {/* ── SEARCH ──────────────────────────────────────────────────────────── */}
      <section id="search" className="relative py-24 px-5">
        <div className="max-w-xl mx-auto flex flex-col gap-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="heading-md mb-3">Find a Creator</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Search by Twitter handle or wallet address to send a private tip.
            </p>
          </motion.div>

          <div className="relative p-px rounded-2xl bg-white/5 border border-white/10 shadow-2xl">
            <CreatorSearch />
          </div>
        </div>
      </section>


      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      <section
        className="relative py-0"
        style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <StatPill value={s.value} label={s.label} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-5">
        <GradientOrb className="w-[500px] h-[400px] top-0 left-1/4 bg-purple-700/[0.06]" />

        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="label-caps mb-4"
            >
              How it works
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="heading-lg mb-4"
            >
              Privacy by architecture,<br />not by policy.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.14 }}
              style={{ color: "var(--text-secondary)", fontSize: "1rem", fontWeight: 300 }}
            >
              Every design decision in PrivyBag exists to protect the relationship between
              fans and the creators they support.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section
        className="relative py-28 px-5"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: steps */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="label-caps mb-4"
            >
              The flow
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="heading-lg mb-10"
            >
              Three steps.<br />Zero linkage.
            </motion.h2>

            {STEPS.map((step, i) => (
              <Step key={step.n} step={step} index={i} last={i === STEPS.length - 1} />
            ))}
          </div>

          {/* Right: transaction graph visual */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <TransactionGraph />
          </motion.div>
        </div>
      </section>

      {/* ── TRUST / INFO ─────────────────────────────────────────────────────── */}
      <section
        className="relative py-20 px-5"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl p-8 sm:p-12 grid grid-cols-1 sm:grid-cols-3 gap-8"
            style={{
              background: "rgba(13,18,32,0.6)",
              border: "1px solid var(--border-muted)",
            }}
          >
            {[
              {
                icon: Globe,
                title: "Live on Devnet",
                desc: "Fully deployed and functional on Solana Devnet. Real transactions, real privacy.",
              },
              {
                icon: GitBranch,
                title: "Open Source",
                desc: "Every line auditable on GitHub. No hidden backend, no user tracking.",
              },
              {
                icon: Layers,
                title: "Bags Ecosystem",
                desc: "Native Bags.fm integration. Search creators by Twitter handle, tip instantly.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: "rgba(139,92,246,0.1)",
                      border: "1px solid rgba(139,92,246,0.2)",
                    }}
                  >
                    <Icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3
                    className="text-white"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9375rem" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="relative py-32 px-5 text-center overflow-hidden">
        <GradientOrb className="w-[600px] h-[400px] -bottom-20 left-1/2 -translate-x-1/2 bg-purple-700/[0.09]" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="gradient-border p-px rounded-3xl"
          >
            <div
              className="rounded-3xl px-8 py-14 sm:px-14"
              style={{ background: "rgba(8,11,20,0.95)" }}
            >
              <div
                className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full"
                style={{
                  background: "rgba(109,40,217,0.1)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="label-caps" style={{ color: "var(--purple-400)" }}>
                  Privacy-first tipping
                </span>
              </div>

              <h2 className="heading-lg mb-4">
                Your support.{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Your privacy.
                </span>
              </h2>

              <p
                className="mb-10 max-w-md mx-auto"
                style={{ color: "var(--text-secondary)", fontSize: "1rem", fontWeight: 300, lineHeight: 1.7 }}
              >
                Start tipping Bags creators privately today.
                No signup, no KYC, no wallet link. Just support.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
                <Link href="#search" className="btn-primary justify-center">
                  Find a Creator
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/dashboard" className="btn-ghost justify-center">
                  View Dashboard
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer
        className="relative py-8 px-5"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="relative w-5 h-5 rounded-md overflow-hidden border border-white/10">
              <Image
                src="/plogo.png"
                alt="Logo"
                fill
                className="object-cover scale-110"
                sizes="20px"
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "var(--text-primary)",
              }}
            >
              PRIVYBAG
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-y-3 gap-x-4">
            {/* Hackathon info line */}
            <p className="text-[10px] sm:text-xs text-right sm:text-left" style={{ color: "var(--text-muted)" }}>
              Bags Hackathon 2026 · Solana Devnet ·{" "}
              <a
                href="https://github.com/ritesh59697/PrivyBags"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-400 transition-colors"
              >
                GitHub
              </a>
            </p>

            <span className="hidden sm:block text-white/10 text-xs">•</span>

            {/* Built by section */}
            <a
              href="https://x.com/ritesh5969"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group transition-opacity hover:opacity-90"
            >
              <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-colors">
                <Image
                  src="https://pbs.twimg.com/profile_images/1944572785373728768/Qc4iOnla_400x400.jpg"
                  alt="Ritesh"
                  fill
                  className="object-cover"
                  sizes="20px"
                />
              </div>
              <span className="text-[10px] sm:text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>
                Built by <span className="font-bold text-blue-400">Ritesh5969</span>
              </span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── Transaction graph component ─────────────────────────────────────────────
function TransactionGraph() {
  const boxes = [
    { label: "Fan Wallet", sub: "4v4h…HdGV", color: "#8b5cf6", y: 0 },
    { label: "Vault PDA", sub: "privybag_vault", color: "#3b82f6", y: 100 },
    { label: "Creator Wallet", sub: "7SUq…av8R", color: "#22c55e", y: 200 },
  ];

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "rgba(13,18,32,0.7)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p
        className="label-caps mb-8 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        On-chain transaction graph
      </p>

      <div className="relative flex flex-col gap-4 max-w-[260px] mx-auto">
        {boxes.map((box, i) => (
          <div key={box.label} className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="w-full rounded-xl px-5 py-3.5 flex items-center gap-3"
              style={{
                background: `${box.color}10`,
                border: `1px solid ${box.color}25`,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: box.color, boxShadow: `0 0 8px ${box.color}60` }}
              />
              <div>
                <p
                  className="text-xs text-white"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                >
                  {box.label}
                </p>
                <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {box.sub}
                </p>
              </div>
            </motion.div>

            {i < boxes.length - 1 && (
              <div className="flex flex-col items-center my-1 relative">
                {/* Arrow line */}
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: 28 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 + 0.2, duration: 0.3 }}
                  className="w-px overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                />
                {/* TX label */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 + 0.4 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {i === 0 ? "TX 1 — Fan signs" : "TX 2 — Creator withdraws"}
                </motion.div>
              </div>
            )}
          </div>
        ))}

        {/* Privacy note */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="mt-4 rounded-xl p-4 text-center"
          style={{
            background: "rgba(139,92,246,0.06)",
            border: "1px solid rgba(139,92,246,0.15)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
            No single transaction links{" "}
            <span className="text-purple-400 font-semibold">Fan → Creator</span> directly.
            Privacy through indirection.
          </p>
        </motion.div>
      </div>
    </div>
  );
}