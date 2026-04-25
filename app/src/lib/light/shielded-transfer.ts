// src/lib/light/shielded-transfer.ts
//
// PrivyBag — Light Protocol V2 Shielded Transfer
// ────────────────────────────────────────────────
// WHAT WAS WRONG (summary at bottom of file):
//
// This file focuses on ONE thing: a working shielded transfer using
// createTransferInterfaceInstructions from @lightprotocol/compressed-token/unified.
//
// Wrapping is included because it is required before the first shielded transfer —
// the sender needs a compressed wSOL balance. loadAta() handles it without the
// createWrapInstruction bug (native wSOL mint in token program slot → 111...1 error).
//
// Call order:
//   1. wrapSolForTipping(wallet, lamports)     — once, to get compressed balance
//   2. shieldedTransfer(wallet, recipient, amount) — the actual private transfer
//
// Or call runShieldedTipFlow() which handles both automatically.

import {
  featureFlags,
  VERSION,
  type Rpc,
} from "@lightprotocol/stateless.js";
import bs58 from "bs58";

import {
  // IMPORTANT: use the base package so we can pass { wrap: false }.
  // The /unified path hardcodes wrap:true and would re-add ATA/syncNative
  // instructions we already sent in wrapSolForTipping(), causing
  // "duplicate instruction" errors.
  createTransferInterfaceInstructions,
} from "@lightprotocol/compressed-token";

import {
  // IMPORTANT: use the /unified path for these two helpers.
  // The unified createLoadAtaInstructions loads SPL wSOL → Light compressed ATA
  // (unified=true). The base version only loads cold compressed accounts and
  // would return 0 batches, leaving the sender with no compressed balance.
  getAssociatedTokenAddressInterface,
  createLoadAtaInstructions,
  getAtaInterface,
} from "@lightprotocol/compressed-token/unified";

import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";

import {
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  type TransactionInstruction,
  type TransactionSignature,
} from "@solana/web3.js";

import { getLightRpc } from "./connection";
import {
  PRIVYBAG_PROGRAM_ID,
  WSOL_MINT,
  MIN_TIP_LAMPORTS,
  MAX_TIP_LAMPORTS,
} from "@/lib/constants";

// ── V2 feature flag — set ONCE at module load, before any Light call ──────────
(featureFlags as any).version = VERSION.V2;
console.log("[PrivyBag] Light Protocol V2 active:", (featureFlags as any).version);

// Compute unit budgets
const TRANSFER_CU = 1_400_000; // ZK proof verification needs high CU
const SETUP_CU = 400_000;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal wallet adapter signer.
 * In a React component:
 *   const { publicKey, signTransaction } = useWallet();
 *   const wallet: WalletAdapterSigner = { publicKey: publicKey!, signTransaction: signTransaction! };
 */
export interface WalletAdapterSigner {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
}

// Kept for interface compatibility with usePrivateTip.ts
export interface FullTipFlowParams {
  wallet: WalletAdapterSigner;
  creatorPublicKey: PublicKey;
  mint?: PublicKey;
  tipAmount: bigint;
  wrapFirst?: boolean;
}

export interface FullTipFlowResult {
  success: boolean;
  wrapSignature?: TransactionSignature;
  transferSignatures: TransactionSignature[];
  vaultUpdateSignature?: TransactionSignature | null;
  recipientAta: PublicKey;
  depositSignature: TransactionSignature;
  vaultAddress: string;
}

export type TipFlowPhase = "wrap" | "shielded" | "vault" | "depositing" | "recording";

export class AlreadyProcessedError extends Error {
  signature?: string;
  constructor(msg: string, signature?: string) {
    super(msg);
    this.name = "AlreadyProcessedError";
    this.signature = signature;
  }
}

// ─── signAndSendTx ────────────────────────────────────────────────────────────

/**
 * Wallet-adapter-compatible transaction sender.
 * Uses wallet.signTransaction() — no Keypair needed.
 */
