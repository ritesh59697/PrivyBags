# PrivyBag 🛡️

> **Privacy-first tipping for Bags.fm creators on Solana**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://privy-bags.vercel.app)
[![Built for Bags Hackathon](https://img.shields.io/badge/Bags%20Hackathon-2026-green?style=for-the-badge)](https://bags.fm)
[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-purple?style=for-the-badge&logo=solana)](https://solana.com)
[![Demo Video](https://img.shields.io/badge/Demo%20Video-Twitter%2FX-1DA1F2?style=for-the-badge&logo=x)](https://x.com/Ritesh5969/status/2048794473505960403?s=20)

**[🔗 Live Demo](https://privy-bags.vercel.app)** | **[📂 GitHub](https://github.com/ritesh59697/PrivyBags)** | **[🎬 Demo Video](https://x.com/Ritesh5969/status/2048794473505960403?s=20)**

---

## 🎬 Demo Video

> Watch PrivyBag in action — searching by Bags username, sending a private tip, and claiming compressed SOL from the creator dashboard.

**[▶️ Watch on Twitter/X →](https://x.com/Ritesh5969/status/2048794473505960403?s=20)**

## What is PrivyBag?

PrivyBag lets fans tip their favourite Bags.fm creators **without creating a direct on-chain link** between the fan's wallet and the creator's wallet.

On a standard Solana transfer, any blockchain explorer instantly reveals:
`Fan Wallet → Creator Wallet` — permanently, publicly.

PrivyBag breaks that link using a **Vault PDA Indirection** model:

```
Fan Wallet ──► Vault PDA ──► Creator Wallet
     TX 1                        TX 2
```

- **TX 1** (Fan): `Fan → Vault PDA` — the creator's wallet address never appears.
- **TX 2** (Creator): `Vault PDA → Creator` — the fan's wallet address never appears.
- No single transaction on-chain connects fan to creator.

---

## Key Features

- 🔒 **Vault PDA privacy** — tips route through a program-controlled intermediary, breaking the fan ↔ creator graph
- 🎯 **Bags.fm integration** — search creators by their Twitter/X handle, resolved via the official Bags fee-share API
- 📊 **Creator dashboard** — view tip stats, compressed balance, vault balance, and claim funds
- 🔔 **Real-time notifications** — creators get notified when new tips arrive (recipient-only, never fires for senders)
- 💸 **One-click claim** — creators claim tips directly to their wallet from the dashboard
- 🔑 **No signup required** — fans connect any Solana wallet (Phantom, Solflare) and tip instantly

---

## Privacy Model

| Information | Visible on Explorer? | Why |
|---|---|---|
| A tip occurred | ✅ Yes | Transfer to Vault PDA is public |
| Fan's wallet address | ✅ Yes | They signed TX 1 |
| Exact tip amount | ✅ Yes | SOL transfer amount is public |
| **Fan ↔ Creator link** | ❌ **No** | No single TX shows both — vault is the intermediary |
| Creator's aggregate earnings | ✅ Yes | Stored in Vault PDA |
| Individual sender identities | ❌ **No** | Creator only sees total balance, not who sent what |

---

## Architecture

```
privybag/
├── app/                            Next.js 15 frontend (App Router)
│   └── src/
│       ├── app/
│       │   ├── page.tsx            Landing page + creator search
│       │   ├── tip/[slug]/         Private tip form
│       │   └── dashboard/          Creator dashboard
│       ├── components/
│       │   ├── tip/PrivateTipForm.tsx
│       │   └── dashboard/TipStats.tsx
│       ├── hooks/
│       │   ├── usePrivateTip.ts    Tip flow wired to wallet adapter
│       │   └── useCreatorDashboard.ts
│       └── lib/
│           ├── light/shielded-transfer.ts   Core vault + transfer logic
│           ├── anchor/privybag-client.ts    Anchor program client
│           └── bags/client.ts              Bags API integration
│
└── programs/privybag/              Anchor smart contract (Rust)
    └── src/
        ├── lib.rs                  Program entrypoint
        ├── instructions/           deposit, withdraw, initialize_vault
        └── state/                  CreatorVault PDA definition
```

---

## How It Works — Step by Step

### For Fans
1. Visit PrivyBag and search for a Bags.fm creator by their Twitter handle
2. Connect your Phantom or Solflare wallet
3. Select a tip amount and click **Send Privately**
4. Sign one transaction — SOL goes to the creator's Vault PDA (not their wallet directly)
5. Done. The explorer shows `Your Wallet → Vault PDA`, not `Your Wallet → Creator`

### For Creators
1. Go to `/dashboard` and connect the wallet matching your Bags.fm profile
2. See your total tips, compressed balance, and vault balance broken out separately
3. Click **Claim** to decompress any Light Protocol balance into native SOL
4. Click **Withdraw** to move native SOL from the Vault PDA to your wallet
5. Each withdrawal shows `Vault PDA → Your Wallet` on the explorer

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Smart Contract | Anchor 0.31.1, Rust, Solana System Program |
| Wallets | Phantom, Solflare via `@solana/wallet-adapter-react` |
| Creator Data | Bags.fm Public API v2 (`fee-share/wallet/v2`) |
| Privacy Layer | Vault PDA indirection (on-chain program) |
| Deployment | Vercel (frontend), Solana Devnet (program) |

---

## Deployed Contracts

| Network | Program ID |
|---|---|
| Solana Devnet | `HF9PvFPXnsKqGYK75kVcBke98fP94FWD3S1ffVrKFA1` |

---

## Local Development

### Prerequisites

```bash
rustup update stable
solana --version      # >= 1.18.x
anchor --version      # >= 0.31.1
node --version        # >= 20.x
pnpm --version        # >= 9.x
```

### Setup

```bash
# 1. Clone
git clone https://github.com/ritesh59697/PrivyBags
cd PrivyBags

# 2. Configure environment
cp .env.example app/.env.local
# Add your keys to app/.env.local (see Environment Variables below)

# 3. Install frontend dependencies
cd app && pnpm install

# 4. Run locally
pnpm dev
# → http://localhost:3000
```

### Environment Variables

```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PRIVYBAG_PROGRAM_ID=HF9PvFPXnsKqGYK75kVcBke98fP94FWD3S1ffVrKFA1
NEXT_PUBLIC_SOLANA_NETWORK=devnet
BAGS_API_KEY=your_bags_api_key_here
NEXT_PUBLIC_BAGS_API_URL=https://public-api-v2.bags.fm
```

### Deploy Anchor Program (optional — already on Devnet)

```bash
cd ..   # repo root
anchor build
anchor deploy --provider.cluster devnet
```

---

## Hackathon Submission

**Event**: The Bags Hackathon — June 1, 2026

**Category**: Privacy / Creator Tools

**What makes this unique**:
- Addresses a real pain point — onchain transparency kills creator privacy
- Works with the existing Bags ecosystem (username resolution, fee-share wallets)
- No ZK cryptography required — privacy through architectural indirection, keeping it simple and auditable
- Fully functional end-to-end on Solana Devnet with a live UI

---

*Built with ❤️ for the Bags Hackathon by [@ritesh5969](https://x.com/Ritesh5969)*