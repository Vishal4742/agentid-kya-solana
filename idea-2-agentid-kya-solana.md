# 🤖 AgentID — On-Chain "Know Your Agent" (KYA) Protocol on Solana
### Full MVP Architecture & Grant Application Blueprint

> **Grant Target:** Solana Foundation India Grants via Superteam Earn (Up to $10,000)  
> **Category:** Developer Tooling / AI / Consumer App  
> **Team Size:** 1–2 engineers  
> **MVP Timeline:** 5 weeks  
> **Winning Thesis:** Visa, Stripe, OpenAI, and Google all launched AI agent identity/payment frameworks in 2025 — but every solution is off-chain and Web2-native. ERC-8004 is the only on-chain agent identity standard, and it's Ethereum-only. Solana has the most active AI agent ecosystem (ai16z, ELIZA, Virtuals) with zero on-chain identity layer. AgentID is the first Solana-native KYA protocol — arriving at exactly the moment every AI agent platform is looking for this infrastructure.

---

## 1. The Problem (The "Unique Insight" Section of Your Grant Application)

The AI agent economy exploded in 2025:
- Stripe + OpenAI launched the **Agentic Commerce Protocol (ACP)** — agents that can buy things
- Visa launched **Trusted Agent Protocol (TAP)** — merchant verification for AI agents
- Trulioo + Worldpay launched **KYA (Know Your Agent)** — Digital Agent Passports for commerce
- Google launched **AP2** — 3-layer mandate architecture for agent payments
- Solana's own **ai16z / ELIZA** became the most-forked AI agent framework on GitHub (50,000+ stars)

**The gap that nobody has filled:** Every KYA solution above is **off-chain and Web2-native**. They use JWTs, OAuth, and centralized databases. The on-chain identity standard for AI agents (ERC-8004) exists only on Ethereum. Solana — the chain with the most deployed AI agents — has **zero native on-chain identity protocol for agents**.

This matters because:

1. Solana AI agents (ELIZA, Virtuals-on-Solana clones) are already executing DeFi trades, posting on X, sending USDC payments — with **no verifiable identity, no reputation score, no audit trail**
2. Indian AI freelance agencies (a booming sector) use Claude/GPT agents to do client work — but cannot prove which agent did what work, cannot invoice compliantly, cannot receive payment as an identified entity
3. DeFi protocols on Solana (Jupiter, Kamino, Raydium) cannot distinguish a verified trading agent from a malicious bot — they have to either trust everything or block everything

**AgentID** is the Solana-native KYA layer that gives every AI agent:
- A **verifiable on-chain identity** (soul-bound NFT credential)
- A **reputation score** based on transaction history, uptime, and human feedback
- A **payment capability** via x402 (agents can earn/pay autonomously)
- An **audit trail** of every action, permanently stored on Solana

---

## 2. Market Landscape & Why Solana Wins

### Existing KYA Solutions and Their Gaps

| Solution | Chain | On-chain? | Solana-native? | India use case? | Open protocol? |
|---|---|---|---|---|---|
| Trulioo DAP | Web2 | ❌ | ❌ | ❌ | ❌ |
| Visa TAP | Web2 | ❌ | ❌ | ❌ | ❌ |
| AgentFacts | Off-chain JSON | ❌ | ❌ | ❌ | ✅ |
| Sumsub KYA | Web2 | ❌ | ❌ | Partial | ❌ |
| ERC-8004 | Ethereum | ✅ | ❌ | ❌ | ✅ |
| **AgentID** | **Solana** | **✅** | **✅** | **✅** | **✅** |

### Why Solana Is the Right Chain for Agent Identity

- **Speed:** Agent-to-agent interactions happen in milliseconds. Ethereum's 12-second finality is too slow for real-time credential verification between agents. Solana's 400ms is sufficient.
- **Cost:** If every agent action requires an on-chain credential check, Ethereum's $0.50+ fees make this prohibitively expensive at scale. Solana's $0.00025 makes 1,000 credential checks per day cost $0.25.
- **Existing ecosystem:** ai16z's ELIZA has 50,000+ GitHub stars and is already deploying agents on Solana. AgentID can be the identity layer that ELIZA integrates.
- **Composability:** Solana programs are composable — any DeFi protocol (Jupiter, Kamino) can add a one-line CPI call to verify an agent's AgentID credential before executing a trade.

