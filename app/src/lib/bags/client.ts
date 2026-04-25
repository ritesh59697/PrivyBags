// src/lib/bags/client.ts
//
// Bags creator data helpers — CLIENT SIDE.
//
// ── WALLET RESOLUTION STRATEGY ──────────────────────────────────────────────
//
// The Bags fee-share/wallet/v2 endpoint ALWAYS returns the creator's Bags
// custodial wallet (the green "Bags Wallets" entry in bags.fm/settings/wallets).
// This is by design — it is the wallet Bags uses for fee distribution.
//
// For PrivyBag tipping we want the creator's CONNECTED wallet (their Phantom).
// The Bags API does not expose connected wallets publicly for any username.
//
// SOLUTION — two-step resolution:
//   Step 1: Call fee-share/wallet/v2?provider=twitter&username=<handle>
//           → returns Bags custodial wallet (D5L3...cmPa)
//           → also returns platformData: display_name, avatar_url for the card
//   Step 2: Also call fee-share/wallet/v2?provider=solana&username=<walletAddress>
//           If the creator has linked their Phantom on bags.fm, Bags stores it
//           under provider=solana. We return that if present.
//
// If neither resolves to a Phantom wallet, we return the Bags custodial wallet
// and show a note in the UI telling the creator to connect their Phantom.
//
// DIRECT WALLET INPUT: if the search query IS a base58 wallet address,
// we skip the API entirely and return a synthetic creator immediately.

export interface BagsCreator {
  /** Twitter/X handle (lowercase, no @) */
  slug: string;
  /** The wallet address tips will be sent to (Phantom if connected, custodial otherwise) */
  walletAddress: string;
  /**
   * The Bags custodial wallet — always present when resolved via username.
   * May equal walletAddress when walletType is "custodial".
   */
  custodialWallet?: string;
  /** Display name from platformData.display_name */
  displayName: string;
  avatarUrl?: string;
  tokenMint?: string;
  description?: string;
  /**
   * "connected"  — walletAddress is the creator's linked Phantom/external wallet
   * "custodial"  — walletAddress is the Bags custodial wallet (fan can override)
   * "direct"     — user typed the wallet address directly, no Bags lookup
   */
  walletType: "connected" | "custodial" | "direct";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the string looks like a Solana base58 wallet address. */
export function isWalletAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());
}

// ─── fetchBagsCreator ─────────────────────────────────────────────────────────

/**
 * Resolves a Bags Twitter/X username to a creator object.
 * Proxied through /api/bags/creator to avoid CORS.
 *
 * Resolution order:
 *   1. If input is a wallet address → synthetic "direct" creator (no API call)
 *   2. Call /api/bags/creator?username=<handle>&strategy=full
 *      The server-side route tries twitter provider first, then attempts
 *      to resolve a connected wallet if available.
 *   3. Returns null if username is not on Bags at all.
 */
export async function fetchBagsCreator(
  username: string
): Promise<BagsCreator | null> {
  const clean = username.replace(/^@/, "").trim();
  if (!clean) return null;

  // Direct wallet address — skip API
  if (isWalletAddress(clean)) {
    return {
      slug: clean,
      walletAddress: clean,
      displayName: `${clean.slice(0, 6)}…${clean.slice(-4)}`,
      walletType: "direct",
    };
  }

  try {
    const res = await fetch(
      `/api/bags/creator?username=${encodeURIComponent(clean)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn("[PrivyBag] fetchBagsCreator HTTP", res.status, "for", clean);
      return null;
    }
    const data = await res.json();
    return data ?? null;
  } catch (err) {
    console.warn("[PrivyBag] fetchBagsCreator network error:", err);
    return null;
  }
}

/** Alias — same as fetchBagsCreator */
export async function getCreatorWalletByUsername(
  username: string
): Promise<BagsCreator | null> {
  return fetchBagsCreator(username);
}

/**
 * Single-result "search" — exact username match only.
 * Returns [] if not found. Never throws.
 */
export async function searchBagsCreators(query: string): Promise<BagsCreator[]> {
  const clean = query.replace(/^@/, "").trim();
  if (!clean) return [];
  const creator = await fetchBagsCreator(clean);
  return creator ? [creator] : [];
}
