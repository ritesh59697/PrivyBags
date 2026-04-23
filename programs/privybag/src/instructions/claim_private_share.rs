// programs/privybag/src/instructions/claim_private_share.rs

use anchor_lang::prelude::*;
use crate::errors::PrivyBagError;
use crate::state::CreatorVault;

#[derive(Accounts)]
pub struct ClaimPrivateShare<'info> {
    #[account(
        mut,
        seeds = [CreatorVault::SEED_PREFIX, creator.key().as_ref()],
        bump = vault.bump,
        constraint = vault.creator == creator.key() @ PrivyBagError::Unauthorized,
    )]
    pub vault: Account<'info, CreatorVault>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimPrivateShare>, claim_amount_lamports: u64) -> Result<()> {
    require!(claim_amount_lamports > 0, PrivyBagError::ZeroClaimAmount);

    let vault = &mut ctx.accounts.vault;
    let unclaimed = vault.unclaimed_lamports();
    require!(claim_amount_lamports <= unclaimed, PrivyBagError::InsufficientBalance);

    vault.total_claimed_lamports = vault
        .total_claimed_lamports
        .saturating_add(claim_amount_lamports);

    msg!(
        "PrivyBag: claimed {} lamports | creator: {} | remaining: {}",
        claim_amount_lamports,
        vault.creator,
        vault.unclaimed_lamports()
    );
    Ok(())
}
