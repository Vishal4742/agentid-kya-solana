# x402 Payment Architecture — AgentID KYA

> How AI agents autonomously discover, pay for, and access paid API resources using the HTTP 402 standard.

The x402 middleware enables **machine-to-machine micropayments** — no human clicks a "pay" button. An AI agent, when it hits a paid endpoint, automatically detects the payment requirement, sends USDC on-chain, and retries with proof of payment.

---

## What Is HTTP 402?

HTTP 402 ("Payment Required") is a status code in the HTTP spec that was reserved for future use with micropayments. The x402 standard implements it for Solana/USDC:

- Server returns `402` with payment instructions in the response body
- Client pays on-chain and retries with the transaction signature as proof
- Server verifies the payment and serves the content

This is the foundation of **autonomous agent commerce** — agents can pay for and consume services without human involvement.

---

## Full Payment Sequence

```
┌───────────────┐                    ┌───────────────┐              ┌──────────────┐
│  AI Agent     │                    │  x402         │              │  Solana      │
│  (Client)     │                    │  Middleware   │              │  (Devnet)    │
└───────┬───────┘                    └───────┬───────┘              └──────┬───────┘
        │                                    │                             │
        │  GET /api/premium/treasury/abc123  │                             │
        │──────────────────────────────────►│                             │
        │                                    │                             │
        │  ◄── 402 Payment Required ─────── │                             │
        │  { treasury: "Tx72...",            │                             │
        │    amount: 1.0,                    │                             │
        │    currency: "USDC" }             │                             │
        │                                    │                             │
        │  Send USDC to treasury on-chain   │                             │
        │──────────────────────────────────────────────────────────────►  │
        │                                    │                             │
        │  ◄─────────────────────── tx sig: "5xRk..." ─────────────────  │
        │                                    │                             │
        │  GET /api/premium/treasury/abc123                               │
        │  X-Payment-Signature: 5xRk...     │                             │
        │──────────────────────────────────►│                             │
        │                                    │  Verify tx on-chain        │
        │                                    │──────────────────────────► │
        │                                    │  ◄── tx confirmed, USDC ── │
        │                                    │      inflow = 1.0          │
        │                                    │                             │
        │                                    │  Check Redis: sig unused?  │
        │                                    │  ✅ First use              │
        │                                    │  Mark sig consumed (24h TTL)│
        │                                    │                             │
        │  ◄── 200 OK + treasury data ───── │                             │
        │                                    │                             │
```

---

## Middleware Implementation

The middleware lives in `backend/x402/src/middleware-redis.ts`. It wraps Express routes:

```ts
import express from 'express';
import { x402Middleware } from './x402';

const app = express();

// Protect a route: require 1.0 USDC payment to treasury pubkey
app.get('/api/premium-data',
  x402Middleware(1.0, process.env.X402_TREASURY_PUBKEY),
  (req, res) => {
    const { signature, amountUsdc } = res.locals.verifiedPayment;
    res.json({ data: 'premium content', paidWith: signature });
  }
);
```

After successful verification, `res.locals.verifiedPayment` contains:

```ts
{
  signature: string;    // Solana transaction signature
  amountUsdc: number;   // Verified USDC amount received
}
```

---

## 402 Response Format

When payment is required, the server returns:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "Payment required",
  "payment": {
    "treasury": "Tx72udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF",
    "amount": 1.0,
    "currency": "USDC",
    "network": "solana-devnet"
  }
}
```

---

## Replay Protection

Every transaction signature can only be used **once**. This prevents an adversary from reusing a payment header to access a route multiple times.

### How It Works

1. After verifying a payment, the signature is stored in Redis with a 24-hour TTL
2. Any subsequent request with the same signature is rejected with `409 Conflict`
3. Signatures older than 24 hours are automatically pruned

### Redis vs In-Memory

| Mode | When used | Suitability |
|---|---|---|
| Redis | `REDIS_URL` env var is set | ✅ Production — persistent, survives restarts |
| In-memory (fallback) | Redis unavailable | ⚠️ Local dev only — lost on restart, not shared across instances |

> ⚠️ Always use Redis in production. The in-memory fallback is only safe for local development.

### Redis Setup

```bash
# Install Redis locally (macOS)
brew install redis && brew services start redis

# Install Redis locally (Ubuntu/WSL)
sudo apt install redis-server && redis-server --daemonize yes

# Set in backend/x402/.env
REDIS_URL=redis://localhost:6379
```

---

## Verification Steps

The middleware performs these checks in order before granting access:

1. **Transaction exists** — fetches the tx from Solana RPC
2. **Transaction succeeded** — checks `meta.err === null`
3. **Treasury matches** — confirms the receiving address is the expected treasury PDA
4. **Amount matches** — validates token balance delta ≥ required USDC amount
5. **Not replayed** — checks Redis for the signature; rejects if already consumed

If any check fails, the request is rejected with an appropriate error.

---

## Error Reference

| Status | Error | Meaning |
|---|---|---|
| `402` | Payment required | No `X-Payment-Signature` header provided |
| `400` | Invalid signature format | Header is not a valid base58 tx signature |
| `402` | Insufficient payment | USDC amount in tx < required amount |
| `402` | Wrong treasury | Payment went to a different address |
| `409` | Signature already used | Replay attempt — signature consumed within TTL window |
| `500` | RPC error | Could not fetch transaction from Solana |

---

## Configuration

Set in `backend/x402/.env`:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
REDIS_URL=redis://localhost:6379
X402_TREASURY_PUBKEY=<AgentTreasury PDA address>
X402_PRICE_LAMPORTS=1000000          # 1 USDC (6 decimals)
```

Internal constants in `middleware-redis.ts`:

| Constant | Default | Purpose |
|---|---|---|
| `REPLAY_TTL_MS` | 24 hours | How long a used signature is remembered |
| `REPLAY_PRUNE_INTERVAL_MS` | 5 minutes | How often the in-memory store is pruned |
| `MAX_CONSUMED_SIGNATURES` | 100,000 | In-memory store cap before oldest entries are evicted |

---

## Implementation Status

> ⚠️ **Partially complete.** The middleware is implemented and unit-tested. The first paid route (`GET /api/premium/treasury/:agentId`) exists in the Vercel deployment. However, end-to-end live smoke verification against a deployed treasury on devnet is not yet complete. See [Phase 8 in PROJECT.md](../PROJECT.md).

### What's done
- ✅ HTTP 402 response format
- ✅ On-chain USDC transaction verification
- ✅ Redis-backed replay protection with in-memory fallback
- ✅ Unit tests (`cd backend/x402 && npm test`)
- ✅ First paid serverless route (`/api/premium/treasury/:agentId`)

### Still to do
- 🔲 Live smoke test: initialize treasury → deposit devnet USDC → hit paid route → verify data returned
- 🔲 Monitoring: replay-store health, RPC latency alerts

---

## Running the Tests

```bash
cd backend/x402
npm install
npm test

# Integration test (requires funded devnet wallet)
npm run test:integration
```

---

## Related Docs

| Doc | What it covers |
|---|---|
| [docs/architecture.md](./architecture.md) | System-wide architecture overview |
| [backend/x402/README.md](../backend/x402/README.md) | x402 middleware usage reference |
| [backend/api/README.md](../backend/api/README.md) | Vercel API routes including the paid treasury route |
