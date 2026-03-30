# AgentID KYA on Solana
## Master Build Guide

> Repo: `Vishal4742/agentid-kya-solana`
> Last Updated: March 30, 2026 (comprehensive verification and cleanup)
> Program ID (devnet/local config): `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`

## Project Snapshot

AgentID is a production-ready Solana project for AI-agent identity, reputation, and verification. The current repository contains:

- **Anchor Program**: 12-instruction smart contract with identity, reputation, verification, and autonomous treasury management
- **Bubblegum Integration**: Soul-bound cNFT credential minting via Metaplex Bubblegum CPI
- **Vite/React Frontend**: Full-featured UI with wallet integration, dashboard, registration, and treasury management
- **Oracle Service**: Node/Express reputation oracle with webhook validation and on-chain score updates
- **x402 Middleware**: HTTP 402 Payment Required enforcement with on-chain USDC verification
- **Metadata API**: Vercel-ready serverless API for agent metadata (hex-ID and name-based routes)
- **SDK & ELIZA Plugin**: TypeScript packages for external integrations

This guide reflects the actual implemented codebase as of March 30, 2026. Phase 1 identity work is operationally complete.

## Current Status

### Working in the repo

- Anchor program source is present under `backend/programs/agentid-program`
- frontend routes exist for `/`, `/register`, `/agents`, `/agent/:id`, `/dashboard`, `/verify`, and `/docs`
- `useProgram()` loads the shipped Anchor IDL from `frontend/src/idl/agentid_program.json`
- `useAgents()` and `useMyAgent()` fetch real `AgentIdentity` accounts
- the oracle service exists under `backend/oracle`
- local package folders exist under `packages/sdk` and `packages/eliza-plugin`

### Implemented On-Chain Instructions

The current `lib.rs` exposes these 12 instructions:

**Identity & Reputation** (7 instructions)
1. `init_config` — Initializes the global program config (oracle authority); secured against re-initialization
2. `register_agent` — Creates `AgentIdentity` PDA **and mints soul-bound cNFT via Bubblegum CPI** with deterministic agent_id
3. `update_capabilities` — Updates DeFi/payment capability flags; owner-signed
4. `verify_agent` — Checks agent authorization for a given action type; CPI-callable; **fail-closed for unknown action types**
5. `log_action` — Creates `AgentAction` PDA and increments identity stats; **owner-only enforcement**
6. `rate_agent` — Records 1–5 star rating; rater cannot be the owner
7. `update_reputation` — Oracle-driven reputation score update with timestamp event

**Treasury Suite** (5 instructions)
8. `initialize_treasury` — Initializes `AgentTreasury` PDA with USDC token account and configurable spending limits
9. `autonomous_payment` — Executes SPL token transfer within spending limits; **respects emergency pause flag**
10. `deposit` — Deposits USDC into the treasury token account
11. `update_spending_limits` — Updates daily and per-tx USDC spending limits; owner-only
12. `emergency_pause` — Toggles `emergency_pause` boolean on the treasury; owner-only

### Fully Implemented Features

✅ **Bubblegum cNFT Minting**: `register_agent` performs full Metaplex Bubblegum CPI with:
  - MintV1CpiBuilder integration (mpl-bubblegum 5.0.2)
  - Deterministic agent_id derived from (owner + name + timestamp)
  - Soul-bound NFT with immutable metadata
  - Shared-tree minting signed by the program-config PDA as Bubblegum tree delegate
  - Defensive program address validation
  - All required accounts: tree_authority, merkle_tree, tree_delegate, log_wrapper, compression_program, bubblegum_program
  - Localnet-safe fallback for tests when Bubblegum is not deployed on the active cluster

✅ **Treasury**: Fully operational on devnet with:
  - USDC spending limits (per-transaction, per-day rolling window)
  - Multisig requirement above configurable threshold
  - Emergency pause capability
  - UI in `Dashboard.tsx` with `TREASURY_ENABLED=true` (line 23)

✅ **x402 Payment Middleware**: Complete implementation at `backend/x402/middleware.ts`:
  - Verifies on-chain USDC transactions via Solana RPC
  - HMAC signature validation on `x-payment-signature` header
  - In-memory replay protection (24hr TTL, 5-min pruning)
  - Returns HTTP 402 if payment missing or insufficient
  - Sets `res.locals.verifiedPayment` for downstream handlers

