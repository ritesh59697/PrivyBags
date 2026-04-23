// src/app/api/bags/creator/route.ts
//
// Server-side proxy — resolves a Bags username to a wallet address.
//
// ── WHY TWO CALLS ────────────────────────────────────────────────────────────
//
// The Bags fee-share/wallet/v2 endpoint returns different wallets depending
// on the `provider` query param:
//
//   provider=twitter  → Bags CUSTODIAL wallet (D5L3...cmPa)
//                        This is the wallet Bags uses for fee distribution.
//                        Creator must go to bags.fm/settings/wallets to move
//                        funds from here to their Phantom.
//
//   provider=solana   → Creator's CONNECTED external wallet (GmH2...C8t6)
//                        This is present only if the creator linked their
//                        Phantom/Backpack on bags.fm. username param = wallet address.
//
// PrivyBag wants to tip the creator's connected wallet so they can claim
// directly in Phantom without going through Bags.
//
// STRATEGY:
//   1. Call twitter provider → get custodial wallet + platformData (display name, avatar)
//   2. Check if the custodial wallet itself has a linked connected wallet by
//      calling the twitter lookup WITHOUT provider to get all linked accounts.
//      (Bags doesn't expose a "get all linked wallets for username" endpoint,
//       so we return the custodial wallet and flag it clearly in walletType.)
//
// RESULT: We always return the custodial wallet as walletAddress, with
//   walletType: "custodial" so the UI can show a helpful note.
//   If the user typed a raw wallet address, walletType is "direct".
//
// ── HOW THE CREATOR GETS THEIR PHANTOM WALLET TIPPED ─────────────────────────
//
//   Option A (recommended): Creator pastes their Phantom wallet address into
//     the PrivyBag search box. walletType becomes "direct" and tips go straight there.
//
//   Option B: Tips go to Bags custodial wallet. Creator withdraws to Phantom
//     via bags.fm/settings/wallets → Switch Wallet (free, instant).

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

  // ── Step 1: Twitter provider → custodial wallet + profile data ──────────────
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

  // ── Step 2: Attempt to find a connected external wallet ─────────────────────
  // Bags supports provider=solana where username = the wallet address.
  // There is no "get all wallets for twitter username" endpoint.
  // We cannot discover the connected Phantom wallet from just a twitter handle.
  //
  // Resolution: return the custodial wallet with walletType: "custodial".
  // The UI will show a note: "This is @username's Bags wallet.
  // To tip their Phantom directly, ask them to paste their wallet address."

  const creator = {
    slug: pd.username ?? username,
    walletAddress: custodialWallet,
    displayName: pd.display_name ?? pd.username ?? username,
    avatarUrl: pd.avatar_url ?? undefined,
    walletType: "custodial" as const,
  };

  return NextResponse.json(creator, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
  });
}
