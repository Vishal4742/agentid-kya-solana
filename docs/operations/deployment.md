# Deployment Guide — AgentID KYA Protocol

> Step-by-step instructions for deploying the full AgentID stack to devnet (and eventually mainnet).

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Solana CLI | ≥ 1.18 | [docs.solanalabs.com](https://docs.solanalabs.com/cli/install) |
| Anchor CLI | ≥ 0.30 | [anchor-lang.com](https://www.anchor-lang.com/docs/installation) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org/) |
| Yarn | ≥ 1.22 | `npm i -g yarn` |
| Redis | ≥ 7 (optional) | For x402 replay protection |

---

## 1. Wallet Setup

```bash
# Generate a new deployer wallet (skip if you already have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Configure CLI to use devnet
solana config set --url https://api.devnet.solana.com

# Fund the wallet (need ~5 SOL for program deploy + PDA inits)
solana airdrop 5
solana balance
```

---

## 2. Build & Deploy the Anchor Program

```bash
cd backend

# Install dependencies
yarn install

# Build the program
anchor build

# Verify the local validator flow before any deploy
anchor test

# Deploy to devnet (first time)
anchor deploy --provider.cluster devnet

# Note the deployed Program ID from the output
# Update Anchor.toml and frontend/.env with the new Program ID if it changed
```

> **Important:** `anchor test` now uses a local validator that clones the Bubblegum/compression dependencies it needs from devnet. Keep that green before any deploy. Immediately after deploying, call `init_config` to claim the program admin. See Step 3.

---

## 3. Initialize Program Config On-Chain

```bash
# From the backend directory, run the init script
cd backend
yarn ts-node scripts/init-config.ts
```

This calls the `init_config` instruction, setting you (the deployer) as the admin and registering the oracle authority.

---

## 4. Deploy the Metadata API (Vercel)

```bash
cd backend/api

# Install Vercel CLI if needed
npm i -g vercel

# Set environment variables on Vercel
vercel env add SOLANA_RPC_URL
vercel env add PROGRAM_ID
vercel env add ORACLE_WEBHOOK_SECRET

# Deploy
vercel --prod
```

After deploying, set `VITE_METADATA_BASE_URL` in `frontend/.env.local` (and the corresponding Vercel project env var) to the deployed URL. Frontend requests are built by `buildMetadataUrl()` via this env variable rather than assuming the frontend host.

---

## 5. Deploy the Oracle Service

```bash
cd backend/oracle

# Copy and fill in environment variables
cp .env.example .env
# Edit .env:
#   ORACLE_PRIVATE_KEY=[...bytes...]
#   ORACLE_WEBHOOK_SECRET=<shared HMAC secret>
#   HELIUS_API_KEY=<your Helius API key>
#   WEBHOOK_URL=<your public oracle URL>

npm install
npm run build

# Register the Helius webhook
npm run register-webhook

# Start the service (or deploy to Railway/Render/Fly.io)
npm start
```

---

## 6. Deploy the Frontend (Vercel)

```bash
cd frontend

# Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local:
#   VITE_SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
#   VITE_PROGRAM_ID=Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF
#   VITE_METADATA_BASE_URL=https://agentid-metadata-api.vercel.app

npm install
npm run build

# Deploy with Vercel
vercel --prod
```

---

## 7. Verify the Deployment

```bash
# Run the automated verification suite
cd frontend
npm test

cd ../backend
anchor test

# Run the live demo script
bash ../scripts/demo-devnet.sh
```

Frontend tests, API typechecks, x402 tests, SDK tests, and `anchor test` should all be green before you treat the deployment as healthy. The demo script confirms the program is live and agents can register.

---

## 8. Environment Variables Reference

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `SOLANA_RPC_URL` | ✅ | Solana RPC endpoint |
| `PROGRAM_ID` | ✅ | Deployed program address |
| `REDIS_URL` | Optional | Redis for x402 replay protection |
| `X402_TREASURY_QUERY_PRICE_USDC` | Optional | Price for the paid treasury snapshot endpoint (`/premium/treasury/:agentId`) |

### `backend/oracle/.env`

| Variable | Required | Description |
|---|---|---|
| `ORACLE_PRIVATE_KEY` | ✅ | Oracle wallet as JSON byte array |
| `ORACLE_WEBHOOK_SECRET` | ✅ | Shared HMAC-SHA256 secret for Helius webhooks |
| `HELIUS_API_KEY` | ✅ | Helius API key for webhook registration |
| `WEBHOOK_URL` | ✅ | Public URL of the oracle service |
| `PORT` | Optional | HTTP server port (default: 3001) |

### `frontend/.env.local`

| Variable | Required | Description |
|---|---|---|
| `VITE_SOLANA_RPC_ENDPOINT` | ✅ | Solana RPC endpoint |
| `VITE_PROGRAM_ID` | ✅ | Deployed program address |
| `VITE_METADATA_BASE_URL` | ✅ | Metadata API base URL |

---

## 9. Post-Deployment Checklist

- [ ] `anchor build` passes cleanly
- [ ] Program deployed to devnet and `init_config` called
- [ ] Metadata API live and returning JSON for a known agent
- [ ] Oracle service registered with Helius webhook
- [ ] Frontend redeployed and connected to devnet
- [ ] All 30 frontend tests passing (`npm test`)
- [ ] `anchor test` passing locally before deploy
- [ ] `scripts/demo-devnet.sh` completes without errors
- [ ] Treasury UI visible on dashboard (`TREASURY_ENABLED = true`)

---

## 10. IDL Sync (After Program Changes)

After any changes to the on-chain program:

```bash
# From repo root
pwsh ./scripts/sync-idl.ps1
```

This copies the compiled IDL from `backend/target/idl/` to `frontend/src/lib/` and `packages/sdk/src/`.

---

## Mainnet Considerations

> ⚠️ Do NOT deploy to mainnet without:
> 1. External security audit (OtterSec, Neodyme, or equivalent)
> 2. Multisig admin (Squads Protocol) for `init_config` and `emergency_pause`
> 3. Anchor version alignment (CLI vs. `anchor-lang` dependency)
> 4. `cargo audit` and `npm audit` clean passes
> 5. Legal review of KYA compliance requirements for your jurisdiction
