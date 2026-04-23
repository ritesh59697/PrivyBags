// programs/privybag/src/instructions/initialize_vault.rs

use anchor_lang::prelude::*;
use crate::state::CreatorVault;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + CreatorVault::INIT_SPACE,
        seeds = [CreatorVault::SEED_PREFIX, creator.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, CreatorVault>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeVault>, bags_token_mint: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    vault.creator               = ctx.accounts.creator.key();
    vault.bags_token_mint       = bags_token_mint;
    vault.total_received_lamports = 0;
    vault.tip_count             = 0;
    vault.total_claimed_lamports = 0;
    vault.is_active             = true;
    vault.created_at            = clock.unix_timestamp;
    vault.bump                  = ctx.bumps.vault;

    msg!(
        "PrivyBag vault initialized | creator: {} | bags_token: {}",
        vault.creator,
        vault.bags_token_mint
    );
    Ok(())
}
