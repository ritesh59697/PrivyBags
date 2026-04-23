// programs/privybag/src/state/creator_vault.rs
//
// CreatorVault — PDA that tracks a creator's aggregate tip stats.
//
// Privacy design:
//   Individual tip amounts and sender addresses are NEVER stored here.
//   Only aggregate totals are recorded. The actual shielded SOL balances
//   live in Light Protocol compressed accounts off this PDA.

use anchor_lang::prelude::*;

/// Seeds: [b"privybag_vault", creator_pubkey]
#[account]
#[derive(InitSpace)]
pub struct CreatorVault {
    /// The Bags creator's wallet (vault owner)
    pub creator: Pubkey,

    /// Creator's Bags token mint — cross-referenced with Bags SDK
    pub bags_token_mint: Pubkey,

    /// Aggregate lamports received (sum only — no per-tip breakdown)
    pub total_received_lamports: u64,

    /// Total private tips received (count only — no sender info)
    pub tip_count: u64,

    /// Lamports claimed so far
    pub total_claimed_lamports: u64,

    /// Whether vault is open for tips
    pub is_active: bool,

    /// Unix timestamp of vault creation
    pub created_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl CreatorVault {
    pub const SEED_PREFIX: &'static [u8] = b"privybag_vault";

    pub fn unclaimed_lamports(&self) -> u64 {
        self.total_received_lamports
            .saturating_sub(self.total_claimed_lamports)
    }
}
