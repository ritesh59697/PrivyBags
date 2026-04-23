// src/app/api/bags/search/route.ts
// Server-side creator search route.
// Tries username lookup via multiple social providers.
// NOTE: getTopTokensByLifetimeFees() requires a paid API key — removed.

import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection } from "@solana/web3.js";

function getSdk() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  return new BagsSDK("", connection, "confirmed");
}

// bags.fm users often connect GitHub — try it first, then Twitter, then others.
// NOTE: getTopTokensByLifetimeFees() requires a paid API key — removed.
const PROVIDERS = ["github", "twitter", "tiktok", "kick"] as const;
type Provider = typeof PROVIDERS[number];

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.replace(/^\$/, "").replace(/^@/, "").trim();

  if (!query) {
    return NextResponse.json([]);
  }

  const seen = new Set<string>();
  const results: object[] = [];

  function add(c: {
    slug: string;
    walletAddress: string;
    displayName: string;
    avatarUrl?: string | null;
    description?: string;
  }) {
    if (!seen.has(c.walletAddress)) {
      seen.add(c.walletAddress);
      results.push(c);
    }
  }

  // Try the username with each social provider
  const sdk = getSdk();
  for (const provider of PROVIDERS) {
    if (results.length >= 5) break;
    try {
      const result = await sdk.state.getLaunchWalletV2(query, provider as Provider);
      if (result?.wallet) {
        const pd = result.platformData;
        add({
          slug: pd?.username ?? query,
          walletAddress: result.wallet.toBase58(),
          displayName: pd?.display_name ?? pd?.username ?? query,
          avatarUrl: pd?.avatar_url ?? null,
        });
      }
    } catch {
      // Not found on this provider — try next
    }
  }

  // Also try lowercase variant if no result yet
  if (results.length === 0 && query !== query.toLowerCase()) {
    for (const provider of PROVIDERS) {
      try {
        const result = await sdk.state.getLaunchWalletV2(query.toLowerCase(), provider as Provider);
        if (result?.wallet) {
          const pd = result.platformData;
          add({
            slug: pd?.username ?? query,
            walletAddress: result.wallet.toBase58(),
            displayName: pd?.display_name ?? pd?.username ?? query,
            avatarUrl: pd?.avatar_url ?? null,
          });
          break;
        }
      } catch {
        // continue
      }
    }
  }

  return NextResponse.json(results);
}