export async function signAndSendTx(
  rpc: Rpc,
  tx: Transaction,
  wallet: WalletAdapterSigner
): Promise<TransactionSignature> {
  const { blockhash, lastValidBlockHeight } =
    await rpc.getLatestBlockhash("confirmed");

  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;

  console.log("[PrivyBag:tx] Requesting wallet signature...");
  const signed = await wallet.signTransaction(tx);
  const rawTx = signed.serialize();

  console.log("[PrivyBag:tx] Broadcasting...");
  let sig: string;
  try {
    sig = await rpc.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.includes("already been processed")) {
      console.warn("[PrivyBag:tx] Already processed — previous attempt confirmed.");
      // Extract signature from the signed transaction
      const signature = bs58.encode(signed.signature!);
      throw new AlreadyProcessedError(msg, signature);
    }
    throw err;
  }

  console.log("[PrivyBag:tx] Confirming:", sig);
  await rpc.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  console.log("[PrivyBag:tx] ✅ Confirmed:", sig);
  return sig;
}

// ─── deriveCreatorVaultAddress ────────────────────────────────────────────────

export function deriveCreatorVaultAddress(
  creatorPublicKey: PublicKey,
  programId: PublicKey = PRIVYBAG_PROGRAM_ID
): PublicKey {
  const effectiveProgramId =
    programId.toBase58() === "11111111111111111111111111111111"
      ? new PublicKey("Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo")
      : programId;

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("privybag_vault"), creatorPublicKey.toBuffer()],
    effectiveProgramId
  );
  return vaultPda;
}

// ─── wrapSolForTipping ────────────────────────────────────────────────────────

/**
 * Converts native SOL → compressed Light Token (wSOL).
 * Must be called before shieldedTransfer() if no compressed balance exists.
 *
 * Two-step process:
 *   TX 1: Create SPL wSOL ATA (if missing) + transfer SOL + syncNative
 *         → standard SPL token account now holds wSOL
 *   TX 2: loadAta() → Light reads the SPL ATA and loads it into the Light ATA
 *         → compressed wSOL balance is now available for shielded transfer
 *
 * WHY loadAta() and NOT createWrapInstruction():
 *   createWrapInstruction has a bug with native wSOL (So111...112):
 *   it places the native mint address in the token program account slot,
 *   causing "Invalid token program ID 111...1" on-chain.
 *   loadAta() reads the existing SPL ATA balance directly — no bug.
 */
