use anchor_lang::prelude::*;
use crate::state::AgentIdentity;
use crate::errors::AgentIdError;

#[derive(Accounts)]
pub struct RateAgent<'info> {
    #[account(
        mut,
        seeds = [AgentIdentity::SEED_PREFIX, identity.owner.as_ref()],
        bump = identity.bump,
    )]
    pub identity: Account<'info, AgentIdentity>,

    pub rater: Signer<'info>,
}

/// rating: 1–5 stars
pub fn handler(ctx: Context<RateAgent>, rating: u8) -> Result<()> {
    require!(rating >= 1 && rating <= 5, AgentIdError::InvalidRating);
    require!(
        ctx.accounts.rater.key() != ctx.accounts.identity.owner,
        AgentIdError::CannotRateSelf
    );

    let identity = &mut ctx.accounts.identity;

    // Rolling average stored as rating * 10 to avoid floats
    // new_avg = (old_total + new_rating*10) / (count+1)
    let old_total = identity.human_rating_x10 as u64 * identity.rating_count as u64;
    identity.rating_count += 1;
    let new_total = old_total + (rating as u64 * 10);
    identity.human_rating_x10 = (new_total / identity.rating_count as u64) as u16;

    emit!(AgentRated {
        agent_identity: identity.key(),
        rater: ctx.accounts.rater.key(),
        rating,
        new_avg_x10: identity.human_rating_x10,
    });

    Ok(())
}

#[event]
pub struct AgentRated {
    pub agent_identity: Pubkey,
    pub rater: Pubkey,
    pub rating: u8,
    pub new_avg_x10: u16,
}
