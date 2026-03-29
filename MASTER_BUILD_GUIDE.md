# AgentID KYA on Solana
## Master Build Guide

> Repo: `Vishal4742/agentid-kya-solana`
> Audit date: March 29, 2026 (updated after Phase 8 treasury integration)
> Program ID (devnet/local config): `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`

## Project Snapshot

AgentID is a Solana project for AI-agent identity, reputation, and verification. The current repository contains:

- an Anchor program for agent registration, capability updates, action logging, ratings, verification, and oracle-driven reputation updates
- a Vite/React frontend wired to the on-chain identity flow
- a Node/Express oracle service for webhook-driven and scheduled reputation updates
- local TypeScript packages for an SDK and an ELIZA plugin

This guide reflects the code currently present in the repo, not the original aspirational build plan.

## Current Status

### Working in the repo

- Anchor program source is present under `backend/programs/agentid-program`
- frontend routes exist for `/`, `/register`, `/agents`, `/agent/:id`, `/dashboard`, `/verify`, and `/docs`
- `useProgram()` loads the shipped Anchor IDL from `frontend/src/idl/agentid_program.json`
- `useAgents()` and `useMyAgent()` fetch real `AgentIdentity` accounts
- the oracle service exists under `backend/oracle`
- local package folders exist under `packages/sdk` and `packages/eliza-plugin`

### Implemented on-chain instructions

The current `lib.rs` exposes these 12 instructions:

**Identity & Reputation**
1. `init_config` — initializes the global program config (oracle authority)
2. `register_agent` — creates an `AgentIdentity` PDA; placeholder `credential_nft` field (no Bubblegum mint yet)
3. `update_capabilities` — updates DeFi/payment capability flags; owner-signed
4. `verify_agent` — checks agent authorization for a given action type; CPI-callable
5. `log_action` — creates an `AgentAction` PDA and increments identity stats
6. `rate_agent` — records a 1–5 star rating; rater cannot be the owner
7. `update_reputation` — oracle-driven reputation score update

**Treasury Suite (Phase 8 — live on `main`)**
8. `initialize_treasury` — initializes `AgentTreasury` PDA with USDC token account and configurable spending limits
9. `autonomous_payment` — executes SPL token transfer within spending limits; respects emergency pause flag
10. `deposit` — deposits USDC into the treasury token account
11. `update_spending_limits` — updates daily and per-tx USDC spending limits; owner-only
12. `emergency_pause` — toggles `emergency_pause` boolean on the treasury; owner-only

### Not implemented on the current main branch

- no `backend/x402` middleware exists on the current main branch
- no Bubblegum CPI exists in `register_agent`
- no real soul-bound cNFT minting flow exists in the program today
- treasury UI in `Dashboard.tsx` is feature-gated behind `TREASURY_ENABLED=false` (line 23) — shows a "Coming Soon" banner until the program is deployed to devnet and the flag is flipped

## Architecture

### Present layers

- L1 Identity: `AgentIdentity` PDA stores agent profile, capabilities, rating, and compliance fields
- L2 Reputation: oracle recalculates and writes `reputation_score`
- L3 Verification: `verify_agent` returns authorization data for external consumers
- L4 Integration: frontend, SDK, and ELIZA package scaffolding are present

### Planned but not shipped on `main`

- Bubblegum cNFT credential minting (placeholder `credential_nft` field exists; no actual mint)
- x402 payment enforcement middleware
- devnet deployment of the treasury (program compiled; devnet deploy pending)
- published package releases for `@agentid/sdk` and `@agentid/eliza-plugin`

## What The Current Program Actually Stores

`AgentIdentity` currently stores:

- `agent_id`
- `owner`
- `agent_wallet`
- `name`
- `framework`
- `model`
- `credential_nft`
- `verified_level`
- `registered_at`
- `last_active`
- capability flags
- `max_tx_size_usdc`
- `reputation_score`
- transaction counters
- rating counters
- `gstin`
- `pan_hash`
- `service_category`

Important implementation note:

