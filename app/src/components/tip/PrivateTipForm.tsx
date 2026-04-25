"use client";
// src/components/tip/PrivateTipForm.tsx
//
// ── HYBRID SEARCH INTEGRATION ─────────────────────────────────────────────────
//
// walletType flow:
//   "direct"    → fan pasted a wallet address directly → tip goes there, no banner
//   "connected" → Bags API found the creator's linked Phantom → tip goes there
//   "custodial" → Bags API only knows the custodial wallet → show override input
//                 so fan can paste the creator's Phantom address for direct tipping
//
// The override input is optional. If the fan leaves it empty, the tip goes to
// the custodial wallet (creator can withdraw via bags.fm/settings/wallets).

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import {
  Shield, Info, ExternalLink, AlertTriangle,
  CheckCircle2, Wallet, X, ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { isWalletAddress } from "@/lib/bags/client";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

import { usePrivateTip } from "@/hooks/usePrivateTip";
import { useBagsCreator } from "@/hooks/useBagsCreator";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";
import { TxStatus } from "@/components/ui/TxStatus";

const PRESETS = [0.01, 0.05, 0.1, 0.5, 1];

interface PrivateTipFormProps {
  creatorSlug: string;
}

export function PrivateTipForm({ creatorSlug }: PrivateTipFormProps) {
  const { connected } = useWallet();
  const { creator, loading: creatorLoading } = useBagsCreator(creatorSlug);

  const [amountSol, setAmountSol] = useState<string>("0.05");
  const [showInfo, setShowInfo] = useState(false);

  // ── Phantom override ─────────────────────────────────────────────────────────
  // Shown when walletType === "custodial". Fan can paste creator's Phantom here.
  const [phantomOverride, setPhantomOverride] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const { status, result, error, sendTip, reset } = usePrivateTip();

  const isProcessing = ["wrapping", "transferring", "recording"].includes(status);
  const isSuccess = status === "success";

  const parsedAmount = parseFloat(amountSol) || 0;
  const isValidAmount = parsedAmount >= 0.001 && parsedAmount <= 10;

  // Determine the actual tip destination
  const overrideTrimmed = phantomOverride.trim();
  const isValidOverride = isWalletAddress(overrideTrimmed);
  const tipDestination = isValidOverride ? overrideTrimmed : creator?.walletAddress ?? null;

  const depositSig = (result as any)?.depositSignature ??
    result?.transferSignatures?.[result.transferSignatures.length - 1];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAmount || !tipDestination || isProcessing) return;

    await sendTip({
      creatorAddress: tipDestination,
      amountSol: parsedAmount,
      wrapFirst: true,
    });
  }

  function handleReset() {
    reset();
    setAmountSol("0.05");
    setPhantomOverride("");
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (creatorLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-20 bg-gray-900 rounded-2xl animate-pulse" />
        <div className="h-12 bg-gray-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!creator) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center"
      >
        <p className="text-gray-400 text-sm">
          Creator <span className="text-white font-medium">@{creatorSlug}</span> not found.
        </p>
      </motion.div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-950 border border-green-800 rounded-2xl p-8 flex flex-col items-center gap-6 text-center shadow-2xl shadow-green-500/10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-green-900 flex items-center justify-center relative"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-green-500/20 blur-xl"
            />
            <Shield className="w-10 h-10 text-green-400 relative z-10" />
          </motion.div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Tip Sent Privately!</h2>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Your SOL is now in the vault PDA. No direct link exists between your wallet and the creator.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-left"
          >
            <p className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">On-chain Flow:</p>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-3 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                <span>You → Vault PDA <span className="text-gray-500 font-mono">(Shielded)</span></span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-2 h-2 rounded-full bg-gray-700" />
                <span>Vault PDA → Creator <span className="text-gray-700">(On Claim)</span></span>
              </div>
            </div>
          </motion.div>

          {depositSig && depositSig !== "already-processed" && (
            <a
              href={`https://explorer.solana.com/tx/${depositSig}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-purple-400 hover:text-purple-300 hover:border-purple-900/50 transition-all w-full justify-center"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Deposit Transaction
            </a>
          )}
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleReset}
          className="w-full py-3.5 rounded-xl border border-gray-800 text-sm text-gray-400 hover:text-white hover:bg-gray-900 transition-all"
        >
          Send another tip
        </motion.button>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  const isCustodial = creator.walletType === "custodial";
  const isConnected = creator.walletType === "connected";
  const isDirect = creator.walletType === "direct";

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Private Tip</h1>
        <PrivacyBadge size="sm" />
      </div>

      {/* ── Creator card ─────────────────────────────────────────────────────── */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="rounded-2xl overflow-hidden shadow-xl shadow-black/20"
        style={{ background: "rgba(17,24,39,1)", border: "1px solid rgba(55,65,81,1)" }}
      >
        <CreatorCard creator={creator} />

        {/* Wallet type badge strip */}
        <div className="border-t border-gray-800/50 bg-black/20 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Phantom Linked
              </span>
            )}
            {isCustodial && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-500">
                <AlertTriangle className="w-3 h-3" />
                Bags Custodial Wallet
              </span>
            )}
            {isDirect && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                <Wallet className="w-3 h-3" />
                Direct Wallet
              </span>
            )}
          </div>
          <span className="text-xs text-purple-400/70 font-mono">
            {(isValidOverride ? overrideTrimmed : creator.walletAddress).slice(0, 8)}…
            {(isValidOverride ? overrideTrimmed : creator.walletAddress).slice(-8)}
          </span>
        </div>
      </motion.div>

      {/* ── Custodial warning + override ─────────────────────────────────────── */}
      <AnimatePresence>
        {isCustodial && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(120,53,15,0.12)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              {/* Warning header */}
              <div className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-400">
                    This is @{creator.slug}'s Bags custodial wallet
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Tips sent here are held by Bags and can be withdrawn by the creator via{" "}
                    <a
                      href="https://bags.fm/settings/wallets"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400/70 underline hover:text-yellow-300 transition-colors"
                    >
                      bags.fm/settings/wallets
                    </a>
                    . For a direct tip to their Phantom wallet, paste their address below.
                  </p>
                </div>
              </div>

              {/* Override input toggle */}
              {!showOverride ? (
                <button
                  type="button"
                  onClick={() => setShowOverride(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-yellow-800/20 text-xs font-bold text-yellow-500/70 hover:text-yellow-400 hover:bg-yellow-900/10 transition-all"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Paste creator's Phantom address instead
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t border-yellow-800/20 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Creator's Phantom / Self-custody Wallet
                  </p>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-yellow-500/50" />
                    <input
                      type="text"
                      value={phantomOverride}
                      onChange={(e) => setPhantomOverride(e.target.value)}
                      placeholder="Paste Solana wallet address (e.g. from Phantom)"
                      className="w-full bg-gray-900/60 border rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 transition-all font-mono"
                      style={{
                        borderColor: phantomOverride
                          ? isValidOverride ? "rgba(74,222,128,0.5)" : "rgba(239,68,68,0.5)"
                          : "rgba(75,85,99,0.5)",
                      }}
                    />
                    {phantomOverride && (
                      <button
                        type="button"
                        onClick={() => setPhantomOverride("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Validation feedback */}
                  <AnimatePresence>
                    {phantomOverride && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={clsx(
                          "text-[10px] flex items-center gap-1.5",
                          isValidOverride ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {isValidOverride ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Valid Solana address — tip will go directly to this wallet
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            Invalid address — must be a 32–44 character base58 Solana address
                          </>
                        )}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Keep custodial option */}
                  <button
                    type="button"
                    onClick={() => { setShowOverride(false); setPhantomOverride(""); }}
                    className="text-[10px] text-gray-600 hover:text-gray-400 self-start transition-colors mt-1"
                  >
                    ← Send to custodial wallet instead
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Connected wallet success note */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(20,83,45,0.15)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-green-400 font-semibold">Phantom linked.</span>{" "}
              @{creator.slug} has connected their Phantom wallet on Bags. Your tip goes directly to their self-custody wallet.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Amount ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
          Tip Amount (SOL)
        </label>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((preset, idx) => (
            <motion.button
              key={preset}
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAmountSol(String(preset))}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                parseFloat(amountSol) === preset
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                  : "bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300"
              )}
            >
              {preset}
            </motion.button>
          ))}
        </div>
        <div className="relative group">
          <input
            type="number"
            min="0.001"
            max="10"
            step="0.001"
            value={amountSol}
            onChange={(e) => setAmountSol(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 pr-16
                       text-white font-bold text-lg placeholder:text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-purple-700
                       transition-all group-hover:border-gray-700
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-600 tracking-widest uppercase pointer-events-none">SOL</span>
        </div>
      </div>

      {/* ── Destination summary ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-600">
          Shielded Destination
        </span>
        <div className="flex items-center gap-2">
          {isValidOverride && (
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
              Phantom Override
            </span>
          )}
          <span className="text-xs text-purple-400/70 font-mono">
            {(isValidOverride ? overrideTrimmed : creator.walletAddress).slice(0, 8)}…
            {(isValidOverride ? overrideTrimmed : creator.walletAddress).slice(-8)}
          </span>
        </div>
      </div>

      {/* ── Privacy info toggle ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-purple-400 self-start transition-colors px-1"
        >
          <Info className="w-3.5 h-3.5" />
          {showInfo ? "Hide Privacy Details" : "How does this protect me?"}
        </button>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-purple-950/20 border border-purple-900/30 rounded-2xl p-5 text-xs text-gray-400 flex flex-col gap-4 leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-900/50 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-purple-400">1</div>
                  <p><span className="text-purple-300 font-bold">The Deposit:</span> Your SOL goes to a vault PDA (intermediary). On-chain, it only looks like you interacted with PrivyBag.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-900/50 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-purple-400">2</div>
                  <p><span className="text-purple-300 font-bold">The Shield:</span> The link between you and the creator is broken. No single transaction connects your two addresses directly.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Submit ────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <TxStatus status={status} error={error} txSignature={depositSig} />

        {!connected ? (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
            <WalletMultiButton
              style={{
                width: "100%", justifyContent: "center", background: "#0f172a",
                borderRadius: "1rem", fontSize: "0.875rem", height: "3.5rem",
                fontWeight: "700", border: "1px solid rgba(139, 92, 246, 0.2)",
                position: "relative"
              }}
            />
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!isValidAmount || isProcessing || !tipDestination}
            className={clsx(
              "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all relative overflow-hidden",
              isProcessing
                ? "bg-gray-800 text-gray-500 cursor-wait"
                : isValidAmount && tipDestination
                  ? "bg-purple-600 text-white shadow-xl shadow-purple-600/20 active:bg-purple-700"
                  : "bg-gray-900 text-gray-700 cursor-not-allowed"
            )}
          >
            {isProcessing && (
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
            )}
            <Shield className={clsx("w-4 h-4", isProcessing ? "animate-pulse" : "")} />
            <span className="relative z-10 uppercase tracking-widest font-black">
              {isProcessing
                ? status === "transferring"
                  ? "Shielding Transfer…"
                  : "Updating Vault…"
                : `Send ${isValidAmount ? amountSol : "—"} SOL Privately`}
            </span>
          </motion.button>
        )}
      </div>

      <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-700 mt-2">
        Zero Trace · ZK Compressed · Non-Custodial
      </p>
    </motion.form>
  );
}
