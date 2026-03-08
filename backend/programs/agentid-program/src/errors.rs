use anchor_lang::prelude::*;

#[error_code]
pub enum AgentIdError {
    #[msg("Agent name must be between 3 and 64 characters")]
    InvalidNameLength,

    #[msg("Reputation threshold not met for this action type")]
    InsufficientReputation,

    #[msg("Agent is not verified at the required level")]
    InsufficientVerification,

    #[msg("Rating must be between 1 and 5")]
    InvalidRating,

    #[msg("An agent cannot rate themselves")]
    CannotRateSelf,

    #[msg("Action type is not enabled for this agent")]
    CapabilityNotEnabled,

    #[msg("Transaction exceeds agent's max USDC limit")]
    ExceedsMaxTxLimit,

    #[msg("Only the oracle authority can update reputation")]
    UnauthorizedOracle,

    #[msg("Reputation score must be between 0 and 1000")]
    InvalidReputationScore,

    #[msg("GSTIN must be exactly 15 characters (leave blank to skip)")]  
    InvalidGstin,
}