- `register_agent` does not mint a Bubblegum cNFT today
- `credential_nft` is currently set deterministically from `agent_id`, so it should be treated as a placeholder field, not proof of a real NFT mint

## Frontend Status

### Live integrations

- wallet adapter is wired for Phantom and Solflare
- registration submits a real on-chain transaction
- agents, verify, dashboard, and profile pages read real `AgentIdentity` data
- `/docs` is already routed in `frontend/src/App.tsx`

### Current limitations

- `Index.tsx` still uses `MOCK_AGENTS` for the landing-page showcase
- treasury UI is fully built in `Dashboard.tsx` but hidden behind `TREASURY_ENABLED=false` until devnet deployment
- production deployment and release configuration are not finalized in this repo

## Backend Status

### Oracle

`backend/oracle` includes:

- Express webhook receiver at `/webhook`
- `HELIUS_WEBHOOK_AUTH` check on inbound webhook requests
- hourly cron-based reputation sync
- `register-webhook.ts` helper for Helius webhook registration

### Metadata API

`backend/api` contains a Vercel-oriented metadata handler and config, but release readiness still depends on deployment validation and current IDL alignment.

## SDK And ELIZA Status

### SDK

`packages/sdk` exists and builds locally as a TypeScript package. It includes helpers for:

- `registerAgent`
- `getAgentIdentity`
- `verifyAgent`
- `rateAgent`
- `logAction`
- `getAllAgents`

Current status:

- local package source exists
- suitable for repo-local development
- not documented here as a published, stable external release

### ELIZA Plugin

`packages/eliza-plugin` exists and builds locally. It currently exposes:

- `GET_MY_REPUTATION`
- `VERIFY_COUNTERPARTY_AGENT`
- `onActionExecuted` auto-log hook

Current status:

- local package source exists
- not documented here as a published production release

## Recommended Build Order From The Current Repo State

1. Build and test the Anchor program in `backend`
2. Run the frontend against the shipped IDL in `frontend`
3. Run the oracle locally with a configured `.env`
4. Build the SDK and ELIZA packages for local integration testing

## Commands

### Backend program

```bash
cd backend
anchor build
anchor test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Oracle

```bash
cd backend/oracle
npm install
npm run dev
```

### Local packages

```bash
cd packages/sdk
npm install
npm run build

cd ../eliza-plugin
npm install
npm run build
```

## Reality-Based Roadmap

### Completed phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1–5 | Identity registry, reputation oracle, verification, frontend wallet wiring, SDK/ELIZA scaffolding | ✅ Live on `main` |
| 6 | India compliance: TDS calculation, invoice modal, GSTIN/PAN fields | ✅ Live on `main` |
| 7 | Frontend hardening: error states, retry UX, skeleton loaders, feature-flag pattern | ✅ Live on `main` |
| 8 | Treasury suite (on-chain): `initialize_treasury`, `autonomous_payment`, `deposit`, `update_spending_limits`, `emergency_pause` | ✅ Live on `main` — UI feature-flagged |

### Next work that still remains

1. Deploy treasury program to devnet and flip `TREASURY_ENABLED=true` in `Dashboard.tsx`
2. Write the negative test case: `autonomous_payment` must fail when treasury is paused
3. Replace placeholder `credential_nft` flow with real Bubblegum cNFT minting
4. Add x402 middleware after treasury settlement rules are finalized
5. Align `packages/sdk` with the exact current IDL and regenerate types
6. Complete deployment and release documentation for frontend, oracle, and API
7. Replace landing-page `MOCK_AGENTS` with real or clearly labeled demo data

## Summary

This repository is beyond the mock-only stage. As of March 2026 the identity registry, reputation oracle, verification flow, frontend wallet wiring, oracle scaffolding, India compliance tooling, and the full treasury on-chain instruction set are all present on `main`. The treasury UI is built and tested locally but gated behind `TREASURY_ENABLED=false` pending a devnet deployment. Bubblegum cNFT minting and x402 enforcement remain roadmap items.
