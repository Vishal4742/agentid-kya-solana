use anchor_lang::prelude::*;
use crate::state::{AgentIdentity, VerificationResult};

// Reputation thresholds by action type
const DEFI_TRADE_MIN_REP: u16    = 600;
const PAYMENT_MIN_REP: u16       = 400;
const CONTENT_MIN_REP: u16       = 200;
const DATA_QUERY_MIN_REP: u16    = 100;

#[derive(Accounts)]
pub struct VerifyAgent<'info> {
    #[account(
        seeds = [AgentIdentity::SEED_PREFIX, identity.owner.as_ref()],
        bump = identity.bump,
    )]
    pub identity: Account<'info, AgentIdentity>,
}

/// action_type: 0=DeFiTrade 1=Payment 2=ContentPublish 3=DataQuery
pub fn handler(ctx: Context<VerifyAgent>, action_type: u8) -> Result<VerificationResult> {
    let identity = &ctx.accounts.identity;

    let (required_rep, capability_enabled) = match action_type {
        0 => (DEFI_TRADE_MIN_REP,  identity.can_trade_defi),
        1 => (PAYMENT_MIN_REP,     identity.can_send_payments),
        2 => (CONTENT_MIN_REP,     identity.can_publish_content),
        3 => (DATA_QUERY_MIN_REP,  identity.can_analyze_data),
        _ => (PAYMENT_MIN_REP,     true),
    };

    let is_authorized = capability_enabled
        && identity.reputation_score >= required_rep;

    Ok(VerificationResult {
        is_registered:    true,
        verified_level:   identity.verified_level,
        reputation_score: identity.reputation_score,
        is_authorized,
        agent_name:       identity.name.clone(),
    })
}
