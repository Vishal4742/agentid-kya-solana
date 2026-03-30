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

    #[msg("Model name must be between 1 and 32 characters")]
    InvalidModelLength,

    #[msg("Metadata URI is required")]
    EmptyMetadataUri,

    #[msg("Agent wallet must be a real public key")]
    InvalidAgentWallet,

    #[msg("At least one agent capability must be enabled")]
    NoCapabilitiesEnabled,

    #[msg("Payment-enabled agents must declare a non-zero max USDC transaction limit")]
    InvalidMaxTxSize,

    #[msg("Service category is out of range")]
    InvalidServiceCategory,

    #[msg("Action memo must be at most 64 characters")]
    InvalidMemoLength,

    #[msg("Treasury is paused for emergency")]
    TreasuryPaused,

    #[msg("Payment amount exceeds per-transaction limit")]
    ExceedsPerTxLimit,

    #[msg("Payment amount exceeds daily spending limit")]
    ExceedsDailyLimit,

    #[msg("Transaction amount requires multisig approval")]
    RequiresMultisig,

    #[msg("Only the treasury owner can perform this action")]
    UnauthorizedTreasuryOwner,

    #[msg("Recipient does not match the provided token account owner")]
    InvalidRecipient,

    #[msg("Arithmetic overflow or underflow")]
    ArithmeticError,

    #[msg("Unknown action type — must be 0=DeFiTrade 1=Payment 2=ContentPublish 3=DataQuery")]
    InvalidActionType,

    #[msg("Only the identity owner can log actions")]
    UnauthorizedLogAction,
}
