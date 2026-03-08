use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AgentIdentity {
    /// Unique hash of (owner + name + registered_at)
    pub agent_id: [u8; 32],

    /// The wallet that registered this agent (signs owner-gated ix)
    pub owner: Pubkey,

    /// The agent's operational wallet (may differ from owner)
    pub agent_wallet: Pubkey,

    /// Human-readable agent name (max 64 chars)
    #[max_len(64)]
    pub name: String,

    /// AI framework enum: 0=ELIZA 1=AutoGen 2=CrewAI 3=LangGraph 4=Custom
    pub framework: u8,

    /// LLM model name (max 32 chars)
    #[max_len(32)]
    pub model: String,

    /// Pubkey of the soulbound cNFT credential (set after Metaplex mint)
    pub credential_nft: Pubkey,

    /// 0=Unverified 1=EmailVerified 2=KYBVerified 3=Audited
    pub verified_level: u8,

    /// Unix timestamp of registration
    pub registered_at: i64,

    /// Last active timestamp
    pub last_active: i64,

    // ── Capabilities ──────────────────────────────────────────
    pub can_trade_defi: bool,
    pub can_send_payments: bool,
    pub can_publish_content: bool,
    pub can_analyze_data: bool,

    /// Max USDC per transaction (in USDC lamports, 6 decimals)
    pub max_tx_size_usdc: u64,

    // ── Reputation ────────────────────────────────────────────
    /// 0–1000 reputation score (oracle-updated)
    pub reputation_score: u16,
    pub total_transactions: u64,
    pub successful_transactions: u64,

    /// Rolling average human rating (1–50, divide by 10 for display)
    pub human_rating_x10: u16,
    pub rating_count: u32,

    // ── India Compliance ──────────────────────────────────────
    /// GSTIN (max 15 chars): format 22AAAAA0000A1Z5
    #[max_len(15)]
    pub gstin: String,

    /// SHA-256 hash of PAN (never store raw PAN on-chain)
    pub pan_hash: [u8; 32],

    /// TDS service category: 0=IT 1=Finance 2=Consulting 3=Marketing 4=RnD
    pub service_category: u8,

    // ── PDA ───────────────────────────────────────────────────
    pub bump: u8,
}

impl AgentIdentity {
    /// PDA seeds: [b"agent-identity", owner_pubkey]
    pub const SEED_PREFIX: &'static [u8] = b"agent-identity";
}

// ─────────────────────────────────────────────────────────────
// AgentAction — one record per logged on-chain event
// ─────────────────────────────────────────────────────────────
#[account]
#[derive(InitSpace)]
pub struct AgentAction {
    pub agent_identity: Pubkey,
    pub action_type: u8,       // 0=DeFiTrade 1=Payment 2=ContentPublish 3=DataQuery
    pub program_called: Pubkey,
    pub success: bool,
    pub usdc_transferred: u64,
    pub timestamp: i64,
    #[max_len(64)]
    pub memo: String,
    pub bump: u8,
}

// ─────────────────────────────────────────────────────────────
// ProgramConfig — stores oracle authority (one global PDA)
// ─────────────────────────────────────────────────────────────
#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub oracle_authority: Pubkey,
    pub bump: u8,
}

impl ProgramConfig {
    pub const SEED_PREFIX: &'static [u8] = b"program-config";
}

// ─────────────────────────────────────────────────────────────
// Return type for verify_agent CPI
// ─────────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerificationResult {
    pub is_registered: bool,
    pub verified_level: u8,
    pub reputation_score: u16,
    pub is_authorized: bool,
    pub agent_name: String,
}
