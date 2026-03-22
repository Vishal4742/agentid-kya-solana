use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::{AgentIdentity, AgentTreasury};
use crate::errors::AgentIdError;

#[event]
pub struct PaymentExecuted {
    pub agent_identity: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub memo: String,
    #[index]
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct AutonomousPayment<'info> {
    #[account(
        mut,
        seeds = [AgentTreasury::SEED_PREFIX, agent_identity.key().as_ref()],
        bump = treasury.bump,
        has_one = owner
    )]
    pub treasury: Account<'info, AgentTreasury>,

    #[account(
        seeds = [AgentIdentity::SEED_PREFIX, owner.key().as_ref()],
        bump = agent_identity.bump,
        has_one = owner
    )]
    pub agent_identity: Account<'info, AgentIdentity>,

    // The agent wallet that signs the automated TX
    pub agent_wallet: Signer<'info>,

    /// CHECK: We just verify the sig against agent_identity
    pub owner: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury
    )]
    pub treasury_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_usdc: Account<'info, TokenAccount>,

    #[account(address = treasury.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn process_autonomous_payment(
    ctx: Context<AutonomousPayment>,
    amount: u64,
    recipient: Pubkey,
    memo: String,
) -> Result<()> {
    require!(
        ctx.accounts.agent_identity.can_send_payments,
        AgentIdError::CapabilityNotEnabled
    );
    require!(
        ctx.accounts.agent_wallet.key() == ctx.accounts.agent_identity.agent_wallet,
        AgentIdError::CapabilityNotEnabled
    );
    require!(
        recipient == ctx.accounts.recipient_usdc.owner,
        AgentIdError::InvalidRecipient
    );

    let treasury = &mut ctx.accounts.treasury;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    require!(!treasury.emergency_pause, AgentIdError::TreasuryPaused);
    require!(amount <= treasury.spending_limit_per_tx, AgentIdError::ExceedsPerTxLimit);
    if amount > treasury.multisig_required_above {
        return err!(AgentIdError::RequiresMultisig);
    }

    // Check if new day
    if now > treasury.day_reset_timestamp + 86400 {
        treasury.spent_today = 0;
        treasury.day_reset_timestamp = now;
    }

    let next_spent_today = treasury
        .spent_today
        .checked_add(amount)
        .ok_or(AgentIdError::ArithmeticError)?;
    require!(next_spent_today <= treasury.spending_limit_per_day, AgentIdError::ExceedsDailyLimit);

    require!(
        ctx.accounts.agent_identity.reputation_score >= 100,
        AgentIdError::InsufficientReputation
    );

    // Perform SPL Token Transfer
    let seeds = &[
        AgentTreasury::SEED_PREFIX,
        treasury.agent_identity.as_ref(),
        &[treasury.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.treasury_usdc.to_account_info(),
        to: ctx.accounts.recipient_usdc.to_account_info(),
        authority: treasury.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    token::transfer(cpi_ctx, amount)?;
    ctx.accounts.treasury_usdc.reload()?;

    // Update state
    treasury.spent_today = next_spent_today;
    treasury.total_spent = treasury
        .total_spent
        .checked_add(amount)
        .ok_or(AgentIdError::ArithmeticError)?;
    treasury.usdc_balance = ctx.accounts.treasury_usdc.amount;

    emit!(PaymentExecuted {
        agent_identity: treasury.agent_identity,
        recipient,
        amount,
        memo,
        timestamp: now,
    });

    Ok(())
}
