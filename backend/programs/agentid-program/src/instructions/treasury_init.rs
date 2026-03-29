use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use crate::state::{AgentIdentity, AgentTreasury};

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + AgentTreasury::INIT_SPACE,
        seeds = [AgentTreasury::SEED_PREFIX, agent_identity.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, AgentTreasury>,

    #[account(
        seeds = [AgentIdentity::SEED_PREFIX, owner.key().as_ref()],
        bump = agent_identity.bump,
        has_one = owner
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn process_initialize_treasury(
    ctx: Context<InitializeTreasury>,
    spending_limit_per_tx: u64,
    spending_limit_per_day: u64,
    multisig_required_above: u64,
) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    let clock = Clock::get()?;

    treasury.agent_identity = ctx.accounts.agent_identity.key();
    treasury.owner = ctx.accounts.owner.key();
    treasury.usdc_mint = ctx.accounts.usdc_mint.key();
    treasury.usdc_balance = 0;
    treasury.total_earned = 0;
    treasury.total_spent = 0;
    treasury.spending_limit_per_tx = spending_limit_per_tx;
    treasury.spending_limit_per_day = spending_limit_per_day;
    treasury.spent_today = 0;
    treasury.day_reset_timestamp = clock.unix_timestamp;
    treasury.emergency_pause = false;
    treasury.multisig_required_above = multisig_required_above;
    treasury.bump = ctx.bumps.treasury;

    Ok(())
}
