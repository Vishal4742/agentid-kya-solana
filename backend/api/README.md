# Metadata API — AgentID KYA

> Vercel serverless functions that serve public agent metadata and handle oracle webhook ingestion.

This is the backend API layer of the AgentID KYA protocol. It runs as Vercel serverless functions and exposes three endpoint groups:

- **Public metadata** — returns agent profile data readable by anyone
- **Oracle webhook** — receives HMAC-signed events from Helius and updates on-chain reputation
- **Premium (x402-gated)** — paid endpoints that require a verified USDC payment to access

---

## Routes

### `GET /api/metadata/:agentId`

Returns the on-chain identity for a registered agent, formatted as standard NFT metadata JSON.

**Example request:**
```bash
curl https://agentid-kya-solana.vercel.app/api/metadata/Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF
```

**Example response:**
```json
{
  "name": "my-agent",
  "description": "AgentID KYA on-chain identity",
  "image": "https://agentid-kya-solana.vercel.app/logo.png",
  "capabilities": ["nlp", "data-fetch"],
  "reputation_score": 850,
  "verified": true,
  "external_url": "https://agentid.netlify.app/agent/Gv35udP7..."
}
```

If the agent is not found on-chain, the endpoint returns a `404` with `{ "error": "Agent not found" }`.

---

### `POST /api/oracle/webhook`

Receives transaction events from Helius and calls `update_reputation` on-chain for each affected agent.

**Authentication (one of two modes):**

| Mode | Header | When to use |
|---|---|---|
| HMAC-SHA256 | `X-Signature: sha256=<hmac>` | Preferred — set `ORACLE_WEBHOOK_SECRET` |
| Static auth | `Authorization: Bearer <token>` | Fallback — set `HELIUS_WEBHOOK_AUTH` |

> ⚠️ If **neither** env var is set, the server returns `500 Server misconfigured`. Always configure at least one before deploying.

**Example successful response:**
```json
{
  "ok": true,
  "auth_mode": "hmac",
  "received": 3,
  "processed": 2,
  "updates": [
    { "identity": "AbCd...", "name": "agent-1", "previous": 720, "next": 745 }
  ]
}
```

**Error responses:**
| Status | Meaning |
|---|---|
| `400` | Payload is not a JSON array |
| `401` | Signature/auth header missing or invalid |
| `405` | Non-POST request |
| `500` | Server misconfiguration or internal error |

---

### `GET /api/premium/treasury/:agentId`

> ⚠️ **Status: Partially implemented.** The route exists and returns treasury snapshot data, but live x402 payment enforcement against a deployed treasury is not yet smoke-tested end-to-end. See [Phase 8 status](../../PROJECT.md).

Returns a treasury snapshot (USDC balance, spending limits, pause status) for an agent. Requires a verified USDC payment via the x402 protocol before access is granted.

**Flow:**
1. Client calls the endpoint → receives `402 Payment Required` with treasury address and amount
2. Client sends USDC on-chain, gets a transaction signature
3. Client retries with `X-Payment-Signature: <tx_sig>` header
4. Middleware verifies the payment and returns the treasury data

---

## Local Development

```bash
cd backend/api
npm install
npm run dev     # starts Vercel dev server at http://localhost:3000
```

Type-check without starting the server:
```bash
npx tsc --noEmit
```

---

## Environment Variables

Set these in `backend/api/.env` for local dev, and in the Vercel project settings for production:

| Variable | Required | Description |
|---|---|---|
| `SOLANA_RPC_URL` | ✅ | Solana RPC endpoint (use devnet URL for local dev) |
| `METADATA_BASE_URL` | ✅ | Public base URL of this API deployment |
| `FRONTEND_BASE` | ✅ | Public base URL of the Netlify frontend |
| `ORACLE_PRIVATE_KEY` | ✅ | Oracle wallet as a JSON byte array (e.g. `[1,2,3,...]`) |
| `ORACLE_WEBHOOK_SECRET` | ✅ | 32-byte hex secret for HMAC-SHA256 webhook auth |
| `HELIUS_WEBHOOK_AUTH` | Optional | Static token fallback for Helius webhook auth |
| `X402_TREASURY_QUERY_PRICE_USDC` | Optional | Price in USDC for the premium treasury route |
| `METADATA_PLACEHOLDER_IMAGE` | Optional | Override URL for the fallback agent image |

Copy the example to get started:
```bash
cp .env.example .env
```

---

## File Layout

```
backend/api/
├── api/
│   ├── metadata/
│   │   └── [slug].ts        ← GET /api/metadata/:agentId
│   ├── oracle/
│   │   └── webhook.ts       ← POST /api/oracle/webhook
│   └── premium/
│       └── treasury/        ← GET /api/premium/treasury/:agentId (x402-gated)
├── lib/
│   └── oracle.ts            ← processWebhookTransactions() helper
├── webhook.ts               ← HMAC validation utility
└── package.json
```
