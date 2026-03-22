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
HELIUS_WEBHOOK_AUTH=your_secure_random_string
PORT=3001
```

Additional Helius-related variables may still exist in `.env.example`, but the current server entrypoint only requires the values above to start and process signed webhook requests.

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
