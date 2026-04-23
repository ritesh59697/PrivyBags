"use client";
// src/components/dashboard/NotificationBell.tsx
//
// Always-visible bell icon in the dashboard header.
// Polls the vault every 15 s and shakes + shows a badge when a new tip arrives.

import { Bell } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useCreatorDashboard } from "@/hooks/useCreatorDashboard";

interface Props {
  creatorPublicKey: PublicKey;
}

export function NotificationBell({ creatorPublicKey }: Props) {
  const { newTip, dismissNewTip, refresh } = useCreatorDashboard(creatorPublicKey);

  const handleClick = () => {
    refresh();
    dismissNewTip();
  };

  return (
    <>
      {/* Keyframe styles injected inline so no Tailwind config needed */}
      <style>{`
        @keyframes bellShake {
          0%,100% { transform: rotate(0deg); }
          10%,50%  { transform: rotate(-18deg); }
          30%,70%  { transform: rotate(18deg); }
          90%      { transform: rotate(-8deg); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        .bell-shake {
          animation: bellShake 0.7s ease infinite;
          transform-origin: top center;
        }
        .badge-pop {
          animation: badgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <button
        id="notification-bell"
        onClick={handleClick}
        title={newTip ? "New tip received! Click to dismiss" : "Tip notifications — live"}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200"
        style={{
          background: newTip
            ? "linear-gradient(135deg, rgba(34,197,94,0.20) 0%, rgba(16,185,129,0.12) 100%)"
            : "rgba(109,40,217,0.12)",
          border: newTip ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(109,40,217,0.25)",
          boxShadow: newTip ? "0 0 12px rgba(34,197,94,0.25)" : "none",
        }}
        aria-label={newTip ? "New tip received" : "Notifications"}
      >
        {/* Bell icon — shakes when newTip */}
        <Bell
          className={`w-4 h-4 transition-colors duration-200 ${
            newTip ? "text-green-400 bell-shake" : "text-purple-400"
          }`}
        />

        {/* Red badge dot — only when there's a new tip */}
        {newTip && (
          <span
            className="badge-pop absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
          >
            1
          </span>
        )}

        {/* Subtle pulsing ring when idle, to show "live" state */}
        {!newTip && (
          <span
            className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
            style={{ border: "1px solid rgba(109,40,217,0.5)", pointerEvents: "none" }}
          />
        )}
      </button>
    </>
  );
}
