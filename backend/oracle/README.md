# AgentID Reputation Oracle

Node-based oracle sync package that recalculates and writes `reputation_score` back to the AgentID program.

## What It Does Today

- Loads the Anchor IDL from `src/idl/agentid_program.json`
- Runs full reputation syncs across all `AgentIdentity` accounts
- Calls `updateReputation` on-chain using the configured oracle authority
- Is designed to run from GitHub Actions rather than as a permanently hosted HTTP service

## Important Limits

- Reputation still depends on on-chain inputs that are not fully hardened yet
- Transaction volume scoring is still `0` for now
- This service is buildable and runnable locally, but it should not be treated as audited production infrastructure

## Requirements

- Node.js 18+
- npm
- Oracle authority keypair in JSON-array format
- Solana RPC URL

## Environment

Copy `.env.example` to `.env` and set:

```bash
ORACLE_PRIVATE_KEY=[12,34,56,...]
SOLANA_RPC_URL=https://api.devnet.solana.com
ORACLE_WEBHOOK_SECRET=shared_secret_for_signed_webhooks
HELIUS_API_KEY=your_helius_api_key
WEBHOOK_URL=https://your-api-domain.vercel.app/oracle/webhook
```

Webhook delivery now belongs to the Vercel API route in `backend/api/api/oracle/webhook.ts`.

## Development

```bash
cd backend/oracle
npm install
npm run sync
```

Register or refresh the Helius webhook target:

```bash
cd backend/oracle
npm run register:webhook
```

## Build

```bash
cd backend/oracle
npm run build
npm start
```

## Operational Notes

- Program ID is resolved from the bundled IDL at runtime
- The sync job is intended for `.github/workflows/oracle-sync.yml`
- The oracle keypair must match the `oracle_authority` configured in the on-chain `ProgramConfig` PDA
- `HELIUS_API_KEY`, `WEBHOOK_URL`, and `HELIUS_WEBHOOK_AUTH` are only needed for webhook registration, not the scheduled sync job
