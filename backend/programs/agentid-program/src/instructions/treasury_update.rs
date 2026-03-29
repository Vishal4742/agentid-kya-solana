use anchor_lang::prelude::*;
use crate::state::AgentTreasury;
use crate::errors::AgentIdError;

#[derive(Accounts)]
pub struct UpdateTreasury<'info> {
    #[account(mut, has_one = owner)]
    pub treasury: Account<'info, AgentTreasury>,
    pub owner: Signer<'info>,
}

pub fn update_limits(
    ctx: Context<UpdateTreasury>,
    spending_limit_per_tx: u64,
    spending_limit_per_day: u64,
    multisig_required_above: u64,
) -> Result<()> {
    require!(
        ctx.accounts.owner.key() == ctx.accounts.treasury.owner,
        AgentIdError::UnauthorizedTreasuryOwner
    );
    let treasury = &mut ctx.accounts.treasury;
    treasury.spending_limit_per_tx = spending_limit_per_tx;
    treasury.spending_limit_per_day = spending_limit_per_day;
    treasury.multisig_required_above = multisig_required_above;
    Ok(())
}

pub fn emergency_pause(
    ctx: Context<UpdateTreasury>,
    paused: bool,
) -> Result<()> {
    require!(
        ctx.accounts.owner.key() == ctx.accounts.treasury.owner,
        AgentIdError::UnauthorizedTreasuryOwner
    );
    let treasury = &mut ctx.accounts.treasury;
    treasury.emergency_pause = paused;
    Ok(())
}
