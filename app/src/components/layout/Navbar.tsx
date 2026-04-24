"use client";
// src/components/layout/Navbar.tsx

import Link from "next/link";
import { Shield, Bell, X, Coins, ExternalLink } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/providers/NotificationProvider";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3 active:scale-95 transition-transform">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="relative w-9 h-9 rounded-full overflow-hidden border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
          >
            <Image
              src="/logo.jpg"
              alt="PrivyBag Logo"
              fill
              className="object-cover scale-110 group-hover:scale-125 transition-transform duration-500"
            />
          </motion.div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-lg tracking-tighter text-white">PRIVYBAG</span>
            <span className="text-[10px] font-bold text-purple-500/80 tracking-widest uppercase">Shielded Tips</span>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors hidden sm:block"
          >
            Dashboard
          </Link>

          {/* ── Notification Bell ──────────────────────────────────────── */}
          <div className="relative" ref={panelRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBellClick}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
              style={{
                background: "rgba(109,40,217,0.1)",
                border: "1px solid rgba(109,40,217,0.2)",
              }}
            >
              <Bell
                className={`w-4 h-4 transition-colors duration-200 ${
                  unreadCount > 0 ? "text-purple-300" : "text-purple-400"
                }`}
              />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 flex h-3 w-3"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 border-2 border-black" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* ── Dropdown Panel ─────────────────────────────────────── */}
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-[-1rem] md:right-0 mt-5 w-80 sm:w-96 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50"
                  style={{
                    background: "rgba(8, 6, 16, 0.95)",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                    backdropFilter: "blur(32px)",
                  }}
                >
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black uppercase tracking-widest text-white">Alerts</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-500/20 text-green-400 uppercase">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Notification list */}
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                          <Bell className="w-6 h-6 text-gray-700" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-600">No new tips</p>
                      </div>
                    ) : (
                      notifications.map((n, idx) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03] border-b border-white/5 last:border-0"
                          style={{
                            background: n.read ? "transparent" : "rgba(34,197,94,0.02)",
                          }}
                        >
                          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 bg-green-500/10 border border-green-500/20">
                            <Coins className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-bold tracking-tight">New Tip Received!</p>
                            {n.receivedSol > 0 && (
                              <p className="text-xs font-black text-green-400 mt-1">
                                +{n.receivedSol.toFixed(4)} SOL
                              </p>
                            )}
                            <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-tighter">
                              {formatTime(n.timestamp)} · Shielded Transfer
                            </p>
                          </div>
                          <button onClick={() => dismiss(n.id)} className="text-gray-700 hover:text-red-400 transition-colors mt-0.5">
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Panel footer */}
                  {notifications.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3.5 bg-black/40 border-t border-white/5">
                      <button onClick={markAllRead} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                        Mark All Read
                      </button>
                      <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
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
