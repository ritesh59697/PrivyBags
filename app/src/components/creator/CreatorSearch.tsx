"use client";
// src/components/creator/CreatorSearch.tsx
//
// Search bar that resolves a Bags Twitter/X username → creator card.
// Also accepts raw wallet addresses directly.
//
// UX states:
//   idle        → placeholder shown, no query
//   searching   → spinner + "Searching for @username..."
//   found       → creator card shown, click navigates to /tip/<slug>
//   not_found   → clear "No Bags creator found" message
//   error       → error message
//
// The Bags API has no general search — we resolve exact usernames only.
// Typing "sol" does NOT return all usernames containing "sol";
// it looks up the exact @sol handle.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, AlertCircle, AtSign, Wallet, ArrowRight } from "lucide-react";
import { useBagsSearch } from "@/hooks/useBagsCreator";
import { CreatorCard } from "./CreatorCard";
import { isWalletAddress } from "@/lib/bags/client";
import { motion, AnimatePresence } from "framer-motion";

export function CreatorSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const { results, loading, state, error } = useBagsSearch(query);

  const clean = query.replace(/^@/, "").trim();
  const isWallet = isWalletAddress(clean);
  const hasQuery = clean.length > 0;
  const showDropdown = hasQuery && state !== "idle";

  return (
    <div className="relative w-full">

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <motion.div 
        initial={false}
        animate={{ scale: showDropdown ? 1.01 : 1 }}
        className="relative"
      >
        {/* Left icon — wallet icon if address, @ otherwise */}
        {isWallet ? (
          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
        ) : (
          <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length === 1) {
              router.push(`/tip/${results[0].slug}`);
            }
          }}
          placeholder="Enter Bags username or wallet address…"
          className="w-full bg-gray-900 border border-gray-800 rounded-xl
                     pl-11 pr-11 py-3.5 text-sm text-white
                     placeholder:text-gray-600
                     focus:outline-none focus:ring-2 focus:ring-purple-600/50
                     focus:border-purple-700 transition-all shadow-inner"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Right — spinner while searching */}
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />
        )}
        {!loading && hasQuery && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600
                       hover:text-gray-400 transition-colors text-xs"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </motion.div>

      {/* ── Hint text ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!hasQuery && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 text-xs text-gray-600 text-center"
          >
            Type a Bags username (e.g. <span className="text-gray-500">ansem</span>) or paste a wallet address
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Dropdown ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-800
                            rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
          >

            {/* Searching state */}
            {state === "searching" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-4 py-6 text-sm text-gray-400"
              >
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                <span>
                  Looking up{" "}
                  <span className="text-white font-medium">
                    {isWallet ? `${clean.slice(0, 8)}…` : `@${clean}`}
                  </span>{" "}
                  on Bags…
                </span>
              </motion.div>
            )}

            {/* Found — show creator card */}
            {state === "found" && results.map((creator, idx) => (
              <motion.button
                key={creator.slug}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="w-full text-left hover:bg-purple-900/10 group transition-all duration-200 border-b border-gray-800 last:border-0"
                onClick={() => router.push(`/tip/${creator.slug}`)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <CreatorCard creator={creator} compact />
                    <div className="px-4 pb-3 -mt-2">
                      <span className="text-[10px] text-gray-600 font-mono tracking-tighter opacity-80">
                        {creator.walletAddress.slice(0, 12)}…{creator.walletAddress.slice(-12)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pr-4 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                      Tip Now
                    </span>
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 rounded-full bg-gray-800 group-hover:bg-purple-600 flex items-center justify-center transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    </motion.div>
                  </div>
                </div>
              </motion.button>
            ))}

            {/* Not found */}
            {state === "not_found" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-6 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span>
                    No Bags creator found for{" "}
                    <span className="text-white font-medium">
                      {isWallet ? `${clean.slice(0, 8)}…` : `@${clean}`}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-gray-600 pl-6 leading-relaxed">
                  {isWallet
                    ? "This wallet isn't registered on Bags.fm."
                    : "Check the spelling — Bags uses your exact Twitter/X username."
                  }
                </p>
                {!isWallet && (
                  <p className="text-xs text-gray-600 pl-6">
                    If you know their wallet address, paste it directly into the search box.
                  </p>
                )}
              </motion.div>
            )}

            {/* Error state */}
            {state === "error" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2.5 px-4 py-6"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-red-400 font-semibold">Search failed</p>
                  {error && <p className="text-xs text-gray-600">{error}</p>}
                  <p className="text-xs text-gray-600">
                    Check your internet connection or try again.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
