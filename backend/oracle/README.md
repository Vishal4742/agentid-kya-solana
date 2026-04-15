# Oracle Service — AgentID KYA

> Watches the Solana blockchain for agent activity and updates on-chain reputation scores automatically.

The oracle is the "automated reputation engine" of the AgentID protocol. It runs in two modes:

1. **Scheduled sync** (GitHub Actions) — scans all registered agents on a schedule and recalculates their reputation scores
2. **Webhook mode** (Vercel) — receives real-time transaction events from Helius and immediately updates affected agents

---

## How Reputation Scoring Works

When the oracle runs, it fetches every registered `AgentIdentity` on-chain and computes a new reputation score (0–1000) based on five factors:

| Factor | Max Points | How it's measured |
|---|---|---|
| Transaction success rate | 400 | `successfulTransactions / totalTransactions` |
| Human ratings | 200 | Average of 1–5 star ratings submitted on-chain |
| Account longevity | 150 | Days since registration (caps at 1 year) |
| USDC volume earned | 150 | Total USDC through treasury (caps at 100,000 USDC) |
| Verification level | 200 | Unverified=0, Email=50, KYB=100, Audited=200 |

If the computed score differs from the stored score, the oracle calls `update_reputation` on-chain via the Anchor CPI. Agents with unchanged scores are skipped to save RPC calls.

> ⚠️ **Status:** Transaction volume scoring is functional. The service runs locally and in GitHub Actions. It is not yet treated as audited production infrastructure — see [docs/security/audit.md](../../docs/security/audit.md).

---

## Architecture

```
┌─────────────────┐     schedule      ┌─────────────────────┐
│  GitHub Actions │ ── (cron/push) ──►│  oracle/src/sync.ts │
└─────────────────┘                   └──────────┬──────────┘
                                                  │ calls syncAllAgents()
                                                  ▼
                                       ┌─────────────────────┐
┌─────────────────┐    webhook POST    │  oracle/src/core.ts │
│  Helius         │ ─────────────────► │  computeReputation  │
│  (blockchain    │                    │  updateReputation   │
│   events)       │                    └──────────┬──────────┘
└─────────────────┘                               │ Anchor CPI
          │                                       ▼
          │ delivers to                  ┌──────────────────┐
          ▼                              │  Solana Program  │
┌──────────────────┐                    │  (devnet)        │
│  Vercel API      │                    └──────────────────┘
│  /oracle/webhook │──────────────────────────────┘
└──────────────────┘  processWebhookTransactions()
```

The oracle wallet must be the `oracle_authority` configured in the on-chain `ProgramConfig` PDA (set during `init_config`). Only this wallet can call `update_reputation`.

---

## Requirements

- Node.js ≥ 18
- npm
- Oracle authority keypair in JSON-array format
- A Solana RPC URL (devnet or mainnet)

---

## Local Development

```bash
cd backend/oracle
npm install

# Run a one-off reputation sync against devnet
npm run sync

# Build the TypeScript
npm run build
npm start
```

---

## Environment Variables

Set these in `backend/oracle/.env` for local use. For production, set them as GitHub Actions secrets and/or Vercel environment variables (see [Setup](#setup) below).

```bash
# Required
ORACLE_PRIVATE_KEY=[12,34,56,...]          # JSON byte array of oracle keypair
SOLANA_RPC_URL=https://api.devnet.solana.com

# Required for webhook auth (must match Vercel API setting)
ORACLE_WEBHOOK_SECRET=<32-byte-hex-secret>

# Only needed for Helius webhook registration
HELIUS_API_KEY=your_helius_api_key
WEBHOOK_URL=https://your-api.vercel.app/api/oracle/webhook
```

Copy the example:
```bash
cp .env.example .env
```

---

## Setup

### 1. GitHub Actions (scheduled sync)

Add these secrets to your GitHub repository under **Settings → Secrets → Actions**:

| Secret | Description |
|---|---|
| `SOLANA_RPC_URL` | Solana RPC endpoint |
| `ORACLE_PRIVATE_KEY` | Oracle wallet as JSON byte array |
| `ORACLE_WEBHOOK_SECRET` | Shared HMAC secret |

The workflow at `.github/workflows/oracle-sync.yml` will run the sync automatically.

### 2. Vercel API (webhook receiver)

Webhook delivery is handled by the Vercel API route in `backend/api/api/oracle/webhook.ts` — not this package directly. Set these on the Vercel project:

| Variable | Description |
|---|---|
| `ORACLE_WEBHOOK_SECRET` | Must match the secret set in GitHub Actions |
| `HELIUS_WEBHOOK_AUTH` | Optional static auth fallback |
| `ORACLE_PRIVATE_KEY` | Oracle wallet for on-chain writes |

> ⚠️ **Secret alignment:** `ORACLE_WEBHOOK_SECRET` must be identical on both sides (GitHub Actions and Vercel). If they differ, the webhook returns `401 Unauthorized`.

### 3. Helius Webhook Registration

To receive real-time events from Helius, register your webhook endpoint:

```bash
cd backend/oracle

# Fill in HELIUS_API_KEY and WEBHOOK_URL in .env first
npm run register:webhook
```

This calls `src/register-webhook.ts`, which POSTs to the Helius API. Point `WEBHOOK_URL` to:
```
https://<your-vercel-deployment>.vercel.app/api/oracle/webhook
```

---

## File Layout

```
backend/oracle/
├── src/
│   ├── index.ts              ← entrypoint (re-exports)
│   ├── core.ts               ← oracle runtime, reputation scoring, updateReputation CPI
│   ├── sync.ts               ← syncAllAgents() orchestrator
│   ├── register-webhook.ts   ← Helius webhook registration script
│   ├── webhookAuth.ts        ← HMAC-SHA256 validation helper
│   └── idl/                  ← local copy of the Anchor IDL
├── .env.example
└── package.json
```
