# PrivyBag 🛡️✨

**Private, Shielded Tipping for Bags Creators on Solana**

PrivyBag is a premium, privacy-preserving tipping layer built specifically for the **Bugs Hackathon**. It solves the core transparency problem of public blockchains: when a fan tips a creator, their wallets are permanently linked on-chain. PrivyBag breaks this link using **Vault PDA Indirection** and **Light Protocol ZK-Compression**.

---

## 🚀 Key Highlights

*   🛡️ **Zero-Trace Tipping**: Breaks the direct on-chain link between Fans and Creators.
*   ⚡ **Real-Time Reactivity**: High-performance WebSocket subscriptions (`onAccountChange`) for instant tip notifications.
*   🎭 **Premium UX**: Modern, animated interface built with Next.js 15, Framer Motion, and boutique Tailwind styling.
*   🌑 **ZK-Shielding**: Leverages Light Protocol V2 to hide transaction amounts and sender identities.
*   📊 **Creator Dashboard**: Private aggregate statistics and secure, multi-stage claiming flow.

---

## 🛠 How It Works

PrivyBag implements a unique **Hybrid Privacy Model** to balance transparency for creators and anonymity for fans.

### 1. The Fan Side (Shielding)
When you send a tip, your SOL is routed through a **CreatorVault PDA**. This program-owned account acts as a "privacy buffer." On-chain, your wallet is seen interacting with the PrivyBag program—not the creator's personal wallet.

### 2. The Creator Side (Aggregation)
Creators see their tips land in their private dashboard in real-time. Tips are stored as **ZK-Compressed accounts** (via Light Protocol) or native SOL in a program-managed vault.

### 3. The Claim Flow (Decoupling)
To receive funds, the creator "Claims" their tips. This triggers a separate transaction that moves funds from the Vault PDA to their wallet. Since the Fan-to-Vault and Vault-to-Creator transactions happen at different times, the on-chain link is effectively broken.

---

## 🏗 Architecture

```text
privybag/
├── app/                  Next.js 15 Frontend (Tailwind + Framer Motion)
│   ├── src/lib/light/    Light Protocol SDK & ZK-Shielded logic
│   ├── src/lib/anchor/   Anchor Client for Vault PDA interactions
│   └── src/hooks/        Custom hooks for Private Tip & Dashboard flows
└── programs/privybag/    Solana Anchor Program (Rust)
    ├── state/            CreatorVault PDA definition
    └── instructions/     Deposit, Record, and Secure Withdraw logic
```

---

## ✨ Features

### 🔍 Smart Search
Seamlessly lookup any Bags creator by their **Twitter/X handle**. Our integration resolves handle-to-wallet mapping instantly, allowing you to tip creators even if you only know their social profile.

### 🔔 Real-Time Notifications
Never miss a tip. Our `NotificationProvider` uses Solana WebSockets to alert creators the millisecond a tip hits their vault, complete with delta calculation (showing the exact new tip amount).

### 🎨 Boutique Design
A hand-crafted UI featuring:
- **Animated Splash Screen**: A premium reveal experience on first load.
- **Micro-interactions**: Spring-based animations and smooth transitions for every click.
- **Glassmorphism**: A sleek, dark-mode aesthetic with vibrant purple and green accents.

---

## 💻 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS
- **Smart Contract**: Solana Anchor (Rust)
- **Privacy**: Light Protocol V2 (ZK-Compression)
- **Wallets**: @solana/wallet-adapter (Phantom, Solflare, etc.)

---

## 🚀 Getting Started

To run the project locally:

1. **Clone and Install**:
   ```bash
   pnpm install
   cd app && pnpm install
   ```

2. **Environment Setup**:
   Create `app/.env.local` and add:
   ```bash
   NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
   BAGS_API_KEY=your_bags_api_key
   ```

3. **Run Dev Server**:
   ```bash
   cd app && pnpm dev
   ```

---

## 📋 Submission Info

- **Hackathon**: Bags Hackathon (2026)
- **Status**: Production-Ready Prototype
- **Devnet Program ID**: `HFe9PvFPXnsKqGYK75kVcBke98fP94FWD3S1ffVrKFAi`
- **RPC Support**: Optimized for high-frequency WebSocket updates.

---

## ⚖️ Implementation Note

PrivyBag is optimized for **Solana Devnet**. It demonstrates a scalable path toward financial privacy on Solana, moving away from simple public transfers toward a world where your support for creators doesn't have to be your public transaction history.

---

*Built with ❤️ for the Bags Community.*