export async function wrapSolForTipping(
  wallet: WalletAdapterSigner,
  lamports: bigint,
  mint: PublicKey = WSOL_MINT
): Promise<TransactionSignature> {
  const rpc = getLightRpc();

  console.log(
    "\n[PrivyBag:wrap] ─── WRAPPING SOL → COMPRESSED wSOL",
    "\n[PrivyBag:wrap]   wallet:", wallet.publicKey.toBase58(),
    "\n[PrivyBag:wrap]   amount:", lamports.toString(), "lamports",
    `\n[PrivyBag:wrap]   (~${(Number(lamports) / LAMPORTS_PER_SOL).toFixed(5)} SOL)`
  );

  const splAta = getAssociatedTokenAddressSync(mint, wallet.publicKey, false, TOKEN_PROGRAM_ID);
  const lightAta = getAssociatedTokenAddressInterface(mint, wallet.publicKey);

  console.log("[PrivyBag:wrap] SPL ATA:  ", splAta.toBase58());
  console.log("[PrivyBag:wrap] Light ATA:", lightAta.toBase58());

  // ── TX 1: Create + fund the SPL wSOL ATA ──────────────────────────────────
  const setupIxs: TransactionInstruction[] = [];
  const splAtaInfo = await rpc.getAccountInfo(splAta);

  if (!splAtaInfo) {
    console.log("[PrivyBag:wrap] SPL ATA missing — adding createATA instruction");
    setupIxs.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, splAta, wallet.publicKey, mint, TOKEN_PROGRAM_ID
      )
    );
  } else {
    console.log("[PrivyBag:wrap] SPL ATA exists ✓");
  }

  setupIxs.push(SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: splAta,
    lamports,
  }));
  setupIxs.push(createSyncNativeInstruction(splAta, TOKEN_PROGRAM_ID));

  console.log(`[PrivyBag:wrap] TX 1: sending (${setupIxs.length} instructions)...`);

  let setupSig: string;
  try {
    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: SETUP_CU }),
      ...setupIxs
    );
    setupSig = await signAndSendTx(rpc, tx, wallet);
    console.log("[PrivyBag:wrap] TX 1 confirmed — SPL ATA funded:", setupSig);
  } catch (err: any) {
    if (err.name === "AlreadyProcessedError") {
      console.warn("[PrivyBag:wrap] TX 1 already processed — ATA already funded ✓");
      setupSig = err.signature || "already-processed";
    } else {
      throw err;
    }
  }

  // Brief delay before loadAta reads the SPL ATA
  await delay(2000);

  // ── TX 2: createLoadAtaInstructions() — load SPL wSOL into Light compressed ATA ─────────────
  console.log("\n[PrivyBag:wrap] TX 2: loadAta() — loading SPL balance into Light ATA...");
  console.log("[PrivyBag:wrap]   lightAta:", lightAta.toBase58());

  let loadSig: string | null = null;
  const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";

  try {
    const batches = await createLoadAtaInstructions(
      rpc,
      lightAta,
      wallet.publicKey,
      mint,
      wallet.publicKey
    );

    if (batches.length > 0) {
      for (let i = 0; i < batches.length; i++) {
        // Filter out any ComputeBudget instructions the SDK may have already
        // included — Solana allows only ONE setComputeUnitLimit per transaction.
        // Adding a second one causes "duplicate instruction (2)" simulation errors.
        const userIxs = batches[i].filter(
          ix => ix.programId.toBase58() !== COMPUTE_BUDGET_PROGRAM_ID
        );

        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: SETUP_CU }),
          ...userIxs
        );
        loadSig = await signAndSendTx(rpc, tx, wallet);
        console.log(`[PrivyBag:wrap] ✅ loadAta batch ${i + 1} confirmed:`, loadSig);
      }
      console.log("[PrivyBag:wrap] Explorer: https://explorer.solana.com/tx/" + loadSig + "?cluster=devnet");
    } else {
      console.log("[PrivyBag:wrap] loadAta returned 0 batches — compressed balance already present ✓");
    }
  } catch (err: any) {
    if (err.name === "AlreadyProcessedError") {
      console.warn("[PrivyBag:wrap] TX 2 already processed — balance already loaded ✓");
      loadSig = err.signature || "already-processed";
    } else {
      throw new Error(`loadAta() failed: ${err.message}`);
    }
  }

  console.log("[PrivyBag:wrap] ✅ Wrap complete. Waiting 6s for Photon indexer...");
  await delay(6000);

  return loadSig ?? setupSig;
}

// ─── shieldedTransfer ────────────────────────────────────────────────────────

/**
 * Performs a Light Protocol V2 shielded transfer.
 *
 * Uses createTransferInterfaceInstructions() — official v0.23 signature:
 *   createTransferInterfaceInstructions(rpc, payer, mint, amount, owner, recipient)
 *   → returns TransactionInstruction[][] (one tx per inner array)
 *
 * Internally this:
 *   1. Fetches the sender's compressed token accounts from the Photon indexer
 *   2. Generates a V2 ZK validity proof (batch Merkle tree)
 *   3. Builds the shielded transfer instruction with proof embedded
 *
 * A successful tx on Explorer shows:
 *   cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m  ← Compressed Token Program
 *   compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq  ← Account Compression
 *   SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7  ← Light System Program
 *
 * @param wallet          Sender's wallet adapter
 * @param recipient       Recipient's wallet public key
 * @param amount          Amount in base units (lamports for wSOL)
 * @param mint            Token mint (default: wSOL)
 */