✅ **Security Hardening**:
  - `verify_agent` fail-closed for unknown action types (test in `backend/tests/security.ts`)
  - `log_action` owner-only enforcement (unauthorized callers rejected)
  - `init_config` re-initialization protection (first-writer wins)
  - registration rejects empty metadata URIs, default agent wallets, empty capability sets, invalid service categories, and zero payment limits for payment-enabled agents
  - `update_capabilities` rejects disabling all capabilities
  - `log_action` rejects unknown action types and memos longer than 64 characters

✅ **Phase 1 Operations**:
  - identity deployment and recovery runbook exists at `PHASE1_IDENTITY_RUNBOOK.md`
  - `backend/scripts/create-merkle-tree.ts` creates the shared devnet tree using the configured wallet
  - `backend/scripts/set-tree-delegate.ts` delegates shared-tree mint authority to the program PDA
  - `backend/scripts/verify-phase1-devnet.ts` exercises non-admin registration, verification, action logging, rating, and oracle reputation updates on devnet

## Architecture

### Fully Implemented Layers

**L1 Identity**: `AgentIdentity` PDA stores agent profile, capabilities, rating, and compliance fields
  - PDA seeds: `["agent-identity", owner.key()]`
  - Stores: agent_id (deterministic hash), owner, agent_wallet, name, framework, model, credential_nft (Bubblegum), verified_level, timestamps, capability flags, USDC limits, reputation score, transaction counters, rating counters, India compliance (GSTIN, PAN hash, service category)

**L2 Reputation**: Oracle service recalculates and writes `reputation_score` on-chain
  - Webhook-triggered updates (Helius integration)
  - Hourly cron-based reputation sync
  - HMAC-SHA256 webhook validation (`backend/api/webhook.ts`)
  - Exponential backoff retry strategy with configurable jitter

**L3 Verification**: `verify_agent` returns authorization data for external consumers
  - CPI-callable by DeFi protocols
  - Fail-closed for unknown action types (security best practice)
  - Returns `VerificationResult` struct

**L4 Treasury**: Autonomous agent spending with safety constraints
  - Per-transaction and per-day USDC limits
  - 24-hour rolling window for daily spending calculations
  - Emergency pause capability
  - Multisig requirement above configurable threshold
  - SPL token transfer integration

**L5 Integration**: Complete external integration layer
  - `@agentid/sdk`: TypeScript SDK with public API for all 12 instructions
  - `@agentid/eliza-plugin`: ELIZA framework integration
  - Metadata API: Serverless Vercel functions for agent metadata (hex-ID and name-based routes)
  - x402 middleware: HTTP 402 Payment Required enforcement

## What The Current Program Actually Stores

### AgentIdentity PDA

Seeds: `["agent-identity", owner.key()]`

Fields:
- `agent_id: [u8; 32]` — Deterministic hash of (owner + name + timestamp)
- `owner: Pubkey` — Wallet that registered the agent (signs owner-gated instructions)
- `agent_wallet: Pubkey` — Agent's operational wallet (may differ from owner)
- `name: String` — Human-readable agent name (max 64 chars)
- `framework: u8` — AI framework enum: 0=ELIZA, 1=AutoGen, 2=CrewAI, 3=LangGraph, 4=Custom
- `model: String` — LLM model name (max 32 chars)
- `credential_nft: Pubkey` — **Soul-bound cNFT minted via Bubblegum CPI** (deterministic from agent_id)
- `verified_level: u8` — 0=Unverified, 1=EmailVerified, 2=KYBVerified, 3=Audited
- `registered_at: i64` — Unix timestamp of registration
- `last_active: i64` — Last active timestamp
- Capability flags: `can_trade_defi`, `can_send_payments`, `can_publish_content`, `can_analyze_data`
- `max_tx_size_usdc: u64` — Maximum USDC per transaction (6 decimals)
- `reputation_score: u16` — 0–1000 reputation score (oracle-updated)
- `total_transactions: u64`, `successful_transactions: u64` — Transaction counters
- `human_rating_x10: u16`, `rating_count: u32` — Rolling average human rating (divide by 10 for display)
- India compliance: `gstin: String` (15 chars), `pan_hash: [u8; 32]`, `service_category: u8`

### AgentTreasury PDA

Seeds: `["agent-treasury", agent_identity.key()]`

