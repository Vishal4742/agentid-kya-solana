# AgentID Reputation Oracle

Node/Express service that recalculates and writes `reputation_score` back to the AgentID program.

## What It Does Today

- Loads the Anchor IDL from `src/idl/agentid_program.json`
- Verifies a webhook auth header before accepting Helius webhook requests
- Recomputes reputation when it sees `LogAction` or `Rate` program interactions
- Runs an hourly full sync across all `AgentIdentity` accounts
- Calls `updateReputation` on-chain using the configured oracle authority

## Important Limits

- Reputation still depends on on-chain inputs that are not fully hardened yet
- This service is buildable and runnable locally, but it should not be treated as audited production infrastructure

## Current Reputation Guardrails

- Treasury volume now comes from `AgentTreasury.total_earned + total_spent`
- Success score is capped by observed activity spread, verification level, and rating count so raw self-reported `success=true` spam does not receive the full 40% weight
- Longevity now requires sustained activity instead of rewarding agents that only registered early
- Remaining limitation: `log_action` is still owner-submitted data, so this is a mitigation layer, not a trustless reputation system

## Requirements

- Node.js 18+
- npm
- Oracle authority keypair in JSON-array format
- Solana RPC URL

## Environment

Copy `.env.example` to `.env` and set:

```bash
ORACLE_PRIVATE_KEY=[12,34,56,...]
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
HELIUS_API_KEY=YOUR_HELIUS_KEY
HELIUS_WEBHOOK_AUTH=your_secure_random_string
WEBHOOK_URL=https://your-public-url.example/webhook
PORT=3001
```

The full step-by-step local setup is documented in [`backend/oracle/.env.example`](/mnt/c/Users/vg890/OneDrive/Desktop/agentid-kya-solana/backend/oracle/.env.example).

## Development

```bash
cd backend/oracle
npm install
npm run dev
```

## Build

```bash
cd backend/oracle
npm run build
npm start
```

## Operational Notes

- Program ID is resolved from the bundled IDL at runtime
- The webhook endpoint is `POST /webhook`
- The oracle must match the `oracle_authority` configured in the on-chain `ProgramConfig` PDA
