use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::AgentTreasury;
use crate::errors::AgentIdError;

#[derive(Accounts)]
pub struct DepositToTreasury<'info> {
    #[account(mut)]
    pub treasury: Account<'info, AgentTreasury>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = depositor
    )]
    pub depositor_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury
    )]
    pub treasury_usdc: Account<'info, TokenAccount>,

    #[account(address = treasury.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn process_deposit_to_treasury(
    ctx: Context<DepositToTreasury>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.depositor_usdc.to_account_info(),
        to: ctx.accounts.treasury_usdc.to_account_info(),
        authority: ctx.accounts.depositor.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::transfer(cpi_ctx, amount)?;
    ctx.accounts.treasury_usdc.reload()?;

    let treasury = &mut ctx.accounts.treasury;
    treasury.total_earned = treasury
        .total_earned
        .checked_add(amount)
        .ok_or(AgentIdError::ArithmeticError)?;
    treasury.usdc_balance = ctx.accounts.treasury_usdc.amount;

    Ok(())
}