---

## 3. Product Overview

AgentID has four layers, built in sequence:

```
┌─────────────────────────────────────────────────────────────────┐
│                         AGENTID                                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────┐ │
│  │  IDENTITY    │→ │  REPUTATION  │→ │  PAYMENT  │→ │  SDK  │ │
│  │  REGISTRY    │  │   ENGINE     │  │   LAYER   │  │       │ │
│  │  (Week 1–2)  │  │  (Week 3)    │  │  (Week 4) │  │(Wk 5) │ │
│  └──────────────┘  └──────────────┘  └───────────┘  └───────┘ │
│                                                                 │
│  Agent registers → Gets soul-bound NFT → Builds rep score      │
│       → Can receive x402 micropayments → ELIZA SDK plugin      │
└─────────────────────────────────────────────────────────────────┘
```

| Layer | What it does | Who uses it |
|---|---|---|
| Identity Registry | On-chain registration + soul-bound credential issuance | Agent developers |
| Reputation Engine | Score computed from on-chain history, uptime, human ratings | DeFi protocols, DAOs |
| Payment Layer | x402 micropayment receiving + autonomous USDC management | AI freelance agencies |
| SDK / Plugin | One-line ELIZA plugin + Solana program CPI interface | Any Solana developer |

---

## 4. Technical Architecture

### 4.1 Stack Overview

```
Solana Programs:  Anchor Framework (Rust)
Frontend:         Next.js 14 + TypeScript + Tailwind
NFT Standard:     Metaplex cNFT (compressed NFTs — 1000x cheaper than standard NFTs)
Payment:          x402 protocol + USDC SPL token
AI Integration:   ELIZA plugin (TypeScript), MCP server support
Indexing:         Helius DAS API (for cNFT queries) + custom webhooks
Data Storage:     Arweave (audit logs) + Solana accounts (live state)
Off-chain:        Supabase (agent metadata, human ratings UI)
Auth:             Privy (developer login + wallet connection)
```

### 4.2 Core Data Models

#### AgentIdentity Account (On-Chain)

```rust
// programs/agentid/src/state/agent_identity.rs

#[account]
pub struct AgentIdentity {
    // Identity
    pub agent_id: [u8; 32],           // Unique ID (hash of owner + name + timestamp)
    pub owner: Pubkey,                 // Human/org that deployed this agent
    pub agent_wallet: Pubkey,         // Agent's own Solana wallet (for autonomous payments)
    pub name: [u8; 64],               // Agent display name (UTF-8, null-padded)
    pub framework: AgentFramework,    // ELIZA | AUTOGEN | CREWAI | CUSTOM
    pub model: [u8; 32],             // "claude-opus-4" | "gpt-4o" | "llama-3"
    
    // Credentials
    pub credential_nft: Pubkey,       // Soul-bound cNFT address
    pub verified_level: VerifiedLevel, // UNVERIFIED | KYB_VERIFIED | AUDITED
    pub kyb_hash: [u8; 32],          // Hash of KYB document (for business-owned agents)
    pub registered_at: i64,           // Unix timestamp
    
    // Capabilities (what this agent is authorized to do)
    pub can_trade_defi: bool,
    pub can_send_payments: bool,
    pub max_tx_size_usdc: u64,        // Max single transaction in USDC (lamports-equivalent)
    pub allowed_programs: Vec<Pubkey>, // Whitelisted Solana programs this agent can call
    
    // Reputation (updated by oracle)
    pub reputation_score: u16,        // 0–1000 (like credit score)
    pub total_transactions: u64,
    pub successful_transactions: u64,
    pub human_rating: u8,             // 1–5 stars, average of all ratings
    pub last_active: i64,
    
    // India-specific
    pub gstin: [u8; 15],             // GST registration number (for Indian business agents)
    pub pan_hash: [u8; 32],          // Hashed PAN for TDS compliance
    
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AgentFramework {
    Eliza,
    AutoGen,
    CrewAI,
    LangGraph,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VerifiedLevel {
    Unverified,        // Just registered, no verification
    EmailVerified,     // Owner email verified
    KYBVerified,       // Business KYB passed (via Sumsub API)
    Audited,           // Code audited by registered auditor
}
```

#### AgentAction Account (Audit Trail)

