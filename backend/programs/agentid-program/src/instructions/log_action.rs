use anchor_lang::prelude::*;
use crate::state::{AgentIdentity, AgentAction};
use crate::errors::AgentIdError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LogActionParams {
    pub action_type: u8,
    pub program_called: Pubkey,
    pub success: bool,
    pub usdc_transferred: u64,
    pub memo: String,
}

#[derive(Accounts)]
#[instruction(params: LogActionParams)]
pub struct LogAction<'info> {
    #[account(
        mut,
        seeds = [AgentIdentity::SEED_PREFIX, identity.owner.as_ref()],
        bump = identity.bump,
    )]
    pub identity: Account<'info, AgentIdentity>,

    #[account(
        init,
        payer = payer,
        space = 8 + AgentAction::INIT_SPACE,
        seeds = [
            b"agent-action",
            identity.key().as_ref(),
            &identity.total_transactions.to_le_bytes(),
        ],
        bump,
    )]
    pub action: Account<'info, AgentAction>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn process_log_action(ctx: Context<LogAction>, params: LogActionParams) -> Result<()> {
    // Only the identity owner may log actions on their agent
    require_keys_eq!(
        ctx.accounts.payer.key(),
        ctx.accounts.identity.owner,
        AgentIdError::UnauthorizedLogAction
    );

    let now = Clock::get()?.unix_timestamp;
    let identity = &mut ctx.accounts.identity;
    let action = &mut ctx.accounts.action;

    // Populate action record
    action.agent_identity    = identity.key();
    action.action_type       = params.action_type;
    action.program_called    = params.program_called;
    action.success           = params.success;
    action.usdc_transferred  = params.usdc_transferred;
    action.timestamp         = now;
    action.memo              = params.memo.chars().take(64).collect();
    action.bump              = ctx.bumps.action;

    // Update identity stats
    identity.total_transactions += 1;
    if params.success {
        identity.successful_transactions += 1;
    }
    identity.last_active = now;

    Ok(())
}
