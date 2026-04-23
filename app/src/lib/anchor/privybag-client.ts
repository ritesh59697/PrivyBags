// src/lib/anchor/privybag-client.ts
//
// Anchor client for the PrivyBag program (deposit + withdraw).
//
// Privacy architecture:
//   TX 1  Fan → Vault PDA        (deposit — fan signs, creator NOT needed)
//   TX 2  Vault PDA → Creator    (withdraw — only creator can sign)
//   No single transaction links Fan ↔ Creator.

import {
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  type TransactionSignature,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";

import idlJson from "./idl/privybag.json";
import { getLightRpc } from "@/lib/light/connection";
import {
  deriveCreatorVaultAddress,
  signAndSendTx,
  type WalletAdapterSigner,
} from "@/lib/light/shielded-transfer";
import { PRIVYBAG_PROGRAM_ID } from "@/lib/constants";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toAnchorWallet(wallet: WalletAdapterSigner) {
  return {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: <T extends Transaction>(txs: T[]) =>
      Promise.all(txs.map((tx) => wallet.signTransaction(tx))),
  };
}

function getProgram(wallet: WalletAdapterSigner) {
  const connection = getLightRpc();
  const provider = new AnchorProvider(
    connection as never,
    toAnchorWallet(wallet) as never,
    { commitment: "confirmed" }
  );
  return new Program(idlJson as Idl, provider);
}

// ── deposit ───────────────────────────────────────────────────────────────────
//
// Fan calls this to tip a creator.
// The vault PDA is created automatically on first deposit (init_if_needed).
//
// Usage:
//   await depositToVault(fanWallet, creatorPublicKey, BigInt(50_000_000)); // 0.05 SOL

export async function depositToVault(
  fanWallet: WalletAdapterSigner,
  creatorPublicKey: PublicKey,
  tipAmountLamports: bigint
): Promise<TransactionSignature> {
  const isProgramDeployed =
    PRIVYBAG_PROGRAM_ID.toBase58() !== "11111111111111111111111111111111";

  if (!isProgramDeployed) {
    throw new Error("PrivyBag program not deployed. Run `anchor deploy` first.");
  }

  const connection = getLightRpc();
  const vaultPda = deriveCreatorVaultAddress(creatorPublicKey, PRIVYBAG_PROGRAM_ID);
  const program = getProgram(fanWallet);

  console.log(
    "[PrivyBag:deposit] Fan → Vault PDA",
    "\n  fan:    ", fanWallet.publicKey.toBase58(),
    "\n  vault:  ", vaultPda.toBase58(),
    "\n  amount: ", tipAmountLamports.toString(), "lamports"
  );

  const ix = await program.methods
    .deposit(creatorPublicKey, new BN(tipAmountLamports.toString()))
    .accounts({
      fan:           fanWallet.publicKey,
      vault:         vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 80_000 }),
    ix
  );

  const sig = await signAndSendTx(connection, tx, fanWallet);
  console.log("[PrivyBag:deposit] ✅ Confirmed:", sig);
  console.log(`[PrivyBag:deposit] Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  return sig;
}

// ── withdraw ──────────────────────────────────────────────────────────────────
//
// Creator calls this to pull SOL from their vault to their own wallet.
// Only the creator registered in the vault (vault.creator) can withdraw.
//
// Usage:
//   await withdrawFromVault(creatorWallet, BigInt(50_000_000)); // withdraw 0.05 SOL

export async function withdrawFromVault(
  creatorWallet: WalletAdapterSigner,
  amountLamports?: bigint
): Promise<TransactionSignature | null> {
  const isProgramDeployed =
    PRIVYBAG_PROGRAM_ID.toBase58() !== "11111111111111111111111111111111";

  if (!isProgramDeployed) {
    throw new Error("PrivyBag program not deployed. Run `anchor deploy` first.");
  }

  const connection = getLightRpc();
  const vaultPda = deriveCreatorVaultAddress(creatorWallet.publicKey, PRIVYBAG_PROGRAM_ID);
  
  // Check vault balance
  const vaultInfo = await connection.getAccountInfo(vaultPda);
  if (!vaultInfo) {
    console.warn("[PrivyBag] Vault PDA has no on-chain account yet (no tips received).");
    return null;
  }

  const vaultBalance = BigInt(vaultInfo.lamports);
  const rentExempt = BigInt(await connection.getMinimumBalanceForRentExemption(vaultInfo.data.length));
  const available = vaultBalance > rentExempt ? vaultBalance - rentExempt : BigInt(0);
  const withdrawAmount = amountLamports ?? available;

  if (withdrawAmount === BigInt(0)) {
    console.warn("[PrivyBag] No withdrawable balance (vault below rent-exempt minimum).");
    return null;
  }

  const program = getProgram(creatorWallet);

  console.log(
    "[PrivyBag:withdraw] Vault PDA → Creator",
    "\n  vault:   ", vaultPda.toBase58(),
    "\n  creator: ", creatorWallet.publicKey.toBase58(),
    "\n  amount:  ", withdrawAmount.toString(), "lamports"
  );

  const ix = await program.methods
    .withdraw(new BN(withdrawAmount.toString()))
    .accounts({
      vault:         vaultPda,
      creator:       creatorWallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 60_000 }),
    ix
  );

  const sig = await signAndSendTx(connection, tx, creatorWallet);
  console.log("[PrivyBag:withdraw] ✅ Confirmed:", sig);
  console.log(`[PrivyBag:withdraw] Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  return sig;
}

// ── recordTipInVault (legacy — points to depositToVault) ─────────────────────
//
// Kept for backward compat with usePrivateTip.ts / runFullTipFlow.
// In the new flow, sendPrivateTip() in shielded-transfer.ts calls
// depositToVault() directly, so this is a no-op.

export async function recordTipInVault(
  _wallet: WalletAdapterSigner,
  _creatorPublicKey: PublicKey,
  _tipAmountLamports: bigint
): Promise<TransactionSignature | null> {
  // depositToVault is now called inside sendPrivateTip (shielded-transfer.ts).
  // This function is kept so existing callers don't break.
  console.log("[PrivyBag] recordTipInVault: deposit already handled by sendPrivateTip — skipping.");
  return null;
}