```rust
// Every significant agent action is logged here (permanent audit trail)
#[account]
pub struct AgentAction {
    pub agent_id: [u8; 32],
    pub action_type: ActionType,
    pub program_called: Pubkey,        // Which Solana program was invoked
    pub instruction_data_hash: [u8; 32], // Hash of instruction (not full data for space)
    pub outcome: ActionOutcome,         // SUCCESS | FAILED | REVERTED
    pub lamports_spent: u64,
    pub usdc_transferred: u64,
    pub timestamp: i64,
    pub arweave_log_id: [u8; 32],      // Full log stored on Arweave
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ActionType {
    DeFiTrade,
    PaymentSent,
    ContentPublished,
    ApiCalled,
    ContractDeployed,
    HumanOverride,
}
```

### 4.3 Layer 1: Identity Registry Program

```rust
// programs/agentid/src/lib.rs

#[program]
pub mod agentid {
    use super::*;

    /// Register a new AI agent and mint its soul-bound identity credential
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        params: RegisterAgentParams,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.agent_identity;
        let clock = Clock::get()?;
        
        // Generate unique agent ID
        let agent_id = hashv(&[
            ctx.accounts.owner.key().as_ref(),
            params.name.as_bytes(),
            &clock.unix_timestamp.to_le_bytes(),
        ]).to_bytes();
        
        // Initialize identity account
        identity.agent_id = agent_id;
        identity.owner = ctx.accounts.owner.key();
        identity.agent_wallet = params.agent_wallet;
        identity.framework = params.framework;
        identity.model = params.model;
        identity.verified_level = VerifiedLevel::Unverified;
        identity.reputation_score = 500; // Start at neutral (500/1000)
        identity.registered_at = clock.unix_timestamp;
        identity.max_tx_size_usdc = params.max_tx_size_usdc;
        identity.allowed_programs = params.allowed_programs;
        identity.bump = ctx.bumps.agent_identity;
        
        // Mint soul-bound cNFT credential via Metaplex
        let credential_metadata = CredentialMetadata {
            name: format!("AgentID: {}", core::str::from_utf8(&params.name).unwrap_or("Agent")),
            uri: format!("https://api.agentid.xyz/metadata/{}", hex::encode(agent_id)),
            attributes: vec![
                Attribute { trait_type: "Framework".to_string(), value: format!("{:?}", params.framework) },
                Attribute { trait_type: "Model".to_string(), value: core::str::from_utf8(&params.model).unwrap_or("unknown").to_string() },
                Attribute { trait_type: "Owner".to_string(), value: ctx.accounts.owner.key().to_string() },
                Attribute { trait_type: "Registered".to_string(), value: clock.unix_timestamp.to_string() },
            ],
            // SOUL-BOUND: non-transferable flag
            is_non_transferable: true,
        };
        
        // CPI to Bubblegum (Metaplex compressed NFT program)
        mpl_bubblegum::cpi::mint_v1(
            ctx.accounts.mint_cnft_ctx(),
            credential_metadata.into(),
        )?;
        
        emit!(AgentRegistered {
            agent_id,
            owner: identity.owner,
            framework: identity.framework.clone(),
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Update agent capabilities (owner-only)
    pub fn update_capabilities(
        ctx: Context<UpdateCapabilities>,
        can_trade_defi: bool,
        can_send_payments: bool,
        max_tx_size_usdc: u64,
        allowed_programs: Vec<Pubkey>,
    ) -> Result<()> {
        require!(
            ctx.accounts.owner.key() == ctx.accounts.agent_identity.owner,
            AgentIdError::Unauthorized
        );
        
        let identity = &mut ctx.accounts.agent_identity;
        identity.can_trade_defi = can_trade_defi;
        identity.can_send_payments = can_send_payments;
        identity.max_tx_size_usdc = max_tx_size_usdc;
        identity.allowed_programs = allowed_programs;
        
        Ok(())
    }

    /// Verify agent identity — called by other programs to check credentials
    /// Returns: (is_registered, verified_level, reputation_score, is_authorized_for_program)
    pub fn verify_agent(
        ctx: Context<VerifyAgent>,
        calling_program: Pubkey,
        action_type: ActionType,
    ) -> Result<VerificationResult> {
        let identity = &ctx.accounts.agent_identity;
        
        let is_authorized = identity.allowed_programs.contains(&calling_program) || 
                           identity.allowed_programs.is_empty(); // empty = allow all
        
        let meets_reputation = match action_type {
            ActionType::DeFiTrade => identity.reputation_score >= 600,
            ActionType::PaymentSent => identity.reputation_score >= 400,
            _ => identity.reputation_score >= 100,
        };
        
        Ok(VerificationResult {
            is_registered: true,
            verified_level: identity.verified_level.clone(),
            reputation_score: identity.reputation_score,
            is_authorized: is_authorized && meets_reputation,
            max_tx_size_usdc: identity.max_tx_size_usdc,
        })
    }

    /// Log an agent action (called by agent or integrated programs)
    pub fn log_action(
        ctx: Context<LogAction>,
        action_type: ActionType,
        program_called: Pubkey,
        outcome: ActionOutcome,
        usdc_transferred: u64,
        arweave_log_id: [u8; 32],
    ) -> Result<()> {
        let action = &mut ctx.accounts.agent_action;
        let identity = &mut ctx.accounts.agent_identity;
        let clock = Clock::get()?;
        
        action.agent_id = identity.agent_id;
        action.action_type = action_type;
        action.program_called = program_called;
        action.outcome = outcome.clone();
        action.usdc_transferred = usdc_transferred;
        action.timestamp = clock.unix_timestamp;
        action.arweave_log_id = arweave_log_id;
        
        // Update identity stats
        identity.total_transactions += 1;
        if matches!(outcome, ActionOutcome::Success) {
            identity.successful_transactions += 1;
        }
        identity.last_active = clock.unix_timestamp;
        
        Ok(())
    }

    /// Human rates an agent interaction (1–5 stars)
    pub fn rate_agent(
        ctx: Context<RateAgent>,
        rating: u8,    // 1–5
        feedback_arweave_id: [u8; 32],
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, AgentIdError::InvalidRating);
        
        let identity = &mut ctx.accounts.agent_identity;
        
        // Rolling average of human ratings
        let current_rating = identity.human_rating as u32;
        let total_ratings = identity.total_transactions; // proxy for number of ratings
        let new_average = ((current_rating * total_ratings as u32) + rating as u32) / 
                         (total_ratings as u32 + 1);
        identity.human_rating = new_average as u8;
        
        Ok(())
    }
}
```

