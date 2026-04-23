"use client";
// src/components/dashboard/FeeShareConfig.tsx

import { useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Plus, Trash2, Shield, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { getLightRpc } from "@/lib/light/connection";
import { signAndSendTx } from "@/lib/light/shielded-transfer";
import { PRIVYBAG_PROGRAM_ID } from "@/lib/constants";

interface Recipient {
  address: string;
  bps: number;
}

interface FeeShareConfigProps {
  creatorPublicKey: PublicKey;
}

export function FeeShareConfig({ creatorPublicKey }: FeeShareConfigProps) {
  const { signTransaction } = useWallet();

  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: "", bps: 2000 },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Sync guard — `saving` may still be false on a second click before React re-renders. */
  const saveInFlightRef = useRef(false);

  const totalBps = recipients.reduce((sum, r) => sum + r.bps, 0);
  const remaining = 10_000 - totalBps;
  const isValid =
    recipients.length > 0 &&
    recipients.length <= 5 &&
    recipients.every((r) => r.address.length > 0) &&
    totalBps <= 10_000;

  function addRecipient() {
    if (recipients.length >= 5) return;
    setRecipients([...recipients, { address: "", bps: 1000 }]);
  }

  function removeRecipient(i: number) {
    setRecipients(recipients.filter((_, idx) => idx !== i));
    // Clear saved state whenever config changes
    setSaved(false);
  }

  function updateRecipient(i: number, field: keyof Recipient, value: string | number) {
    const updated = [...recipients];
    (updated[i] as any)[field] = value;
    setRecipients(updated);
    // Clear saved state on any edit to prevent stale state
    setSaved(false);
  }

  async function handleSave() {
    if (!isValid || !signTransaction || saving || saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    try {
      // Validate all addresses are valid pubkeys before building the tx
      for (const r of recipients) {
        try {
          new PublicKey(r.address);
        } catch {
          setError(`Invalid wallet address: ${r.address.slice(0, 20)}...`);
          return;
        }
      }

      setSaving(true);
      setSaved(false);
      setError(null);

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("privybag_fee_config"), creatorPublicKey.toBuffer()],
        PRIVYBAG_PROGRAM_ID
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("privybag_vault"), creatorPublicKey.toBuffer()],
        PRIVYBAG_PROGRAM_ID
      );

      // Anchor discriminator for configure_private_fee_share
      const CONFIGURE_FEE_DISCRIMINATOR = Buffer.from([
        27, 237, 254, 55, 83, 45, 146, 141,
      ]);

      const recipientKeys = recipients.map((r) => new PublicKey(r.address));
      const recipientsLen = Buffer.alloc(4);
      recipientsLen.writeUInt32LE(recipientKeys.length, 0);
      const recipientBytes = Buffer.concat(recipientKeys.map((k) => k.toBuffer()));

      const sharesLen = Buffer.alloc(4);
      sharesLen.writeUInt32LE(recipients.length, 0);
      const sharesBytes = Buffer.concat(
        recipients.map((r) => {
          const buf = Buffer.alloc(2);
          buf.writeUInt16LE(r.bps, 0);
          return buf;
        })
      );

      const ix = new TransactionInstruction({
        programId: PRIVYBAG_PROGRAM_ID,
        keys: [
          { pubkey: configPda, isSigner: false, isWritable: true },
          { pubkey: vaultPda, isSigner: false, isWritable: false },
          { pubkey: creatorPublicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          CONFIGURE_FEE_DISCRIMINATOR,
          recipientsLen,
          recipientBytes,
          sharesLen,
          sharesBytes,
        ]),
      });

      const rpc = getLightRpc();
      const tx = new Transaction().add(ix);
      const wallet = { publicKey: creatorPublicKey, signTransaction };

      await signAndSendTx(rpc, tx, wallet);
      setSaved(true);
      // Auto-clear the "Saved" state after 4s
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      const raw =
        typeof err?.message === "string"
          ? err.message
          : typeof err?.toString === "function"
            ? err.toString()
            : String(err);
      // Solana: same signed tx sent twice → "already been processed" (not "form unchanged")
      if (
        raw.includes("already been processed") ||
        raw.includes("AlreadyProcessed")
      ) {
        setError(
          "That transaction was already submitted. Wait for confirmation, avoid double-clicking Save, then try again if needed."
        );
      } else {
        setError(raw || "Save failed");
      }
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Private Fee Sharing</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Distribute a portion of tips to collaborators — shielded
          </p>
        </div>
        <Shield className="w-5 h-5 text-purple-400" />
      </div>

      {/* Allocation bar */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Allocated: {(totalBps / 100).toFixed(1)}%</span>
          <span className={remaining < 0 ? "text-red-400" : "text-gray-500"}>
            {remaining < 0
              ? `Over by ${(-remaining / 100).toFixed(1)}%`
              : `You keep: ${(remaining / 100).toFixed(1)}%`}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              totalBps > 10_000 ? "bg-red-500" : "bg-purple-500"
            )}
            style={{ width: `${Math.min((totalBps / 10_000) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Recipients */}
      <div className="flex flex-col gap-3">
        {recipients.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3"
          >
            <input
              type="text"
              placeholder="Recipient wallet address"
              value={r.address}
              onChange={(e) => updateRecipient(i, "address", e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600
                         focus:outline-none min-w-0 font-mono"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <input
                type="number"
                min={1}
                max={10000}
                value={r.bps}
                onChange={(e) =>
                  updateRecipient(i, "bps", parseInt(e.target.value) || 0)
                }
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1
                           text-sm text-white text-center focus:outline-none
                           focus:border-purple-600"
              />
              <span className="text-xs text-gray-500">bps</span>
              <span className="text-xs text-gray-600">
                ({(r.bps / 100).toFixed(1)}%)
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeRecipient(i)}
              className="text-gray-600 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {recipients.length < 5 && (
        <button
          type="button"
          onClick={addRecipient}
          className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300
                     transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Add recipient
          <span className="text-gray-600">({recipients.length}/5)</span>
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-800 rounded-xl p-3.5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Save button — disabled while saving to prevent double-submit */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!isValid || saving}
        className={clsx(
          "w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
          saved
            ? "bg-green-900 text-green-300 border border-green-700 cursor-default"
            : isValid && !saving
              ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
        )}
      >
        <Shield className="w-4 h-4" />
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Fee Share Rules"}
      </button>

      <p className="text-xs text-gray-600 text-center">
        Rules stored on-chain · distributions are shielded via Light Protocol
      </p>
    </div>
  );
}
