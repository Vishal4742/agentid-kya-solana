use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::VerificationResult;

declare_id!("Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF");

#[program]
pub mod agentid_program {
    use super::*;

    /// Initialize the global program configuration (e.g., oracle authority)
    pub fn init_config(ctx: Context<InitConfig>) -> Result<()> {
        instructions::init_config::process_init_config(ctx)
    }

    /// Register a new AI agent identity on-chain.
    /// Creates an AgentIdentity PDA seeded by [b"agent-identity", owner.key()].
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        params: RegisterAgentParams,
    ) -> Result<()> {
        instructions::register::process_register_agent(ctx, params)
    }

    /// Update the agent's capabilities (DeFi trading, payments, limits).
    /// Requires owner signature.
    pub fn update_capabilities(
        ctx: Context<UpdateCapabilities>,
        params: UpdateCapabilitiesParams,
    ) -> Result<()> {
        instructions::update_capabilities::process_update_capabilities(ctx, params)
    }

    /// Verify an agent for a specific action type.
    /// Returns whether the agent is authorized based on reputation thresholds.
    /// CPI-callable by DeFi protocols.
    pub fn verify_agent(ctx: Context<VerifyAgent>, action_type: u8) -> Result<VerificationResult> {
        instructions::verify::process_verify_agent(ctx, action_type)
    }

    /// Log an on-chain action performed by the agent.
    /// Creates an AgentAction PDA and updates identity stats.
    pub fn log_action(ctx: Context<LogAction>, params: LogActionParams) -> Result<()> {
        instructions::log_action::process_log_action(ctx, params)
    }

    /// Rate an agent (1–5 stars). Rater cannot be the agent owner.
    pub fn rate_agent(ctx: Context<RateAgent>, rating: u8) -> Result<()> {
        instructions::rate::process_rate_agent(ctx, rating)
    }

    pub fn update_reputation(ctx: Context<UpdateReputation>, new_score: u16) -> Result<()> {
        instructions::update_reputation::process_update_reputation(ctx, new_score)
    }

    /// Initialize a newly created AgentTreasury PDA for an agent
    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        spending_limit_per_tx: u64,
        spending_limit_per_day: u64,
        multisig_required_above: u64,
    ) -> Result<()> {
        instructions::treasury_init::process_initialize_treasury(
            ctx,
            spending_limit_per_tx,
            spending_limit_per_day,
            multisig_required_above,
        )
    }

    /// Execute an autonomous USDC payment via the agent's treasury
    pub fn autonomous_payment(
        ctx: Context<AutonomousPayment>,
        amount: u64,
        recipient: Pubkey,
        memo: String,
    ) -> Result<()> {
        instructions::treasury_payment::process_autonomous_payment(ctx, amount, recipient, memo)
    }

    /// Update the treasury's operational limits (Owner only)
    pub fn update_spending_limits(
        ctx: Context<UpdateTreasury>,
        spending_limit_per_tx: u64,
        spending_limit_per_day: u64,
        multisig_required_above: u64,
    ) -> Result<()> {
        instructions::treasury_update::update_limits(
            ctx,
            spending_limit_per_tx,
            spending_limit_per_day,
            multisig_required_above,
        )
    }

    /// Emergency pause for the treasury (Owner only)
    pub fn emergency_pause(ctx: Context<UpdateTreasury>, paused: bool) -> Result<()> {
        instructions::treasury_update::emergency_pause(ctx, paused)
    }

    /// Deposit USDC into the treasury
    pub fn deposit(ctx: Context<DepositToTreasury>, amount: u64) -> Result<()> {
        instructions::treasury_deposit::process_deposit_to_treasury(ctx, amount)
    }
}
