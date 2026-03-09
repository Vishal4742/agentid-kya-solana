use anchor_lang::prelude::*;
use mpl_bubblegum::{
    accounts::TreeConfig,
    instructions::{MintV1CpiBuilder, MintV1InstructionArgs},
    program::MplBubblegum,
    types::{Creator, MetadataArgs, TokenProgramVersion, TokenStandard},
};
use mpl_token_metadata::program::MplTokenMetadata;
use solana_program::hash::hash;
use spl_account_compression::program::SplAccountCompression;
use spl_noop::program::Noop;

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
    pub tree_config: Account<'info, TreeConfig>,

    /// CHECK: Merkle tree account used for cNFT minting.
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub bubblegum_program: Program<'info, MplBubblegum>,
    pub token_metadata_program: Program<'info, MplTokenMetadata>,

    pub compression_program: Program<'info, SplAccountCompression>,
    pub log_wrapper: Program<'info, Noop>,
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
    identity.credential_nft = Pubkey::default(); // set after cNFT mint
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

    let metadata = MetadataArgs {
        name: format!("AgentID: {}", identity.name),
        symbol: "AID".to_string(),
        uri: format!("https://agentid.xyz/metadata/{}", hex::encode(agent_id)),
        seller_fee_basis_points: 0,
        primary_sale_happened: false,
        is_mutable: false,
        edition_nonce: None,
        token_standard: Some(TokenStandard::NonFungible),
        collection: None,
        uses: None,
        token_program_version: TokenProgramVersion::Original,
        creators: vec![Creator {
            address: ctx.accounts.owner.key(),
            verified: true,
            share: 100,
        }],
        non_transferable: true,
    };

    let mint_args = MintV1InstructionArgs { message: metadata };

    MintV1CpiBuilder::new(&ctx.accounts.bubblegum_program.to_account_info())
        .tree_config(&ctx.accounts.tree_config.to_account_info())
        .leaf_owner(&ctx.accounts.owner.to_account_info())
        .leaf_delegate(&ctx.accounts.owner.to_account_info())
        .merkle_tree(&ctx.accounts.merkle_tree.to_account_info())
        .payer(&ctx.accounts.owner.to_account_info())
        .tree_creator_or_delegate(&ctx.accounts.owner.to_account_info())
        .log_wrapper(&ctx.accounts.log_wrapper.to_account_info())
        .compression_program(&ctx.accounts.compression_program.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .token_metadata_program(&ctx.accounts.token_metadata_program.to_account_info())
        .mint_args(mint_args)
        .invoke()?;

    // Bubblegum derives cNFT asset IDs from merkle tree + nonce.
    // Store a deterministic credential pointer derived from the minted agent id.
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
