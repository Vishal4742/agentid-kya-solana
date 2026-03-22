use anchor_lang::prelude::*;
use crate::state::ProgramConfig;

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: The public key of the oracle authority
    pub oracle: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn process_init_config(ctx: Context<InitConfig>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.oracle_authority = ctx.accounts.oracle.key();
    config.bump = ctx.bumps.config;
    Ok(())
}
