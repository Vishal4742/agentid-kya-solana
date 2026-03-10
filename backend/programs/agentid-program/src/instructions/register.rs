use anchor_lang::prelude::*;
use solana_program::hash::hash;

use crate::errors::AgentIdError;
use crate::state::AgentIdentity;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterAgentParams {
    pub name: String,
    pub framework: u8,
    pub model: String,
    pub agent_wallet: Pubkey,
    pub can_trade_defi: bool,
    pub can_send_payments: bool,
    pub can_publish_content: bool,
    pub can_analyze_data: bool,
    pub max_tx_size_usdc: u64,
    pub gstin: String,
    pub pan_hash: [u8; 32],
    pub service_category: u8,
}

#[derive(Accounts)]
#[instruction(params: RegisterAgentParams)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + AgentIdentity::INIT_SPACE,
        seeds = [AgentIdentity::SEED_PREFIX, owner.key().as_ref()],
        bump,
    )]
    pub identity: Account<'info, AgentIdentity>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterAgent>, params: RegisterAgentParams) -> Result<()> {
    require!(
        params.name.len() >= 3 && params.name.len() <= 64,
        AgentIdError::InvalidNameLength
    );

    let now = Clock::get()?.unix_timestamp;
    let identity = &mut ctx.accounts.identity;

    // Generate unique agent_id by hashing owner + name + timestamp
    let mut seed_data = Vec::new();
    seed_data.extend_from_slice(&ctx.accounts.owner.key().to_bytes());
    seed_data.extend_from_slice(params.name.as_bytes());
    seed_data.extend_from_slice(&now.to_le_bytes());
    let agent_id_hash = hash(&seed_data);
    let agent_id = agent_id_hash.to_bytes();

    identity.agent_id = agent_id;
    identity.owner = ctx.accounts.owner.key();
    identity.agent_wallet = params.agent_wallet;
    identity.name = params.name.clone();
    identity.framework = params.framework;
    identity.model = params.model;
    identity.credential_nft = Pubkey::default(); // placeholder for future cNFT credential
    identity.verified_level = 0; // Unverified
    identity.registered_at = now;
    identity.last_active = now;
    identity.can_trade_defi = params.can_trade_defi;
    identity.can_send_payments = params.can_send_payments;
    identity.can_publish_content = params.can_publish_content;
    identity.can_analyze_data = params.can_analyze_data;
    identity.max_tx_size_usdc = params.max_tx_size_usdc;
    identity.reputation_score = 500; // neutral start
    identity.total_transactions = 0;
    identity.successful_transactions = 0;
    identity.human_rating_x10 = 0;
    identity.rating_count = 0;
    identity.gstin = params.gstin;
    identity.pan_hash = params.pan_hash;
    identity.service_category = params.service_category;
    identity.bump = ctx.bumps.identity;

    // Store a deterministic credential pointer derived from the agent id.
    identity.credential_nft = Pubkey::new_from_array(agent_id);

    emit!(AgentRegistered {
        owner: ctx.accounts.owner.key(),
        agent_id,
        name: identity.name.clone(),
        registered_at: now,
    });

    Ok(())
}

#[event]
pub struct AgentRegistered {
    pub owner: Pubkey,
    pub agent_id: [u8; 32],
    pub name: String,
    pub registered_at: i64,
}