### 4.4 Layer 2: Reputation Engine

The reputation score (0–1000) is computed off-chain by an oracle (Helius webhook listener) and submitted on-chain via a trusted oracle account.

```typescript
// oracle/reputation-engine.ts

interface ReputationFactors {
  successRate: number;        // successful_tx / total_tx (weight: 40%)
  humanRating: number;        // 1-5 stars converted to 0-200 (weight: 20%)
  longevity: number;          // days since registration (weight: 15%)
  txVolume: number;           // total USDC processed (weight: 15%)
  verificationLevel: number;  // Unverified=0, Email=50, KYB=100, Audited=200 (weight: 10%)
}

function computeReputationScore(agent: AgentIdentity): number {
  const successRate = agent.totalTransactions > 0
    ? (agent.successfulTransactions / agent.totalTransactions) * 400
    : 200; // neutral if no transactions
  
  const humanRating = ((agent.humanRating - 1) / 4) * 200; // 1-5 → 0-200
  
  const daysSinceRegistration = (Date.now() / 1000 - agent.registeredAt) / 86400;
  const longevity = Math.min(daysSinceRegistration / 365, 1) * 150; // cap at 1 year
  
  const txVolumeScore = Math.min(agent.totalUsdcProcessed / 100000, 1) * 150; // cap at $100k
  
  const verificationScore = {
    'Unverified': 0,
    'EmailVerified': 50,
    'KYBVerified': 100,
    'Audited': 200,
  }[agent.verifiedLevel] ?? 0;
  
  const rawScore = successRate + humanRating + longevity + txVolumeScore + verificationScore;
  
  // Penalty for recent failures
  const recentFailurePenalty = agent.consecutiveFailures * 20;
  
  return Math.max(0, Math.min(1000, Math.round(rawScore - recentFailurePenalty)));
}

// Oracle submits updated score on-chain every hour
async function updateReputationOnChain(agentId: string, score: number) {
  const tx = await program.methods
    .updateReputation(score)
    .accounts({
      agentIdentity: getAgentPDA(agentId),
      oracle: oracleKeypair.publicKey,
    })
    .signers([oracleKeypair])
    .rpc();
  
  console.log(`Updated reputation for ${agentId}: ${score}/1000 | tx: ${tx}`);
}
```

