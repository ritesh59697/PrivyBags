# PrivyBag 🛡️

**Private Tipping for Bags Creators on Solana**

PrivyBag is a privacy-preserving tipping layer built for the Bags ecosystem. It solves a fundamental transparency issue on public ledgers: when a fan tips a creator directly, their wallet addresses are forever linked on-chain. PrivyBag breaks this link using **Vault PDA Indirection** and **Light Protocol V2 ZK-Compression**.

---

## 🚀 Overview

PrivyBag allows fans to support their favorite Bags creators without exposing the direct relationship between their wallets. By utilizing program-derived addresses (PDAs) as intermediate buffers and ZK-shielded transfers, we ensure that:
1. **Fans** can tip privately without their transaction history pointing directly to a creator's main wallet.
2. **Creators** can manage and claim their aggregate tips securely through a dedicated dashboard.

[Live Demo](https://your-deployed-link.vercel.app) | [Video Walkthrough](not uploaded yet)

---

## ✨ Features

- **Bags Integration**: Seamlessly lookup any Bags creator by their Twitter handle or wallet address.
- **Privacy-First Architecture**: Tips are routed through a secure Vault PDA, decoupling the sender from the recipient.
- **ZK-Shielded Flow**: Leverages Light Protocol V2 to wrap SOL into compressed tokens for shielded transfers.
- **Creator Dashboard**: A private interface for creators to view aggregate tip statistics, receive notifications, and claim funds.
- **Native Experience**: Fully compatible with standard Solana browser wallets (Phantom, Solflare, etc.).

---

## 🛠 How It Works

PrivyBag implements a two-layer privacy model:

1. **The Vault Layer (Anchor)**:
   Instead of a direct transfer, tips are sent to a **CreatorVault PDA**. This program-owned account acts as a "shielding buffer." The fan interacts with the program, and the creator later interacts with the program to withdraw. No single transaction on-chain shows `Fan Wallet → Creator Wallet`.

2. **The Shielded Layer (Light Protocol)**:
   For enhanced privacy, the tip can be "compressed" into a ZK-account. This uses Light Protocol's ZK-compression to ensure the specific amount and balance are hidden from public indexers, providing a higher level of financial privacy for the creator.

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

## 💻 Tech Stack

- **Smart Contract**: Anchor Framework (Rust)
- **Privacy Layer**: Light Protocol V2 (ZK-Compression)
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Solana Integration**: @solana/web3.js, @solana/wallet-adapter
- **Data Source**: Bags Public API (v2)

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

- **Current Status**: Functional prototype deployed on **Solana Devnet**.
- **Devnet Program ID**: `HFe9PvFPXnsKqGYK75kVcBke98fP94FWD3S1ffVrKFAi`
- **Hackathon**: The Bags Hackathon (2026)

---

## ⚖️ Implementation Note

PrivyBag is currently optimized for **Solana Devnet**. The implementation utilizes a hybrid model of Vault PDAs for transparency in aggregate stats and Light Protocol for shielded balance management. Future iterations will focus on fully private cross-program invocations (CPI) and mainnet-ready fee-share integrations.

---

*Built with ❤️ for the Bags Community.*
