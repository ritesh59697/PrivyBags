// src/app/api/bags/creator/route.ts
//
// Server-side proxy — resolves a Bags username to a creator profile.
//
// ── WALLET RESOLUTION (3-layer) ──────────────────────────────────────────────
//
// Layer 1 (client-handled): Direct wallet address → skip API, walletType: "direct"
//
// Layer 2 (this route, Step 1):
//   provider=twitter → custodial wallet (D5L3...cmPa) + platformData (avatar, name)
//   We always get this for profile display purposes.
//
// Layer 3 (this route, Step 2):
//   We attempt to discover a linked Phantom by calling:
//   provider=solana & username=<custodial_wallet>
//   Bags sometimes stores this cross-reference when a creator links their Phantom
//   to their custodial wallet. If found → walletType: "connected", use Phantom.
//   If not found → walletType: "custodial", UI will offer override input.
//
// ── WHY THE OVERRIDE UI EXISTS ───────────────────────────────────────────────
//
// Most creators have NOT explicitly linked their Phantom to Bags. In that case
// we get walletType: "custodial" and show a prominent UI note on the tip page
// asking the fan to paste the creator's actual Phantom address. This redirects
// the tip directly to the creator's self-custody wallet.

import { NextRequest, NextResponse } from "next/server";

const BAGS_BASE = "https://public-api-v2.bags.fm";
const BAGS_API_KEY = process.env.BAGS_API_KEY ?? "";

async function bagsFetch(provider: string, username: string): Promise<any | null> {
  const url = new URL(`${BAGS_BASE}/api/v1/token-launch/fee-share/wallet/v2`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("username", username);

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": BAGS_API_KEY },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  if (!json?.success || !json?.response?.wallet) return null;
  return json.response;
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  if (!BAGS_API_KEY) {
    console.error("[PrivyBag:api] BAGS_API_KEY not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  console.log(`[PrivyBag:api] Resolving username: @${username}`);

  // ── Layer 2: Twitter provider → custodial wallet + profile data ─────────────
  let twitterResult: any = null;
  try {
    twitterResult = await bagsFetch("twitter", username);
  } catch (err) {
    console.error("[PrivyBag:api] Bags twitter lookup failed:", err);
    return NextResponse.json({ error: "Bags API unreachable" }, { status: 502 });
  }

  if (!twitterResult) {
    console.log(`[PrivyBag:api] @${username} not found on Bags`);
    return NextResponse.json(null, { status: 404 });
  }

  const pd = twitterResult.platformData ?? {};
  const custodialWallet = twitterResult.wallet as string;

  console.log(`[PrivyBag:api] @${username} → custodial: ${custodialWallet.slice(0, 8)}…`);

  // ── Layer 3: Attempt to discover a linked Phantom wallet ────────────────────
  // Bags cross-references custodial wallets with linked external wallets.
  // Call provider=solana with the custodial wallet address as username.
  // If the creator linked their Phantom on bags.fm → we get their Phantom back.
  let connectedWallet: string | null = null;
  try {
    const solanaResult = await bagsFetch("solana", custodialWallet);
    if (solanaResult?.wallet && solanaResult.wallet !== custodialWallet) {
      connectedWallet = solanaResult.wallet as string;
      console.log(`[PrivyBag:api] @${username} → connected Phantom: ${connectedWallet.slice(0, 8)}…`);
    }
  } catch {
    // Non-fatal — fall back to custodial
  }

  const walletAddress = connectedWallet ?? custodialWallet;
  const walletType = connectedWallet ? "connected" : "custodial";

  const creator = {
    slug: pd.username ?? username,
    walletAddress,
    custodialWallet,          // always include so UI can show it separately
    displayName: pd.display_name ?? pd.username ?? username,
    avatarUrl: pd.avatar_url ?? undefined,
    walletType,
  };

  console.log(`[PrivyBag:api] @${username} resolved → ${walletType} (${walletAddress.slice(0, 8)}…)`);

  return NextResponse.json(creator, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
  });
}
