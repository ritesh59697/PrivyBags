// src/lib/constants.ts

import { PublicKey } from "@solana/web3.js";

export const PRIVYBAG_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PRIVYBAG_PROGRAM_ID ??
    "11111111111111111111111111111111"
);

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ??
  "devnet";

export const MIN_TIP_LAMPORTS = BigInt(1_000_000);       // 0.001 SOL
export const MAX_TIP_LAMPORTS = BigInt(10_000_000_000);  // 10 SOL
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Devnet wSOL mint — used for wrapping native SOL into a Light Token
export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

// Devnet USDC mint — alternative tip token
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export const BAGS_API_URL =
  process.env.NEXT_PUBLIC_BAGS_API_URL ?? "https://api.bags.fm";

// Anchor discriminator for shielded_tip instruction.
// Replace with real bytes after `anchor build`:
//   node -e "const c=require('crypto');
//     console.log([...c.createHash('sha256').update('global:shielded_tip').digest()].slice(0,8))"
export const SHIELDED_TIP_DISCRIMINATOR = Buffer.from([
  246, 116, 51, 122, 92, 145, 149, 233,
]);
