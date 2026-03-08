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
        instructions::init_config::handler(ctx)
    }

    /// Register a new AI agent identity on-chain.
    /// Creates an AgentIdentity PDA seeded by [b"agent-identity", owner.key()].
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        params: RegisterAgentParams,
    ) -> Result<()> {
        instructions::register::handler(ctx, params)
    }

    /// Update the agent's capabilities (DeFi trading, payments, limits).
    /// Requires owner signature.
    pub fn update_capabilities(
        ctx: Context<UpdateCapabilities>,
        params: UpdateCapabilitiesParams,
    ) -> Result<()> {
        instructions::update_capabilities::handler(ctx, params)
    }

    /// Verify an agent for a specific action type.
    /// Returns whether the agent is authorized based on reputation thresholds.
    /// CPI-callable by DeFi protocols.
    pub fn verify_agent(
        ctx: Context<VerifyAgent>,
        action_type: u8,
    ) -> Result<VerificationResult> {
        instructions::verify::handler(ctx, action_type)
    }

    /// Log an on-chain action performed by the agent.
    /// Creates an AgentAction PDA and updates identity stats.
    pub fn log_action(
        ctx: Context<LogAction>,
        params: LogActionParams,
    ) -> Result<()> {
        instructions::log_action::handler(ctx, params)
    }

    /// Rate an agent (1–5 stars). Rater cannot be the agent owner.
    pub fn rate_agent(ctx: Context<RateAgent>, rating: u8) -> Result<()> {
        instructions::rate::handler(ctx, rating)
    }

    /// Update reputation score. Oracle-authority only.
    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        new_score: u16,
    ) -> Result<()> {
        instructions::update_reputation::handler(ctx, new_score)
    }
}
