// programs/privybag/src/lib.rs
//
// PrivyBag — Privacy-first tipping for Bags.fm creators.
//
// Privacy model (vault/PDA indirection):
//   TX 1 — Fan → Vault PDA      (via deposit)
//   TX 2 — Vault PDA → Creator  (via withdraw)
//   No single transaction ever links Fan ↔ Creator directly.

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HFe9PvFPXnsKqGYK75kVcBke98fP94FWD3S1ffVrKFAi");

#[program]
pub mod privybag {
    use super::*;

    /// Fan deposits SOL into creator's vault PDA.
    /// Creates the vault on first call (init_if_needed).
    /// The fan passes `creator` pubkey as an arg — no creator signature needed.
    pub fn deposit(
        ctx: Context<Deposit>,
        creator: Pubkey,
        amount_lamports: u64,
    ) -> Result<()> {
        instructions::deposit::handler(ctx, creator, amount_lamports)
    }

    /// Creator withdraws SOL from their vault PDA.
    /// Only the registered creator can call this.
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount_lamports: u64,
    ) -> Result<()> {
        instructions::withdraw::handler(ctx, amount_lamports)
    }

    // ── Legacy instructions (kept for backward compat) ───────────────────

    /// Creator registers their vault (legacy — deposit now does this via init_if_needed).
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        bags_token_mint: Pubkey,
    ) -> Result<()> {
        instructions::initialize_vault::handler(ctx, bags_token_mint)
    }

    /// Records aggregate stats (legacy — deposit now handles this internally).
    pub fn shielded_tip(
        ctx: Context<ShieldedTip>,
        tip_amount_lamports: u64,
    ) -> Result<()> {
        instructions::shielded_tip::handler(ctx, tip_amount_lamports)
    }

    /// Creator configures private fee-share rules.
    pub fn configure_private_fee_share(
        ctx: Context<ConfigurePrivateFeeShare>,
        recipients: Vec<Pubkey>,
        shares_bps: Vec<u16>,
    ) -> Result<()> {
        instructions::configure_fee_share::handler(ctx, recipients, shares_bps)
    }

    /// Creator withdraws via legacy claim instruction.
    pub fn claim_private_share(
        ctx: Context<ClaimPrivateShare>,
        claim_amount_lamports: u64,
    ) -> Result<()> {
        instructions::claim_private_share::handler(ctx, claim_amount_lamports)
    }
}
