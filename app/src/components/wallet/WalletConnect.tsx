"use client";
// src/components/wallet/WalletConnect.tsx
//
// Standalone wallet connect button with a connection status display.
// Used on pages that need wallet state but don't use WalletMultiButton directly.

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield, CheckCircle } from "lucide-react";

export function WalletConnect() {
  const { connected, publicKey } = useWallet();

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
        <CheckCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm text-gray-300 font-mono">
          {publicKey.toBase58().slice(0, 6)}…{publicKey.toBase58().slice(-6)}
        </span>
        <span className="text-xs text-gray-600 border-l border-gray-700 pl-2 ml-1">
          Connected
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Shield className="w-4 h-4 text-purple-400" />
        Connect your wallet to continue
      </div>
      <WalletMultiButton
        style={{
          background: "#5b21b6",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          height: "2.75rem",
          padding: "0 1.25rem",
        }}
      />
    </div>
  );
}
