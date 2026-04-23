"use client";
// src/components/layout/Navbar.tsx

import Link from "next/link";
import { Shield, Bell, X, Coins, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/providers/NotificationProvider";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export function Navbar() {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const handleBellClick = () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      // Mark as read when panel opens
      setTimeout(markAllRead, 800);
    }
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "rgba(2, 4, 8, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-base text-white hover:text-purple-300 transition-colors"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}
          >
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          PrivyBag
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block"
          >
            Dashboard
          </Link>

          {/* ── Notification Bell ──────────────────────────────────────── */}
          <div className="relative" ref={panelRef}>
            <button
              id="navbar-notification-bell"
              onClick={handleBellClick}
              aria-label={unreadCount > 0 ? `${unreadCount} new tip(s)` : "Notifications"}
              title={unreadCount > 0 ? `${unreadCount} new tip(s)` : "Notifications"}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:bg-white/5"
              style={{
                background: "rgba(109,40,217,0.12)",
                border: "1px solid rgba(109,40,217,0.25)",
              }}
            >
              <Bell
                className={`w-4 h-4 transition-colors duration-200 ${
                  unreadCount > 0 ? "text-purple-300" : "text-purple-400"
                }`}
              />
              {/* Red dot — no shake, just a clean professional indicator */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              )}
            </button>

            {/* ── Dropdown Panel ─────────────────────────────────────── */}
            {open && (
              <div
                className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: "rgba(10, 8, 20, 0.97)",
                  border: "1px solid rgba(109,40,217,0.3)",
                  backdropFilter: "blur(20px)",
                  animation: "fadeSlideDown 0.18s ease",
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Tip Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Notification list */}
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
                      <Bell className="w-8 h-8 text-gray-700" />
                      <p className="text-sm text-gray-500">No tips received yet.</p>
                      <p className="text-xs text-gray-700">
                        We'll ping you here when a fan tips your vault.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: n.read ? "transparent" : "rgba(34,197,94,0.04)",
                        }}
                      >
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
                          style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}
                        >
                          <Coins className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">
                            🎉 New tip received!
                          </p>
                          {n.receivedSol > 0 && (
                            <p className="text-xs text-green-400 mt-0.5">
                              +{n.receivedSol.toFixed(4)} SOL to your vault
                            </p>
                          )}
                          <p className="text-[11px] text-gray-600 mt-1">
                            {formatTime(n.timestamp)} · Private · Vault PDA
                          </p>
                        </div>
                        <button
                          onClick={() => dismiss(n.id)}
                          className="flex-shrink-0 text-gray-700 hover:text-gray-500 transition-colors mt-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Panel footer */}
                {notifications.length > 0 && (
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <button
                      onClick={markAllRead}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Mark all read
                    </button>
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Go to Dashboard <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* ────────────────────────────────────────────────────────────── */}

          <WalletMultiButton />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}
