// src/hooks/useBagsCreator.ts
//
// React hooks that wire fetchBagsCreator / searchBagsCreators to component state.
//
// Key change: BagsCreator now includes walletType: "custodial" | "connected" | "direct"
// Components should read walletType and show a note when it's "custodial"
// telling the creator they need to connect their Phantom on bags.fm.

import { useState, useEffect } from "react";
import {
  fetchBagsCreator,
  searchBagsCreators,
  isWalletAddress,
  type BagsCreator,
} from "@/lib/bags/client";

// ─── useBagsCreator ───────────────────────────────────────────────────────────

export function useBagsCreator(slugOrAddress: string | null) {
  const [creator, setCreator] = useState<BagsCreator | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugOrAddress) {
      setCreator(null);
      setError(null);
      return;
    }

    // Direct wallet address — no API call
    if (isWalletAddress(slugOrAddress)) {
      setCreator({
        slug: slugOrAddress,
        walletAddress: slugOrAddress,
        displayName: `${slugOrAddress.slice(0, 6)}…${slugOrAddress.slice(-4)}`,
        walletType: "direct",
      });
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchBagsCreator(slugOrAddress)
      .then((result) => {
        if (cancelled) return;
        setCreator(result);
        if (!result) setError(`@${slugOrAddress} is not registered on Bags`);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Lookup failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slugOrAddress]);

  return { creator, loading, error };
}

// ─── useBagsSearch ────────────────────────────────────────────────────────────

export type SearchState = "idle" | "searching" | "found" | "not_found" | "error";

export function useBagsSearch(query: string) {
  const [results, setResults] = useState<BagsCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<SearchState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clean = query.replace(/^@/, "").trim();

    if (!clean) {
      setResults([]);
      setState("idle");
      setError(null);
      return;
    }

    // Wallet address typed directly — resolve immediately, no debounce needed
    if (isWalletAddress(clean)) {
      const synthetic: BagsCreator = {
        slug: clean,
        walletAddress: clean,
        displayName: `${clean.slice(0, 6)}…${clean.slice(-4)}`,
        walletType: "direct",
      };
      setResults([synthetic]);
      setState("found");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setState("searching");
    setError(null);

    // Debounce 400ms
    const timer = setTimeout(async () => {
      try {
        const found = await searchBagsCreators(clean);
        if (cancelled) return;
        setResults(found);
        setState(found.length > 0 ? "found" : "not_found");
      } catch (err: any) {
        if (cancelled) return;
        setResults([]);
        setState("error");
        setError(err?.message ?? "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading, state, error };
}
