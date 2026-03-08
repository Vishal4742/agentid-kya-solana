use anchor_lang::prelude::*;
use crate::state::{AgentIdentity, ProgramConfig};
use crate::errors::AgentIdError;

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(
        mut,
        seeds = [AgentIdentity::SEED_PREFIX, identity.owner.as_ref()],
        bump = identity.bump,
    )]
    pub identity: Account<'info, AgentIdentity>,

    /// Oracle authority must sign this instruction
    #[account(
        seeds = [b"program-config"],
        bump = config.bump,
        constraint = config.oracle_authority == oracle.key() @ AgentIdError::UnauthorizedOracle,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub oracle: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateReputation>, new_score: u16) -> Result<()> {
    require!(new_score <= 1000, AgentIdError::InvalidReputationScore);

    let identity = &mut ctx.accounts.identity;
    let old_score = identity.reputation_score;
    identity.reputation_score = new_score;

    emit!(ReputationUpdated {
        agent_identity: identity.key(),
        old_score,
        new_score,
    });

    Ok(())
}

#[event]
pub struct ReputationUpdated {
    pub agent_identity: Pubkey,
    pub old_score: u16,
    pub new_score: u16,
}