### 4.5 Layer 3: Payment Layer (x402 + USDC)

Agents can receive payments autonomously via x402 and manage their own USDC treasury.

```typescript
// x402/agent-paywall.ts — Agents can gate their services behind x402 payments

import { createServer } from 'http';
import { facilitator } from '@coinbase/x402';

// An AI agent charges per API call
const agentPaywall = facilitator({
  amount: '0.01',          // $0.01 USDC per API call
  token: 'USDC',
  chain: 'solana',
  recipient: agentWalletAddress, // Agent's own Solana wallet
});

// Express middleware — any request to agent's API requires micropayment
app.use('/api/agent/execute', agentPaywall, async (req, res) => {
  // If payment verified, execute agent task
  const result = await executeAgentTask(req.body.task);
  res.json({ result });
});
```

```rust
// Agent treasury management — on-chain USDC vault for autonomous agents
#[account]
pub struct AgentTreasury {
    pub agent_id: [u8; 32],
    pub usdc_balance: u64,
    pub total_earned: u64,
    pub total_spent: u64,
    pub spending_limit_per_tx: u64,     // Max USDC per autonomous transaction
    pub spending_limit_per_day: u64,    // Daily cap
    pub spent_today: u64,
    pub day_reset_timestamp: i64,
    pub emergency_pause: bool,           // Owner can freeze agent's wallet
    pub multisig_required_above: u64,   // Require human co-sign above this amount
}

pub fn autonomous_payment(
    ctx: Context<AutonomousPayment>,
    amount: u64,
    recipient: Pubkey,
    reason_hash: [u8; 32],  // Hash of reason string (stored on Arweave)
) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    let identity = &ctx.accounts.agent_identity;
    let clock = Clock::get()?;
    
    // Safety checks
    require!(!treasury.emergency_pause, PaymentError::AgentPaused);
    require!(amount <= treasury.spending_limit_per_tx, PaymentError::ExceedsPerTxLimit);
    require!(identity.can_send_payments, PaymentError::NotAuthorized);
    require!(identity.reputation_score >= 400, PaymentError::ReputationTooLow);
    
    // Daily limit reset
    if clock.unix_timestamp > treasury.day_reset_timestamp + 86400 {
        treasury.spent_today = 0;
        treasury.day_reset_timestamp = clock.unix_timestamp;
    }
    
    require!(
        treasury.spent_today + amount <= treasury.spending_limit_per_day,
        PaymentError::ExceedsDailyLimit
    );
    
    // Require human multisig for large amounts
    if amount > treasury.multisig_required_above {
        return Err(PaymentError::RequiresHumanApproval.into());
    }
    
    // Execute USDC transfer
    token::transfer(ctx.accounts.transfer_ctx(recipient), amount)?;
    
    treasury.spent_today += amount;
    treasury.total_spent += amount;
    treasury.usdc_balance -= amount;
    
    Ok(())
}
```

### 4.6 Layer 4: ELIZA Plugin (NPM Package)

The key to adoption: a one-line plugin that any ELIZA agent can use to gain AgentID credentials.

```typescript
// @agentid/eliza-plugin/src/index.ts

import { Plugin, IAgentRuntime } from '@elizaos/core';
import { Connection, PublicKey } from '@solana/web3.js';
import { AgentIdClient } from './client';

export const agentIdPlugin: Plugin = {
  name: 'agentid',
  description: 'On-chain identity and reputation for AI agents on Solana',
  
  async initialize(runtime: IAgentRuntime) {
    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const client = new AgentIdClient(connection, runtime.agentWalletKeypair);
    
    // Register this agent if not already registered
    const existingIdentity = await client.getAgentIdentity(runtime.agentWallet.publicKey);
    
    if (!existingIdentity) {
      await client.registerAgent({
        name: runtime.agentName,
        framework: 'Eliza',
        model: runtime.modelProvider,
        capabilities: {
          canTradeDeFi: runtime.settings.canTradeDeFi ?? false,
          canSendPayments: runtime.settings.canSendPayments ?? false,
          maxTxSizeUsdc: runtime.settings.maxTxSizeUsdc ?? 100,
        }
      });
      
      console.log(`[AgentID] Registered ${runtime.agentName} on Solana. Credential NFT minted.`);
    }
    
    // Attach identity to runtime for other plugins to use
    runtime.agentIdentity = await client.getAgentIdentity(runtime.agentWallet.publicKey);
    
    // Log every significant action
    runtime.on('action:executed', async (action) => {
      await client.logAction({
        actionType: action.type,
        programCalled: action.programId,
        outcome: action.success ? 'Success' : 'Failed',
        usdcTransferred: action.usdcAmount ?? 0,
      });
    });
  },
  
  // Actions that agent can perform via AgentID
  actions: [
    {
      name: 'GET_MY_REPUTATION',
      description: 'Get this agent\'s current reputation score and credential details',
      handler: async (runtime, _message) => {
        const identity = runtime.agentIdentity;
        return `My AgentID credentials:
