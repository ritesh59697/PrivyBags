// src/lib/light/connection.ts
//
// Light Protocol V2 RPC singleton.
// All three createRpc() args point to Helius — they route internally to
// the Photon indexer (compression queries) and prover (proof generation).

import { createRpc, featureFlags, VERSION, type Rpc } from "@lightprotocol/stateless.js";

// Enable V2 mode at module load — must happen before any Light Protocol calls.
// V2 uses batched Merkle trees (up to 70% cheaper CUs vs V1).
(featureFlags as any).version = VERSION.V2;

let _rpc: Rpc | null = null;

export function getLightRpc(): Rpc {
  if (_rpc) return _rpc;

  const endpoint = process.env.NEXT_PUBLIC_RPC_URL;
  const compressionEndpoint = process.env.NEXT_PUBLIC_COMPRESSION_RPC_URL || endpoint;

  if (!endpoint) {
    console.error("[PrivyBag] NEXT_PUBLIC_RPC_URL is missing!");
    throw new Error(
      "[PrivyBag] NEXT_PUBLIC_RPC_URL is not set. Add your Helius key to .env.local"
    );
  }

  console.log("[PrivyBag:rpc] Connecting to:", endpoint.slice(0, 30) + "...");
  
  // createRpc(solanaRpcUrl, photonIndexerUrl, proverUrl)
  // For Helius, the indexer and prover are usually accessible on the same main endpoint,
  // but we allow a specialized compressionEndpoint for custom setups.
  _rpc = createRpc(endpoint, compressionEndpoint, compressionEndpoint);
  return _rpc;
}
