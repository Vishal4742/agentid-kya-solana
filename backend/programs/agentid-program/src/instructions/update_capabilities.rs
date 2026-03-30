use anchor_lang::prelude::*;
use crate::errors::AgentIdError;
use crate::state::AgentIdentity;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateCapabilitiesParams {
    pub can_trade_defi: bool,
    pub can_send_payments: bool,
    pub can_publish_content: bool,
    pub can_analyze_data: bool,
    pub max_tx_size_usdc: u64,
}

#[derive(Accounts)]
pub struct UpdateCapabilities<'info> {
    #[account(
        mut,
        seeds = [AgentIdentity::SEED_PREFIX, owner.key().as_ref()],
        bump = identity.bump,
        // Ensures only owner can update
        constraint = identity.owner == owner.key(),
    )]
    pub identity: Account<'info, AgentIdentity>,

    pub owner: Signer<'info>,
}

pub fn process_update_capabilities(
    ctx: Context<UpdateCapabilities>,
    params: UpdateCapabilitiesParams,
) -> Result<()> {
    require!(
        params.can_trade_defi
            || params.can_send_payments
            || params.can_publish_content
            || params.can_analyze_data,
        AgentIdError::NoCapabilitiesEnabled
    );
    require!(
        !(params.can_trade_defi || params.can_send_payments) || params.max_tx_size_usdc > 0,
        AgentIdError::InvalidMaxTxSize
    );

    let identity = &mut ctx.accounts.identity;

    identity.can_trade_defi      = params.can_trade_defi;
    identity.can_send_payments   = params.can_send_payments;
    identity.can_publish_content = params.can_publish_content;
    identity.can_analyze_data    = params.can_analyze_data;
    identity.max_tx_size_usdc    = params.max_tx_size_usdc;
    identity.last_active         = Clock::get()?.unix_timestamp;

    emit!(CapabilitiesUpdated {
        identity: identity.key(),
        owner: ctx.accounts.owner.key(),
        can_trade_defi:      params.can_trade_defi,
        can_send_payments:   params.can_send_payments,
        can_publish_content: params.can_publish_content,
        can_analyze_data:    params.can_analyze_data,
        max_tx_size_usdc:    params.max_tx_size_usdc,
        updated_at: identity.last_active,
    });

    Ok(())
}

#[event]
pub struct CapabilitiesUpdated {
    pub identity: Pubkey,
    pub owner: Pubkey,
    pub can_trade_defi: bool,
    pub can_send_payments: bool,
    pub can_publish_content: bool,
    pub can_analyze_data: bool,
    pub max_tx_size_usdc: u64,
    pub updated_at: i64,
}