export async function shieldedTransfer(
  wallet: WalletAdapterSigner,
  recipient: PublicKey,
  amount: bigint,
  mint: PublicKey = WSOL_MINT
): Promise<TransactionSignature[]> {
  const rpc = getLightRpc();

  console.log(
    "\n[PrivyBag:transfer] ─── LIGHT V2 SHIELDED TRANSFER",
    "\n[PrivyBag:transfer]   sender:   ", wallet.publicKey.toBase58(),
    "\n[PrivyBag:transfer]   recipient:", recipient.toBase58(),
    "\n[PrivyBag:transfer]   mint:     ", mint.toBase58(),
    "\n[PrivyBag:transfer]   amount:   ", amount.toString(), "lamports",
    `\n[PrivyBag:transfer]   (~${(Number(amount) / LAMPORTS_PER_SOL).toFixed(5)} SOL)`
  );

  // ── Build shielded transfer instructions ───────────────────────────────────
  // Official v0.23 signature:
  //   createTransferInterfaceInstructions(rpc, payer, mint, amount, owner, recipient)
  //
  // Arguments:
  //   rpc       = Light V2 RPC (Helius)
  //   payer     = fee payer (sender's wallet pubkey)
  //   mint      = token mint
  //   amount    = transfer amount in base units
  //   owner     = owner of the compressed balance (sender's wallet pubkey)
  //   recipient = recipient's wallet pubkey (Light derives their ATA internally)

  console.log("[PrivyBag:transfer] Calling createTransferInterfaceInstructions()...");
  console.log("[PrivyBag:transfer] (fetches Photon compressed accounts + generates V2 ZK proof)");
  console.log("[PrivyBag:transfer] NOTE: wrap=false — wrapping already done in wrapSolForTipping()");

  let batches: TransactionInstruction[][];
  try {
    batches = await createTransferInterfaceInstructions(
      rpc,
      wallet.publicKey, // payer
      mint,             // token mint
      amount,           // amount in base units
      wallet.publicKey, // owner of compressed balance (sender)
      recipient,        // recipient wallet pubkey
      9,                // decimals for wSOL
      { wrap: false }   // CRITICAL: do NOT add wrap instructions — already done separately
    );
  } catch (err: any) {
    const m = String(err?.message ?? err);
    console.error("[PrivyBag:transfer] createTransferInterfaceInstructions FAILED:", m);

    if (
      m.toLowerCase().includes("balance") ||
      m.toLowerCase().includes("insufficient") ||
      m.toLowerCase().includes("not found") ||
      m.toLowerCase().includes("no compressed") ||
      m.toLowerCase().includes("account")
    ) {
      throw new Error(
        `No compressed balance found for this wallet.\n\n` +
        `→ Call wrapSolForTipping() first to create a compressed wSOL balance.\n\n` +
        `Details: ${m}`
      );
    }
    throw new Error(`Shielded transfer failed: ${m}`);
  }

  const batchCount = batches?.length ?? 0;
  console.log(`[PrivyBag:transfer] Got ${batchCount} instruction batch(es) from Light SDK`);

  if (batchCount === 0) {
    throw new Error(
      `Light SDK returned 0 batches — no compressed balance found.\n\n` +
      `→ Call wrapSolForTipping() first.\n` +
      `Also check: (1) Photon indexer synced, (2) correct RPC in .env.local`
    );
  }

  // ── Sign and send each batch using sliceLast pattern ──────────────────────
  // The SDK may return [load1, load2, ..., transferBatch].
  // Load batches must be sent first; the last batch is the actual transfer.
  // We apply the same ComputeBudget filter here: strip any CB the SDK already
  // included, then prepend our own single CB instruction.
  const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
  const signatures: TransactionSignature[] = [];

  for (let i = 0; i < batches.length; i++) {
    const rawBatch = batches[i];
    const isLastBatch = i === batches.length - 1;

    console.log(
      `\n[PrivyBag:transfer] Sending batch ${i + 1}/${batches.length} (${rawBatch.length} instructions) [${isLastBatch ? "TRANSFER" : "LOAD"}]`
    );

    // Filter any ComputeBudget the SDK already included — Solana only allows ONE
    const ixBatch = rawBatch.filter(
      ix => ix.programId.toBase58() !== COMPUTE_BUDGET_PROGRAM_ID
    );
    const cuLimit = isLastBatch ? TRANSFER_CU : SETUP_CU;

    ixBatch.forEach((ix, j) => {
      console.log(
        `[PrivyBag:transfer]   ix[${j}] program: ${ix.programId.toBase58()}`,
        `(${ix.keys.length} accounts)`
      );
    });

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ...ixBatch
    );

    const sig = await signAndSendTx(rpc, tx, wallet);
    signatures.push(sig);

    console.log(`[PrivyBag:transfer] ✅ Batch ${i + 1} confirmed:`, sig);
    console.log(`[PrivyBag:transfer] Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    if (isLastBatch) {
      console.log(`[PrivyBag:transfer] ↑ Should show cTokenmW... + compr6C... + SySTEM1...`);
    }
  }

  console.log(
    "\n[PrivyBag:transfer] ✅ SHIELDED TRANSFER COMPLETE",
    "\n[PrivyBag:transfer]   signatures:", signatures,
    "\n[PrivyBag:transfer]   privacy: sender wallet NOT directly linked to recipient on-chain"
  );

  return signatures;
}

// ─── runShieldedTipFlow ───────────────────────────────────────────────────────

/**
 * One function to call for a complete shielded tip:
 *   Step 0 (optional): wrapSolForTipping() — create compressed wSOL balance
 *   Step 1:            shieldedTransfer()  — Light V2 shielded transfer
 *
 * @param wallet          Sender's wallet adapter
 * @param recipient       Creator/recipient wallet pubkey
 * @param amount          Amount in lamports
 * @param wrapFirst       Set true on first use (no compressed balance yet)
 */
export async function runShieldedTipFlow(
  wallet: WalletAdapterSigner,
  recipient: PublicKey,
  amount: bigint,
  wrapFirst = false
): Promise<{ wrapSig?: string; transferSigs: TransactionSignature[] }> {
  if (amount < MIN_TIP_LAMPORTS) {
    throw new Error(`Tip too small — minimum is 0.001 SOL`);
  }
  if (amount > MAX_TIP_LAMPORTS) {
    throw new Error(`Tip too large — maximum is 10 SOL`);
  }

  console.log(
    "\n[PrivyBag] ══════════════════════════════════════════",
    "\n[PrivyBag] SHIELDED TIP FLOW",
    "\n[PrivyBag]   sender:    ", wallet.publicKey.toBase58(),
    "\n[PrivyBag]   recipient: ", recipient.toBase58(),
    "\n[PrivyBag]   amount:    ", amount.toString(), "lamports",
    "\n[PrivyBag]   wrapFirst: ", wrapFirst,
    "\n[PrivyBag] ══════════════════════════════════════════"
  );

  let wrapSig: string | undefined;

  // Step 0 — auto-detect if wrapping is needed, or respect wrapFirst flag
  const rpc = getLightRpc();
  let needsWrap = wrapFirst;

  if (!needsWrap) {
    // Check if the sender already has a compressed wSOL balance
    try {
      const lightAta = getAssociatedTokenAddressInterface(WSOL_MINT, wallet.publicKey);
      const ataInfo = await getAtaInterface(rpc, lightAta, wallet.publicKey, WSOL_MINT);
      const balance = BigInt(ataInfo?.parsed?.amount?.toString() ?? "0");
      console.log("[PrivyBag] Existing compressed wSOL balance:", balance.toString(), "lamports");
      if (balance < amount) {
        console.log("[PrivyBag] Balance insufficient — will wrap first.");
        needsWrap = true;
      } else {
        console.log("[PrivyBag] Compressed balance OK — skipping wrap.");
      }
    } catch {
      console.log("[PrivyBag] Could not read compressed balance — will wrap first.");
      needsWrap = true;
    }
  }

  // Step 0 — wrap if needed (completely separate transaction)
  if (needsWrap) {
    console.log("\n[PrivyBag] Step 0: Wrapping SOL (standalone TX)...");
    wrapSig = await wrapSolForTipping(wallet, amount + BigInt(10_000));
    console.log("[PrivyBag] Wrapping complete ✔");
    // wrapSolForTipping already waits 6s for Photon indexer to sync
  }

  // Step 1 — shielded transfer ONLY (no wrap instructions inside)
  console.log("\n[PrivyBag] Step 1: Starting shielded transfer...");
  const transferSigs = await shieldedTransfer(wallet, recipient, amount);
  console.log("[PrivyBag] Transfer success ✔", transferSigs);

  console.log(
    "\n[PrivyBag] ══ FLOW COMPLETE",
    "\n[PrivyBag]   wrap sig:      ", wrapSig ?? "skipped",
    "\n[PrivyBag]   transfer sigs: ", transferSigs
  );

  return { wrapSig, transferSigs };
}

// ─── runFullTipFlow — adapter for existing usePrivateTip.ts ──────────────────

/**
 * Adapter kept for backward compatibility with usePrivateTip.ts.
 * Delegates to runShieldedTipFlow() and returns a FullTipFlowResult shape.
 */
export async function runFullTipFlow(
  params: FullTipFlowParams,
  recordFn: (
    wallet: WalletAdapterSigner,
    creator: PublicKey,
    amount: bigint
  ) => Promise<TransactionSignature | null>,
  onProgress?: (phase: TipFlowPhase) => void
): Promise<FullTipFlowResult> {
  const { wallet, creatorPublicKey, tipAmount, wrapFirst = false } = params;

  if (wrapFirst) onProgress?.("wrap");
  else onProgress?.("shielded");

  const { wrapSig, transferSigs } = await runShieldedTipFlow(
    wallet,
    creatorPublicKey,
    tipAmount,
    wrapFirst
  );

  onProgress?.("vault");
  let vaultUpdateSignature: TransactionSignature | null = null;
  try {
    vaultUpdateSignature = await recordFn(wallet, creatorPublicKey, tipAmount);
  } catch (err: any) {
    console.warn("[PrivyBag] Stats update failed (tip was still sent):", err.message);
  }

  const recipientAta = getAssociatedTokenAddressInterface(WSOL_MINT, creatorPublicKey);

  return {
    success: true,
    wrapSignature: wrapSig,
    transferSignatures: transferSigs,
    vaultUpdateSignature,
    recipientAta,
    depositSignature: transferSigs[transferSigs.length - 1] ?? "",
    vaultAddress: recipientAta.toBase58(),
  };
}

// ─── wrapSolForTipping re-export (no-op alias kept for compat) ────────────────
// Already defined above — no duplicate needed.

// ═════════════════════════════════════════════════════════════════════════════
// WHAT WAS WRONG — root cause summary
// ═════════════════════════════════════════════════════════════════════════════
//
// 1. WRONG ARG ORDER in createTransferInterfaceInstructions (multiple versions ago):
//    Old: (rpc, payer, sourceAta, mint, recipient, owner, amount)
//    Correct: (rpc, payer, mint, amount, owner, recipient)
//    Passing sourceAta as 3rd arg → type error on mint, 0 batches returned.
//
// 2. createWrapInstruction BUG with native wSOL:
//    For native wSOL (mint = So111...112), the instruction builder places the
//    native mint address in the token program account slot.
//    The Light compressed token program validates that slot and sees 111...1
//    → "Invalid token program ID" error.
//    FIX: use loadAta() instead. It reads the existing SPL ATA balance directly,
//    bypasses the native mint code path entirely.
//
// 3. V2 feature flag not set early enough:
//    (featureFlags as any).version = VERSION.V2 must be set at module load,
//    before any Light call — not inside a function that might run after imports.
//
// 4. Overcomplexity: the file had vault pattern + Light pattern mixed together,
//    causing circular imports (sendPrivateTip imported from privybag-client
//    which imports from shielded-transfer).
//    FIX: this file is now self-contained. No anchor imports.
// ═════════════════════════════════════════════════════════════════════════════