- Reputation Score: ${identity.reputationScore}/1000
- Verification Level: ${identity.verifiedLevel}
- Total Transactions: ${identity.totalTransactions}
- Human Rating: ${identity.humanRating}/5 ⭐
- Credential NFT: ${identity.credentialNft}
- View on Explorer: https://agentid.xyz/agent/${identity.agentId}`;
      }
    },
    {
      name: 'VERIFY_COUNTERPARTY_AGENT',
      description: 'Verify the identity and reputation of another agent before transacting',
      handler: async (runtime, message) => {
        const targetWallet = extractWalletFromMessage(message.content);
        const client = new AgentIdClient(/* ... */);
        const result = await client.verifyAgent(targetWallet, 'PaymentSent');
        
        if (!result.isAuthorized) {
          return `⚠️ Agent ${targetWallet} is NOT authorized for this action. Reputation: ${result.reputationScore}/1000. I will not transact.`;
        }
        
        return `✅ Agent ${targetWallet} verified. Rep: ${result.reputationScore}/1000, Level: ${result.verifiedLevel}. Safe to transact up to $${result.maxTxSizeUsdc}.`;
      }
    }
  ]
};

// Usage in ELIZA agent:
// import { agentIdPlugin } from '@agentid/eliza-plugin';
// const agent = new AgentRuntime({ plugins: [agentIdPlugin, ...otherPlugins] });
```

### 4.7 Frontend Architecture

```
/app
├── /register        → Agent registration wizard
│   ├── page.tsx     → Step 1: Connect wallet | Step 2: Agent details | Step 3: Capabilities
│   └── components/
│       ├── RegistrationWizard.tsx   → Multi-step form with progress bar
│       ├── CapabilityMatrix.tsx     → Toggle switches for each capability
│       └── MintConfirmation.tsx     → Shows cNFT mint transaction + Explorer link
│
├── /agent/[id]      → Public agent profile page
│   ├── page.tsx     → Agent's identity card (like a LinkedIn profile but on-chain)
│   └── components/
│       ├── IdentityCard.tsx         → Name, framework, model, owner, credential NFT
│       ├── ReputationGauge.tsx      → Visual score (0-1000) with breakdown chart
│       ├── ActivityFeed.tsx         → Recent on-chain actions (from Helius API)
│       ├── CapabilityBadges.tsx     → What this agent is authorized to do
│       └── RateAgent.tsx            → 1-5 star rating widget (on-chain tx)
│
├── /dashboard       → Agent owner dashboard
│   ├── page.tsx     → All your registered agents + their stats
│   └── components/
│       ├── AgentList.tsx            → Cards for each registered agent
│       ├── TreasuryWidget.tsx       → USDC balance + spending limits
│       ├── EmergencyPause.tsx       → One-click freeze agent wallet
│       └── SpendingControls.tsx     → Adjust daily/per-tx limits
│
├── /verify          → Verification widget (embeddable)
│   ├── page.tsx     → Enter wallet address → get instant verification report
│   └── components/
│       └── VerificationReport.tsx   → Is authorized? For what? Score? Embed code.
│
└── /docs            → Developer documentation
    ├── page.tsx     → API reference, SDK docs, CPI integration guide
    └── components/
        ├── CodeBlock.tsx            → Syntax-highlighted code examples
        └── AnchorCPIGuide.tsx       → How DeFi protocols integrate AgentID
