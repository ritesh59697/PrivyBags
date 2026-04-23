// programs/privybag/src/instructions/configure_fee_share.rs

use anchor_lang::prelude::*;
use crate::errors::PrivyBagError;
use crate::state::{CreatorVault, FeeShareConfig, MAX_RECIPIENTS};

#[derive(Accounts)]
pub struct ConfigurePrivateFeeShare<'info> {
    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + FeeShareConfig::INIT_SPACE,
        seeds = [FeeShareConfig::SEED_PREFIX, creator.key().as_ref()],
        bump,
    )]
    pub fee_config: Account<'info, FeeShareConfig>,

    #[account(
        seeds = [CreatorVault::SEED_PREFIX, creator.key().as_ref()],
        bump = vault.bump,
        constraint = vault.creator == creator.key() @ PrivyBagError::Unauthorized,
    )]
    pub vault: Account<'info, CreatorVault>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ConfigurePrivateFeeShare>,
    recipients: Vec<Pubkey>,
    shares_bps: Vec<u16>,
) -> Result<()> {
    require!(recipients.len() == shares_bps.len(), PrivyBagError::RecipientShareMismatch);
    require!(recipients.len() <= MAX_RECIPIENTS, PrivyBagError::TooManyRecipients);

    let total: u32 = shares_bps.iter().map(|&b| b as u32).sum();
    require!(total <= 10_000, PrivyBagError::SharesExceed100Percent);

    let config = &mut ctx.accounts.fee_config;
    let clock = Clock::get()?;

    config.creator     = ctx.accounts.creator.key();
    config.recipients  = recipients;
    config.shares_bps  = shares_bps;
    config.is_active   = true;
    config.updated_at  = clock.unix_timestamp;
    config.bump        = ctx.bumps.fee_config;

    msg!("PrivyBag: fee share configured for {}", config.creator);
    Ok(())
}