Fields:
- `agent_identity: Pubkey` — Link to the agent's identity account
- `treasury_token_account: Pubkey` — Associated token account holding USDC
- `mint: Pubkey` — USDC mint address (devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
- `spending_limit_per_tx: u64` — Maximum USDC per autonomous transaction
- `spending_limit_per_day: u64` — Maximum USDC per 24-hour rolling window
- `multisig_required_above: u64` — Transactions above this threshold require multisig
- `daily_spent: u64`, `daily_reset_at: i64` — Rolling window tracking
- `emergency_pause: bool` — If true, blocks all autonomous payments

### AgentAction PDA

Seeds: `["agent-action", agent_identity.key(), action_id.to_le_bytes()]`

Fields:
- `action_id: u64` — Sequential action counter
- `agent_identity: Pubkey` — Link to agent
- `action_type: u8` — 0=DeFi Trade, 1=Payment, 2=Content, 3=Other
- `timestamp: i64`, `success: bool`, `metadata_uri: String`

## Frontend Status

### Live Integrations

- **Routes**: 7 production routes implemented
  - `/` — Landing page with agent showcase
  - `/register` — Agent registration form with Bubblegum cNFT minting
  - `/agents` — Browse all registered agents
  - `/agent/:id` — Individual agent profile page
  - `/dashboard` — Agent owner dashboard with treasury management
  - `/verify` — Agent verification interface
  - `/docs` — Documentation page

- **Wallet Integration**: Full wallet adapter wiring
  - Phantom and Solflare support
  - Transaction signing and submission
  - Real-time account updates via `useProgram()` hook

- **Dashboard Features**:
  - Treasury panel with USDC balance display
  - Spending limit configuration (per-tx, per-day)
  - Emergency pause toggle
  - Skeleton loaders for async states
  - Error/retry UX for failed transactions
  - India compliance invoice modal with TDS breakdown and PAN validation
  - `TREASURY_ENABLED=true` (line 23) — **Treasury UI is live**

- **Data Hooks**:
  - `useProgram()` — Loads Anchor IDL from `frontend/src/idl/agentid_program.json`
  - `useAgents()` — Fetches all `AgentIdentity` accounts
  - `useMyAgent()` — Fetches user's registered agent
  - `useWallet()` — Wallet adapter integration

### Dev Server Configuration

- **Port**: `8080` (configured in `vite.config.ts`)
- **Host**: `::` (IPv6 localhost, resolves to 0.0.0.0)
- **HMR**: Hot module replacement enabled
- **Build**: Vite + React + SWC compiler

### Current Status

- ✅ All core UI flows implemented (register, browse, verify, dashboard)
- ✅ Treasury UI live with real on-chain calls
- ✅ Error states and skeleton loaders throughout
- ✅ India compliance modal for TDS calculation and invoice generation
- 🔄 Landing page uses mix of live data and fallback showcase

## Backend Status

### Oracle Service (`backend/oracle`)

**Fully Operational**:
- Express webhook receiver at `/webhook` endpoint
- HMAC-SHA256 signature validation via `ORACLE_WEBHOOK_SECRET`
- Helius webhook integration for on-chain event monitoring
- Hourly cron-based reputation recalculation
- Exponential backoff retry strategy for failed on-chain updates
- Reputation score computation and on-chain writing via `update_reputation` instruction

**Configuration**:
- Environment variables: `ORACLE_WALLET_PATH`, `ORACLE_WEBHOOK_SECRET`, `HELIUS_WEBHOOK_AUTH`
- Package: Node + Express + `@coral-xyz/anchor` + `node-cron`
- Dev command: `npm run dev` → `ts-node src/index.ts`

### Webhook Validation Middleware (`backend/api/webhook.ts`)

**Features**:
- HMAC-SHA256 signature validation for incoming webhooks
- Timing-safe comparison to prevent timing attacks
- Configurable retry logic with exponential backoff and jitter
- JSDoc documentation for operator setup
- Reusable middleware: `validateWebhookSignature()`, `requireValidWebhook()`, `withRetry()`

### Metadata API (`backend/api/metadata`)

**Routes**:
- `/metadata/[agentId]` — Hex-ID based metadata lookup (e.g., `/metadata/abc123def...`)
- `/metadata/[agentName]` — Name-based metadata lookup (e.g., `/metadata/MyAgent`)

**Deployment**:
- Vercel-ready serverless functions
- Returns JSON metadata for off-chain consumers
- Fetches real `AgentIdentity` data from Solana RPC

### x402 Payment Middleware (`backend/x402/middleware.ts`)

**Complete Implementation**:
- HTTP 402 Payment Required enforcement
- Verifies `x-payment-signature` header against on-chain USDC transactions
- Queries Solana RPC to confirm payment on devnet
- Validates USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- In-memory replay protection: 24-hour TTL, 5-minute pruning
- Sets `res.locals.verifiedPayment` for downstream handlers
- Returns 402 if payment missing or insufficient

**Limitation**: Replay protection is in-memory only; not persisted across process restarts.

## SDK And ELIZA Status

### SDK (`packages/sdk`)

**Package**: `@agentid/sdk` v0.1.0

**Public API**:
- `AgentIdClient` — Program wrapper with all 12 instructions
- Constants: `PROGRAM_ID`, `DEVNET_RPC`, Bubblegum/SPL program IDs
- Types: `AgentFramework`, `VerifiedLevel`, `ActionType`, `ServiceCategory`
- Interfaces: `RegisterAgentParams`, `AgentIdentity`, `TreasuryInfo`, `VerificationResult`
- Helpers: `deriveTreeAuthority()` for Merkle tree PDA derivation

**Methods**:
- `registerAgent()` — Full Bubblegum cNFT minting with 8 required accounts
- `getAgentIdentity()` — Fetch agent by PDA
- `verifyAgent()` — Check agent authorization (fail-closed for unknown actions)
- `rateAgent()` — Submit 1–5 star rating
- `logAction()` — Record on-chain action
- `getAllAgents()` — Fetch all registered agents
- **Treasury methods**: `initializeTreasury()`, `depositToTreasury()`, `updateSpendingLimits()`, `emergencyPause()`, `getTreasury()`, `autonomousPayment()`

**Testing**:
- Vitest test suite in `packages/sdk/src/index.test.ts`
- Covers: PDA derivation, verifyAgent logic, RegisterAgentParams contract, constant validation

**Status**:
- ✅ Fully aligned with 12-instruction IDL
- ✅ Peer dependencies: `@coral-xyz/anchor ^0.30.1`, `@solana/web3.js ^1.98.4`
- ✅ Build: `npm run build` → TypeScript compilation to `dist/`
- 🔄 Not yet published to npm

### ELIZA Plugin (`packages/eliza-plugin`)

**Package**: `@agentid/eliza-plugin` v0.1.0

**Actions**:
- `GET_MY_REPUTATION` — Query agent's reputation score
- `VERIFY_COUNTERPARTY_AGENT` — Verify another agent before interaction
- `onActionExecuted` — Auto-log hook for tracking agent actions

**Exports**:
- Re-exports SDK types: `TreasuryInfo`, `RegisterAgentParams`
- ELIZA-specific action handlers and validators

**Status**:
- ✅ Synchronized with SDK v0.1.0
- ✅ Fail-closed verification propagated from SDK
- ✅ Description updated to reflect current capabilities
- 🔄 Not yet published to npm

## Build & Test Commands

### Backend Anchor Program

```bash
cd backend
yarn install           # Install dependencies
anchor build           # Compile Rust program
anchor test            # Run test suite (includes security tests)
anchor deploy --provider.cluster devnet   # Deploy to devnet
```

**IDL Sync**: After every `anchor build`, run:
```powershell
.\scripts\sync-idl.ps1
```
This copies IDL JSON and TypeScript types to `packages/sdk/src/idl/` and `frontend/src/idl/`.

**Tests**:
- `backend/tests/agentid-program.ts` — Main integration tests (identity, treasury, ratings)
- `backend/tests/security.ts` — Security constraint tests (fail-closed verification, owner-only logging, config re-init protection)

### Frontend

```bash
cd frontend
npm install            # Install dependencies
npm run dev            # Dev server on http://localhost:8080
npm run build          # Production build
npm run lint           # ESLint
npm test               # Run Vitest tests
```

### Oracle Service

```bash
cd backend/oracle
npm install            # Install dependencies
npm run dev            # Start development server

# Environment variables required:
# - ORACLE_WALLET_PATH: Path to oracle keypair JSON
# - ORACLE_WEBHOOK_SECRET: HMAC secret for webhook validation
# - HELIUS_WEBHOOK_AUTH: Helius API authentication token
```

### SDK & ELIZA Plugin

```bash
# SDK
cd packages/sdk
npm install
npm run build          # Compile TypeScript → dist/
npm test               # Run Vitest tests

# ELIZA Plugin
cd packages/eliza-plugin
npm install
npm run build          # Compile TypeScript → dist/
```

### Metadata API (Vercel)

```bash
cd backend/api
npm install
npm run dev            # Local development server
vercel deploy          # Deploy to Vercel (requires vercel CLI)
```

## Implementation Status

### Fully Completed Features ✅

| Feature | Status | Location |
|---------|--------|----------|
| **Anchor Program** | ✅ Live on devnet | `backend/programs/agentid-program` |
| **Bubblegum cNFT Minting** | ✅ Fully integrated | `register.rs` lines 97-128 |
| **Identity & Reputation** | ✅ 7 instructions live | `lib.rs` instructions 1-7 |
| **Treasury Suite** | ✅ 5 instructions live | `lib.rs` instructions 8-12 |
| **Security Hardening** | ✅ Fail-closed, owner checks | `security.ts` tests |
| **Frontend UI** | ✅ 7 routes, wallet integration | `frontend/src` |
| **Treasury Dashboard** | ✅ Live with real calls | `Dashboard.tsx` line 23 (enabled) |
| **Oracle Service** | ✅ Webhook + cron updates | `backend/oracle` |
| **Webhook Validation** | ✅ HMAC-SHA256 + retry | `backend/api/webhook.ts` |
| **Metadata API** | ✅ Hex-ID & name routes | `backend/api/metadata` |
| **x402 Middleware** | ✅ On-chain verification | `backend/x402/middleware.ts` |
| **SDK** | ✅ 12-instruction API | `packages/sdk` |
| **ELIZA Plugin** | ✅ Reputation + verification | `packages/eliza-plugin` |
| **IDL Sync Script** | ✅ PowerShell automation | `scripts/sync-idl.ps1` |
| **Test Coverage** | ✅ Integration + security | `backend/tests/` |

### Remaining Work 🔄

| Task | Priority | Notes |
|------|----------|-------|
| **Publish SDK to npm** | P1 | Package ready, needs versioning discipline |
| **Publish ELIZA Plugin to npm** | P1 | Package ready, needs changelog |
| **Replace x402 in-memory replay** | P2 | Needs shared store for production |
| **Define exact x402 settlement rules** | P2 | Business logic finalization |
| **Reputation formula audit** | P2 | Prevent manipulation via weak signals |
| **End-to-end verification flow** | P2 | Register → browse → verify → dashboard |
| **CI/CD Pipeline** | P2 | After stable command set |
| **Mainnet deployment plan** | P3 | Secrets, rotation, release workflow |
| **Branch protection & PR flow** | P3 | Define merge strategy |

## Deployment Configuration

**Program ID** (devnet/localnet): `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`

**Anchor Version**: `0.32.1` (configured in `Anchor.toml`)

**Devnet USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

**Shared Devnet Merkle Tree**: `2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx`

**Shared Tree Delegate PDA**: `HdtBWtW3smBmdjrZd5T5pJCF7e5XAdRxhHQu8KVmfQfk`

**Frontend Dev Server**: `http://localhost:8080` (host: `::`, IPv6 localhost)

## Summary

**AgentID KYA is a production-ready Solana application** (as of March 30, 2026). All core features are implemented and tested:

✅ **Smart Contract**: 12-instruction Anchor program live on devnet  
✅ **Bubblegum Integration**: Soul-bound cNFT minting via Metaplex CPI  
✅ **Treasury Layer**: Autonomous USDC spending with safety constraints  
✅ **Security**: Fail-closed verification, owner-only enforcement, re-init protection  
✅ **Frontend**: Complete UI with wallet integration and treasury dashboard  
✅ **Oracle**: Webhook-driven reputation updates with HMAC validation  
✅ **x402**: HTTP 402 Payment Required with on-chain USDC verification  
✅ **SDK & Plugin**: TypeScript packages for external integrations  

**Remaining work focuses on operational readiness**: npm package publishing, x402 replay persistence, reputation formula audit, CI/CD pipeline, and mainnet deployment planning.

The codebase is beyond the mock-only stage. Identity registration, reputation scoring, verification, treasury management, and India compliance flows are operational on devnet, and the metadata API is live at `https://agentid-metadata-api.vercel.app`.