```

---

## 5. India-Specific Use Case: AI Freelance Agency Compliance

This is the killer use case that makes AgentID uniquely compelling for the Superteam India grant committee.

### The Problem
India's AI freelance market is exploding. Agencies are using Claude/GPT agents to:
- Write code for international clients
- Generate content at scale
- Manage social media accounts
- Do research and analysis

But these agencies face a critical compliance problem: **TDS (Tax Deducted at Source) on payments to AI agents.**

Under India's Section 194-O (TDS on e-commerce), if an AI agent invoices and receives payment, who is the taxpayer? Is the agent a "person" for tax purposes? The IT department has no framework for this.

**AgentID solves this by:**
1. Linking every agent to a verified human/business owner (KYB)
2. Storing the owner's GSTIN and PAN hash on-chain
3. Generating automated TDS-compliant payment receipts
4. Creating an auditable trail that income tax authorities can verify

### Implementation: Indian AI Agency Compliance Module

```typescript
// india/compliance.ts

interface IndianAgentCompliance {
  agentId: string;
  ownerGstin: string;          // GST registration number
  ownerPanHash: string;        // Hashed PAN (for TDS)
  serviceCategory: string;     // "Software Development" | "Content Creation" | etc.
  tdsRate: number;             // 1% for most digital services
}

