# AgentID Reputation Oracle

Node/Express service that recalculates and writes `reputation_score` back to the AgentID program.

## What It Does Today

- Loads the Anchor IDL from `src/idl/agentid_program.json`
- Validates signed webhook bodies when `x-agentid-signature` is present and `ORACLE_WEBHOOK_SECRET` is configured
- Falls back to a static `Authorization` header for direct Helius delivery when `HELIUS_WEBHOOK_AUTH` is configured
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
ORACLE_WEBHOOK_SECRET=shared_secret_for_signed_webhooks
HELIUS_WEBHOOK_AUTH=your_secure_random_string
PORT=3001
```

Use `ORACLE_WEBHOOK_SECRET` when requests are relayed through a signer that sends `x-agentid-signature: sha256=<hex>`.

Use `HELIUS_WEBHOOK_AUTH` when Helius posts directly to the oracle. That fallback is weaker than HMAC signing because it is a static shared bearer value.

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
