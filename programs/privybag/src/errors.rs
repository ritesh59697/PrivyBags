// programs/privybag/src/errors.rs

use anchor_lang::prelude::*;

#[error_code]
pub enum PrivyBagError {
    #[msg("Creator vault is not active — cannot receive tips")]
    VaultInactive,
    #[msg("Only the vault creator can perform this action")]
    Unauthorized,
    #[msg("Tip amount must be greater than 0 lamports")]
    ZeroTipAmount,
    #[msg("Tip amount exceeds 10 SOL maximum")]
    TipAmountTooLarge,
    #[msg("Recipient and shares_bps arrays must have the same length")]
    RecipientShareMismatch,
    #[msg("Fee shares must sum to 10,000 bps (100%) or less")]
    SharesExceed100Percent,
    #[msg("Maximum of 5 fee-share recipients allowed")]
    TooManyRecipients,
    #[msg("Insufficient unclaimed balance in vault")]
    InsufficientBalance,
    #[msg("Claim amount must be greater than 0")]
    ZeroClaimAmount,
}
