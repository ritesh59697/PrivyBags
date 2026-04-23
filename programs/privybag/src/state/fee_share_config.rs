// programs/privybag/src/state/fee_share_config.rs

use anchor_lang::prelude::*;

pub const MAX_RECIPIENTS: usize = 5;

/// Seeds: [b"privybag_fee_config", creator_pubkey]
#[account]
#[derive(InitSpace)]
pub struct FeeShareConfig {
    pub creator: Pubkey,

    #[max_len(MAX_RECIPIENTS)]
    pub recipients: Vec<Pubkey>,

    /// Basis points per recipient (1 bps = 0.01%). Must sum ≤ 10_000.
    #[max_len(MAX_RECIPIENTS)]
    pub shares_bps: Vec<u16>,

    pub is_active: bool,
    pub updated_at: i64,
    pub bump: u8,
}

impl FeeShareConfig {
    pub const SEED_PREFIX: &'static [u8] = b"privybag_fee_config";

    pub fn is_valid(&self) -> bool {
        if self.recipients.len() != self.shares_bps.len() {
            return false;
        }
        if self.recipients.len() > MAX_RECIPIENTS {
            return false;
        }
        let total: u32 = self.shares_bps.iter().map(|&b| b as u32).sum();
        total <= 10_000
    }

    pub fn creator_share_bps(&self) -> u16 {
        let distributed: u32 = self.shares_bps.iter().map(|&b| b as u32).sum();
        (10_000u32.saturating_sub(distributed)) as u16
    }
}
