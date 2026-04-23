"use client";
// src/app/dashboard/page.tsx

import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { Shield, Lock, BarChart3, Settings } from "lucide-react";
import { TipStats } from "@/components/dashboard/TipStats";
import { FeeShareConfig } from "@/components/dashboard/FeeShareConfig";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 text-center max-w-sm">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "radial-gradient(ellipse at center, rgba(109,40,217,0.2) 0%, rgba(17,24,39,0.6) 100%)",
              border: "1px solid rgba(109,40,217,0.3)",
            }}
          >
            <Shield className="w-10 h-10 text-purple-400" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Creator Dashboard</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Connect your wallet to view your private tip vault, aggregate earnings, and configure fee sharing rules.
            </p>
          </div>

          {/* Feature list */}
          <div className="w-full flex flex-col gap-2 text-left">
            {[
              { icon: BarChart3, text: "Private aggregate tip stats" },
              { icon: Lock, text: "Zero individual tip exposure" },
              { icon: Settings, text: "Shielded fee-share configuration" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-400">
                <Icon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>

          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <h1 className="text-2xl font-bold tracking-tight">Creator Dashboard</h1>
          </div>
          <p className="text-xs text-gray-600 font-mono">
            {publicKey?.toBase58().slice(0, 16)}...
          </p>
        </div>
        <WalletMultiButton />
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(109,40,217,0.3) 0%, transparent 100%)" }} />

      <TipStats creatorPublicKey={publicKey!} />
      <FeeShareConfig creatorPublicKey={publicKey!} />
    </div>
  );
}
