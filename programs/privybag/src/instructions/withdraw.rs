// programs/privybag/src/instructions/withdraw.rs
//
// withdraw — Creator pulls SOL from their vault PDA to their wallet.
//
// Privacy: Explorer shows "Vault PDA → Creator" — no direct link to fan.

use anchor_lang::prelude::*;
use crate::state::CreatorVault;
use crate::errors::PrivyBagError;

#[derive(Accounts)]
pub struct Withdraw<'info> {
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

pub fn handler(ctx: Context<Withdraw>, amount_lamports: u64) -> Result<()> {
    require!(amount_lamports > 0, PrivyBagError::ZeroClaimAmount);

    // Use the real on-chain lamport balance as source of truth.
    // This is more robust than stored stats (which may lag if deposits
    // bypassed the stats-tracking path in older program versions).
    let vault_account_info   = ctx.accounts.vault.to_account_info();
    let creator_account_info = ctx.accounts.creator.to_account_info();

    // Calculate rent-exempt minimum for the vault account
    let vault_data_len = vault_account_info.data_len();
    let rent = Rent::get()?;
    let rent_exempt_min = rent.minimum_balance(vault_data_len);

    // Available = actual balance minus the rent-exempt reserve we must keep
    let vault_actual_balance = vault_account_info.lamports();
    let available = vault_actual_balance.saturating_sub(rent_exempt_min);

    require!(available > 0, PrivyBagError::InsufficientBalance);
    require!(amount_lamports <= available, PrivyBagError::InsufficientBalance);

    msg!(
        "PrivyBag withdraw | vault balance: {} | rent reserve: {} | available: {} | requesting: {}",
        vault_actual_balance,
        rent_exempt_min,
        available,
        amount_lamports,
    );

    // Transfer lamports: vault PDA → creator.
    // Program-owned PDAs cannot use system_program::transfer (from must sign).
    // The standard Anchor pattern is direct lamport manipulation.
    **vault_account_info.try_borrow_mut_lamports()? = vault_actual_balance
        .checked_sub(amount_lamports)
        .ok_or(PrivyBagError::InsufficientBalance)?;

    **creator_account_info.try_borrow_mut_lamports()? = creator_account_info
        .lamports()
        .checked_add(amount_lamports)
        .unwrap();

    // Update stats (after lamport manipulation to avoid borrow conflicts)
    // Sync total_received so stats accurately reflect the real balance history
    let vault = &mut ctx.accounts.vault;
    vault.total_claimed_lamports =
        vault.total_claimed_lamports.saturating_add(amount_lamports);
    // Also ensure total_received >= total_claimed (heal stale stats)
    if vault.total_received_lamports < vault.total_claimed_lamports {
        vault.total_received_lamports = vault.total_claimed_lamports;
    }

    msg!(
        "PrivyBag withdraw done | creator: {} | {} lamports claimed",
        vault.creator,
        amount_lamports,
    );

    Ok(())
}
