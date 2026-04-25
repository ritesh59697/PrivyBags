// src/lib/light/connection.ts
//
// Light Protocol V2 RPC singleton.
// All three createRpc() args point to Helius — they route internally to
// the Photon indexer (compression queries) and prover (proof generation).
//
// ── PRODUCTION FIX ──────────────────────────────────────────────────────────
// The module-level `_rpc` singleton was being created once during Next.js SSR
// (server-side) with NO WebSocket transport. On Vercel, when the module is
// cached between cold starts, the dead server-side instance got returned to
// the browser — causing all RPC calls after a page load or claim to silently
// fail. Fix: only cache the instance in the browser. Server-side always gets
// a fresh (non-cached) instance.

import { createRpc, featureFlags, VERSION, type Rpc } from "@lightprotocol/stateless.js";

// Enable V2 mode at module load — must happen before any Light Protocol calls.
(featureFlags as any).version = VERSION.V2;

// Browser-only singleton. Never assigned on the server.
let _rpc: Rpc | null = null;

function makeRpc(): Rpc {
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL;
  if (!endpoint) {
    throw new Error(
      "[PrivyBag] NEXT_PUBLIC_RPC_URL is not set. Add it to Vercel environment variables."
    );
  }
  return createRpc(endpoint, endpoint, endpoint);
}

export function getLightRpc(): Rpc {
  // On the server (SSR / Edge functions) — never cache. Always fresh.
  // This prevents a dead server-side socket from being reused on the client.
  if (typeof window === "undefined") {
    return makeRpc();
  }

  // In the browser — cache the singleton so we reuse the same WebSocket.
  if (!_rpc) {
    _rpc = makeRpc();
  }
  return _rpc;
}

// Call this to force a fresh connection (e.g. after a network error).
export function resetLightRpc(): void {
  _rpc = null;
}
