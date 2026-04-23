"use client";
// src/app/page.tsx

import Image from "next/image";
import Link from "next/link";
import { Shield, EyeOff, Zap, ArrowRight, Lock } from "lucide-react";
import { CreatorSearch } from "@/components/creator/CreatorSearch";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 flex flex-col items-center gap-12">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-purple-300 border border-purple-800/50 bg-purple-950/30">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Live on Solana Devnet · Light Protocol V2 · ZK Compression
        </div>

        {/* Headline */}
        <div className="text-center flex flex-col gap-5">
          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight">
            Tip Creators on Bags
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #c084fc 100%)",
              }}
            >
              Completely Privately
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            PrivyBag shields your wallet, tip amount, and identity using ZK compressed
            transfers on Solana. Creators see aggregate totals — nobody sees you.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                       border border-purple-700/50 text-purple-300 hover:border-purple-600 hover:text-purple-200
                       transition-all duration-200"
          >
            Creator Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Search */}
        <div className="w-full max-w-lg flex flex-col gap-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-widest text-center">
            Find a creator to tip privately
          </p>
          <CreatorSearch />
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Shield,
              title: "Hidden Sender",
              desc: "Your wallet address is never linked to the tip on-chain. Zero trace.",
              color: "text-violet-400",
              glow: "rgba(139, 92, 246, 0.08)",
              border: "rgba(109, 40, 217, 0.25)",
            },
            {
              icon: EyeOff,
              title: "Hidden Amount",
              desc: "Tip value is shielded inside a ZK compressed token account.",
              color: "text-purple-400",
              glow: "rgba(168, 85, 247, 0.08)",
              border: "rgba(126, 34, 206, 0.25)",
            },
            {
              icon: Zap,
              title: "Native to Bags",
              desc: "Works with Bags creators and the full fee-sharing infrastructure.",
              color: "text-fuchsia-400",
              glow: "rgba(217, 70, 239, 0.08)",
              border: "rgba(162, 28, 175, 0.25)",
            },
          ].map(({ icon: Icon, title, desc, color, glow, border }) => (
            <div
              key={title}
              className="rounded-2xl p-6 flex flex-col gap-4 transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: `radial-gradient(ellipse at top left, ${glow} 0%, rgba(17,24,39,0.5) 70%)`,
                border: `1px solid ${border}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold text-sm text-white">{title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-12 rounded-2xl p-6 sm:p-8"
          style={{
            background: "rgba(17,24,39,0.4)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">How the privacy works</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Wrap SOL", desc: "Native SOL is converted into a compressed Light Protocol token (wSOL)." },
              { step: "02", title: "Shield Transfer", desc: "A ZK validity proof is generated client-side. The transfer is sent via Light's compressed token program — no sender info on-chain." },
              { step: "03", title: "Vault Update", desc: "Creator's PrivyBag vault records aggregate stats. Individual tip details are never stored." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col gap-2">
                <span className="text-xs font-bold text-purple-500 tracking-widest">{step}</span>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