async function generateTDSCompliantInvoice(
  agentId: string,
  amount: number,
  clientPan: string
): Promise<Invoice> {
  const identity = await agentIdClient.getAgentIdentity(agentId);
  
  return {
    invoiceNumber: `AID-${agentId.slice(0, 8)}-${Date.now()}`,
    agentName: identity.name,
    agentOwnerGstin: identity.gstin,
    serviceDescription: "AI-powered digital services",
    grossAmount: amount,
    tdsDeducted: amount * 0.01,    // 1% TDS
    netPayable: amount * 0.99,
    onChainProof: identity.credentialNft,  // cNFT address as proof of agent identity
    timestamp: new Date().toISOString(),
    // Complies with Rule 31A (TDS certificate filing)
    form26QSection: "194J",  // Professional/technical services
  };
}
```

---

## 6. MVP Milestones (5 Weeks)

### Week 1–2: Identity Registry
- [ ] Deploy AgentIdentity account program on Solana devnet (Anchor)
- [ ] Integrate Metaplex Bubblegum for soul-bound cNFT minting
- [ ] Build registration UI (Next.js): name, framework, capabilities
- [ ] Test: Register 5 mock agents, verify cNFT minting on devnet
- [ ] **Grant Milestone:** GitHub repo with working devnet registration + Explorer link

### Week 3: Reputation Engine
- [ ] Build Helius webhook listener for action events
- [ ] Implement reputation computation algorithm
- [ ] Build oracle that submits scores on-chain
- [ ] Build public agent profile page (identity card + reputation gauge)
- [ ] **Grant Milestone:** Public profile URL for 3 test agents showing live score

### Week 4: Payment Layer + ELIZA Plugin
- [ ] Implement AgentTreasury program (autonomous USDC management)
- [ ] Add x402 micropayment server middleware
- [ ] Build @agentid/eliza-plugin npm package
- [ ] Test: ELIZA agent registers, logs actions, receives x402 payment
- [ ] **Grant Milestone:** ELIZA plugin demo video — agent earns USDC autonomously

### Week 5: Mainnet + Developer Docs
- [ ] Audit Anchor programs (submit to Sec3 X-ray for automated audit)
- [ ] Deploy on Solana mainnet
- [ ] Publish @agentid/eliza-plugin to npm
- [ ] Write developer documentation (CPI integration guide for DeFi protocols)
- [ ] Onboard 3 real ELIZA agents from Indian AI developers
- [ ] **Grant Milestone:** 3 agents on mainnet with real reputation scores

---

## 7. Go-To-Market: First 30 Days

**Week 1:** Post in ai16z Discord and ELIZA GitHub repo. "We built an AgentID plugin for ELIZA — your agent now has an on-chain passport." This targets the 50,000+ ELIZA developers.

**Week 2:** Contact 5 Indian AI freelance agencies. Offer free KYB verification + compliance report for being first adopters. Show TDS compliance module.

**Week 3:** Write a blog post: *"Your AI agent is operating on Solana without an identity. Here's why that's a problem — and how to fix it in 2 lines of code."*

**Week 4:** Submit to Solana Foundation's Developer Hub as an official tool. Apply to the Solana Foundation's active AI RFP with AgentID as the KYA infrastructure layer.

**Success metric for grant:** 10 registered agents on mainnet + 1 DeFi protocol that has integrated AgentID's verify_agent CPI call + @agentid/eliza-plugin published on npm with 100+ downloads.

---

## 8. Competitive Moat: Why This Is Hard to Copy

Once AgentID has:
1. First-mover status as the canonical agent identity on Solana
2. ELiZA plugin with real users
3. DeFi protocols that have integrated the CPI call

...it becomes extremely hard to replace, because:
- **Network effects:** Reputation scores are meaningless without history. Early agents accumulate months of data that new entrants can't replicate.
- **Integration lock-in:** DeFi protocols that integrate `verify_agent` won't switch once it's working.
- **Regulatory positioning:** If Indian regulators formalize KYA requirements (likely in 2026–2027 as per AI Act trends), AgentID is already the established standard.

---

## 9. Technical Risk & Mitigations

| Risk | Mitigation |
|---|---|
| Soul-bound NFTs can't be revoked if agent is compromised | Implement emergency_pause on AgentTreasury + add owner-controlled blacklist to Identity Registry |
| Reputation oracle is centralized | Open-source oracle code. Plan for decentralized oracle (Switchboard) in v2. |
| ELIZA adoption depends on third-party framework | Also build LangGraph and AutoGen adapters in parallel (same core, different wrappers) |
| Indian KYB API reliability | Use Sumsub as primary, HyperVerge as fallback — both have India-specific document verification |
| Anchor program bugs | Submit to Sec3 X-ray (free automated audit) before mainnet. Limit max USDC per agent to $500 initially. |

---

## 10. Grant Application: Key Sections Pre-Written

### "What is your unique insight?"
> Visa, Stripe, OpenAI, and Google all launched AI agent identity frameworks in 2025 — but every solution is off-chain and Web2-native. The on-chain standard (ERC-8004) only exists on Ethereum. Solana, which has the most active AI agent ecosystem via ai16z's ELIZA, has zero native identity protocol for agents. As agents begin autonomously executing DeFi trades, sending USDC, and invoicing clients, the lack of verifiable on-chain identity is a billion-dollar security gap. AgentID fills it — specifically for Solana and specifically for the Indian AI freelance market where TDS compliance creates an urgent, real-world need for agent identity infrastructure.

### "What is your proof of work?"
> [GitHub repo with Anchor programs] [devnet registration demo] [@agentid/eliza-plugin npm package] [public agent profile page] [Previous Superteam bounties/hackathon submissions]

### "What are your milestones?"
> Milestone 1 ($3,000): Identity Registry live on mainnet + 5 registered agents  
> Milestone 2 ($4,000): ELIZA plugin published with 50+ downloads + reputation engine live  
> Milestone 3 ($3,000): 1 DeFi protocol CPI integration + India compliance module + docs

### "Why Solana specifically?"
> Agent-to-agent credential verification needs to be fast (Solana: 400ms) and cheap (Solana: $0.00025). If every agent action requires an on-chain identity check, Ethereum's $0.50+ gas makes it economically unviable. Solana is the only L1 where real-time agent identity verification at scale is economically possible. Additionally, Solana's existing AI agent ecosystem (ai16z, Virtuals forks) gives AgentID an immediate distribution channel with no cold-start problem.

---

## 11. Open Source Commitment

All code open-sourced immediately on mainnet:
- `programs/agentid/` — Anchor programs (MIT License)
- `@agentid/eliza-plugin` — npm package (MIT License)
- `@agentid/sdk` — TypeScript SDK (MIT License)
- Oracle code — open-sourced with decentralized upgrade path

This creates a public good that any Solana AI developer can build on — exactly the "composable infrastructure" philosophy the grant prioritizes.

---

*Document version: 1.0 | Last updated: February 2026*  
*For questions: Apply at superteam.fun/earn | Contact: in@superteam.fun*  
*Research sources: a16z 2026 Crypto Predictions, Trulioo KYA Report, Akamai Agentic Commerce Report, AgentFacts Standard, Solana Foundation AI RFP*
