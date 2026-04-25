"use client";
// src/components/layout/Navbar.tsx

import Link from "next/link";
import { Bell, X, Coins, ExternalLink, ShieldCheck } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/providers/NotificationProvider";
import { motion, AnimatePresence } from "framer-motion";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export function Navbar() {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleBell = () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) setTimeout(markAllRead, 800);
  };

  const fmt = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return `${d}s ago`;
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    return `${Math.floor(d / 3600)}h ago`;
  };

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "rgba(8, 11, 20, 0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-5xl mx-auto px-5 h-[60px] flex items-center justify-between">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <Link href="/" className="group flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
            style={{
              background: "rgba(109,40,217,0.15)",
              border: "1px solid rgba(139,92,246,0.25)",
              boxShadow: "0 0 15px rgba(109,40,217,0.1)",
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src="/plogo.png"
                alt="Logo"
                fill
                className="object-cover scale-110"
                sizes="32px"
              />
            </div>
          </motion.div>
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "0.9375rem",
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              PRIVYBAG
            </span>
          </div>
        </Link>

        {/* ── Right ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            Dashboard
          </Link>

          {/* Divider */}
          <div className="hidden sm:block w-px h-4 bg-white/10" />

          {/* ── Bell ──────────────────────────────────────────────────────── */}
          <div className="relative" ref={panelRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBell}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all"
              style={{
                background: open ? "rgba(109,40,217,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${open ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <Bell className={`w-4 h-4 ${unreadCount > 0 ? "text-purple-400" : "text-gray-500"}`} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 flex h-[14px] w-[14px] items-center justify-center"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-50" />
                    <span
                      className="relative inline-flex h-[14px] w-[14px] items-center justify-center rounded-full text-[8px] font-black text-white"
                      style={{ background: "#ef4444", border: "1.5px solid rgba(8,11,20,1)" }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* ── Dropdown ─────────────────────────────────────────────────── */}
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-3 w-[calc(100vw-2.5rem)] sm:w-[340px] rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)] z-50"
                  style={{
                    background: "rgba(10, 13, 22, 0.97)",
                    border: "1px solid rgba(139,92,246,0.18)",
                    backdropFilter: "blur(32px)",
                  }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-purple-400" />
                      <span
                        className="text-xs text-white"
                        style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
                      >
                        Alerts
                      </span>
                      {unreadCount > 0 && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", fontFamily: "var(--font-display)" }}
                        >
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* List */}
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center gap-2.5 py-10 px-6 text-center">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <Bell className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                        </div>
                        <p
                          className="text-xs uppercase tracking-widest"
                          style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700 }}
                        >
                          No alerts yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n, idx) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.04 }}
                          className="flex items-start gap-3 px-5 py-3.5"
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: n.read ? "transparent" : "rgba(34,197,94,0.02)",
                          }}
                        >
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.15)" }}
                          >
                            <Coins className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">New tip received</p>
                            {n.receivedSol > 0 && (
                              <p
                                className="text-xs font-black mt-0.5"
                                style={{ color: "#22c55e", fontFamily: "var(--font-display)" }}
                              >
                                +{n.receivedSol.toFixed(4)} SOL
                              </p>
                            )}
                            <p
                              className="text-[10px] mt-1 uppercase tracking-wider"
                              style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 600 }}
                            >
                              {fmt(n.timestamp)} · Shielded
                            </p>
                          </div>
                          <button
                            onClick={() => dismiss(n.id)}
                            className="mt-0.5 transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div
                      className="flex items-center justify-between px-5 py-3"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.3)" }}
                    >
                      <button
                        onClick={markAllRead}
                        className="text-[10px] uppercase tracking-widest transition-colors"
                        style={{ color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        Mark all read
                      </button>
                      <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                      >
                        Dashboard <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}