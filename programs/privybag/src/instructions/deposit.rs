// programs/privybag/src/instructions/deposit.rs
//
// deposit — Fan sends SOL directly into the creator's vault PDA.
//
// Key design decisions:
//   - init_if_needed: vault is created on the very first deposit.
//     No separate "initialize" transaction required.
//   - creator passed as an arg (not a signer): any fan can deposit to
//     any creator's vault without the creator being online.
//   - The vault becomes program-owned, fixing AccountOwnedByWrongProgram (3007).
//
// Privacy: Explorer shows "Fan → Vault PDA" — no direct link to creator.

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::CreatorVault;
use crate::errors::PrivyBagError;

const MAX_TIP_LAMPORTS: u64 = 10_000_000_000; // 10 SOL

#[derive(Accounts)]
#[instruction(creator: Pubkey)]
pub struct Deposit<'info> {
    /// Fan — signs and pays. Identity NOT stored on-chain.
    #[account(mut)]
    pub fan: Signer<'info>,

    /// Vault PDA — init_if_needed creates it on first deposit.
    /// Seeds use the creator pubkey passed as an arg, so any fan
    /// can deposit to any creator's vault without creator co-signing.
    #[account(
        init_if_needed,
        payer = fan,
        space = 8 + CreatorVault::INIT_SPACE,
        seeds = [CreatorVault::SEED_PREFIX, creator.as_ref()],
        bump,
    )]
    pub vault: Account<'info, CreatorVault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, creator: Pubkey, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, PrivyBagError::ZeroTipAmount);
    require!(amount_lamports <= MAX_TIP_LAMPORTS, PrivyBagError::TipAmountTooLarge);

    // ── Initialize vault on first deposit ────────────────────────────────
    // init_if_needed allocates the account, but field initialization is our job.
    // We detect "first time" by checking if creator is still Pubkey::default().
    {
        let vault = &mut ctx.accounts.vault;
        if vault.creator == Pubkey::default() {
            vault.creator                 = creator;
            vault.bags_token_mint         = Pubkey::default();
            vault.total_received_lamports = 0;
            vault.tip_count               = 0;
            vault.total_claimed_lamports  = 0;
            vault.is_active               = true;
            vault.created_at              = Clock::get()?.unix_timestamp;
            vault.bump                    = ctx.bumps.vault;
        }
        require!(vault.is_active, PrivyBagError::VaultInactive);
    } // ← vault borrow dropped here

    // ── Transfer SOL: fan → vault PDA ────────────────────────────────────
    // We use a CpiContext with the fan as signer. The vault is just the
    // destination — it does not need to sign for a receive.
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.fan.to_account_info(),
            to:   ctx.accounts.vault.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount_lamports)?;

    // ── Update aggregate stats ────────────────────────────────────────────
    // Re-borrow vault after CPI (no borrow conflict now).
    let vault = &mut ctx.accounts.vault;
    vault.total_received_lamports =
        vault.total_received_lamports.saturating_add(amount_lamports);
    vault.tip_count = vault.tip_count.saturating_add(1);

    msg!(
        "PrivyBag deposit | vault: {} | tip #{} | +{} lamports | total: {}",
        vault.creator,
        vault.tip_count,
        amount_lamports,
        vault.total_received_lamports,
    );

    Ok(())
}
