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
  if (!endpoint) {
    throw new Error(
      "[PrivyBag] NEXT_PUBLIC_RPC_URL is not set. Add your Helius key to .env.local"
    );
  }

  // createRpc(solanaRpcUrl, photonIndexerUrl, proverUrl)
  _rpc = createRpc(endpoint, endpoint, endpoint);
  return _rpc;
}
