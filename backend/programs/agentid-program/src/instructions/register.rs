use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use mpl_bubblegum::{
    instructions::MintV1CpiBuilder,
    types::{Creator, MetadataArgs, TokenProgramVersion, TokenStandard},
};

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
    /// URI of the off-chain metadata JSON
    pub metadata_uri: String,
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

    // ── Bubblegum / cNFT accounts ─────────────────────────────────────────────
    // All UncheckedAccount to avoid anchor-lang version conflicts with
    // spl-account-compression's transitive anchor dependency.

    /// CHECK: PDA of the Merkle tree, validated by Bubblegum
    #[account(mut)]
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: The SPL Account Compression Merkle tree
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: spl-noop log wrapper (verified by Bubblegum CPI)
    pub log_wrapper: UncheckedAccount<'info>,

    /// CHECK: SPL Account Compression program (verified by Bubblegum CPI)
    pub compression_program: UncheckedAccount<'info>,

    /// CHECK: Metaplex Bubblegum program — caller must pass the correct address
    pub bubblegum_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn process_register_agent(
    ctx: Context<RegisterAgent>,
    params: RegisterAgentParams,
) -> Result<()> {
    require!(
        params.name.len() >= 3 && params.name.len() <= 64,
        AgentIdError::InvalidNameLength
    );
    require!(
        params.gstin.is_empty() || params.gstin.len() == 15,
        AgentIdError::InvalidGstin
    );

    // Verify the bubblegum program address defensively
    require_keys_eq!(
        ctx.accounts.bubblegum_program.key(),
        mpl_bubblegum::ID,
        AgentIdError::InvalidRecipient // reused error; swap for InvalidProgram if you add it
    );

    let now = Clock::get()?.unix_timestamp;

    // ── Derive deterministic agent_id ────────────────────────────────────────
    let mut seed_data = Vec::new();
    seed_data.extend_from_slice(&ctx.accounts.owner.key().to_bytes());
    seed_data.extend_from_slice(params.name.as_bytes());
    seed_data.extend_from_slice(&now.to_le_bytes());
    let agent_id = hash(&seed_data).to_bytes();

    // ── Mint soul-bound cNFT via Bubblegum 1.4.0 CpiBuilder ─────────────────
    let metadata = MetadataArgs {
        name: params.name.chars().take(32).collect(),
        symbol: String::from("AGID"),
        uri: params.metadata_uri.clone(),
        seller_fee_basis_points: 0,
        primary_sale_happened: false,
        is_mutable: false, // soul-bound: immutable
        edition_nonce: None,
        token_standard: Some(TokenStandard::NonFungible),
        collection: None,
        uses: None,
        token_program_version: TokenProgramVersion::Original,
        creators: vec![Creator {
            address: ctx.accounts.owner.key(),
            verified: false,
            share: 100,
        }],
    };

    MintV1CpiBuilder::new(&ctx.accounts.bubblegum_program)
        .tree_config(&ctx.accounts.tree_authority)
        .leaf_owner(&ctx.accounts.owner)
        .leaf_delegate(&ctx.accounts.owner)
        .merkle_tree(&ctx.accounts.merkle_tree)
        .payer(&ctx.accounts.owner)
        .tree_creator_or_delegate(&ctx.accounts.owner)
        .log_wrapper(&ctx.accounts.log_wrapper)
        .compression_program(&ctx.accounts.compression_program)
        .system_program(&ctx.accounts.system_program)
        .metadata(metadata)
        .invoke()?;

    // Use agent_id as stable on-chain credential reference.
    // Actual leaf asset ID is resolved off-chain via Helius DAS API.
    let credential_nft = Pubkey::new_from_array(agent_id);

    // ── Populate identity account ─────────────────────────────────────────────
    let identity = &mut ctx.accounts.identity;
    identity.agent_id = agent_id;
    identity.owner = ctx.accounts.owner.key();
    identity.agent_wallet = params.agent_wallet;
    identity.name = params.name.clone();
    identity.framework = params.framework;
    identity.model = params.model;
    identity.credential_nft = credential_nft;
    identity.verified_level = 0;
    identity.registered_at = now;
    identity.last_active = now;
    identity.can_trade_defi = params.can_trade_defi;
    identity.can_send_payments = params.can_send_payments;
    identity.can_publish_content = params.can_publish_content;
    identity.can_analyze_data = params.can_analyze_data;
    identity.max_tx_size_usdc = params.max_tx_size_usdc;
    identity.reputation_score = 500;
    identity.total_transactions = 0;
    identity.successful_transactions = 0;
    identity.human_rating_x10 = 0;
    identity.rating_count = 0;
    identity.gstin = params.gstin;
    identity.pan_hash = params.pan_hash;
    identity.service_category = params.service_category;
    identity.bump = ctx.bumps.identity;

    emit!(AgentRegistered {
        owner: ctx.accounts.owner.key(),
        agent_id,
        name: identity.name.clone(),
        credential_nft,
        registered_at: now,
    });

    Ok(())
}

#[event]
pub struct AgentRegistered {
    pub owner: Pubkey,
    pub agent_id: [u8; 32],
    pub name: String,
    pub credential_nft: Pubkey,
    pub registered_at: i64,
}
