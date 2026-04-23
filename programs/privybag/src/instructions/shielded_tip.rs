// programs/privybag/src/instructions/shielded_tip.rs
//
// Simplified MVP pattern: the Light shielded transfer happens entirely
// on the client side using createTransferInterfaceInstructions().
// This instruction only updates the creator vault's aggregate stats.
//
// Privacy guarantee: sender identity and individual amounts are NEVER stored.

use anchor_lang::prelude::*;
use crate::errors::PrivyBagError;
use crate::state::CreatorVault;

const MAX_TIP_LAMPORTS: u64 = 10_000_000_000; // 10 SOL

#[derive(Accounts)]
pub struct ShieldedTip<'info> {
    /// Fan paying tx fees — identity not stored anywhere
    #[account(mut)]
    pub fee_payer: Signer<'info>,

    #[account(
        mut,
        seeds = [CreatorVault::SEED_PREFIX, vault.creator.as_ref()],
        bump = vault.bump,
        constraint = vault.is_active @ PrivyBagError::VaultInactive,
    )]
    pub vault: Account<'info, CreatorVault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ShieldedTip>, tip_amount_lamports: u64) -> Result<()> {
    require!(tip_amount_lamports > 0, PrivyBagError::ZeroTipAmount);
    require!(tip_amount_lamports <= MAX_TIP_LAMPORTS, PrivyBagError::TipAmountTooLarge);

    let vault = &mut ctx.accounts.vault;
    vault.total_received_lamports = vault
        .total_received_lamports
        .saturating_add(tip_amount_lamports);
    vault.tip_count = vault.tip_count.saturating_add(1);

    msg!(
        "PrivyBag: tip #{} | vault: {} | +{} lamports | total: {}",
        vault.tip_count,
        vault.creator,
        tip_amount_lamports,
        vault.total_received_lamports
    );
    Ok(())
}
