# x402 Payment Middleware

## Overview

HTTP 402 Payment Required middleware for Express.js that enforces on-chain USDC payment verification via Solana blockchain before granting access to protected API endpoints.

## Architecture Decision

**Decision: Keep x402 in-repo as optional middleware** ✅

### Rationale

1. **Simplicity**: Keeping x402 in the monorepo reduces deployment complexity and maintains a single codebase
2. **Optional Layer**: x402 is an off-chain enforcement mechanism; the canonical payment path is the on-chain `autonomous_payment` instruction
3. **Low Overhead**: The middleware is lightweight (~150 LOC) and doesn't justify microservice complexity
4. **Development Velocity**: Devnet launch is prioritized; separate service adds deployment/maintenance burden
5. **Future Flexibility**: Can extract to separate service later if usage scales or if decoupling becomes necessary

### Trade-offs Accepted

- **Replay Store Fallback**: Redis is the primary replay store; the in-memory store is only the fallback path for local dev or degraded mode
- **Coupling**: Payment logic lives with backend; acceptable since x402 is optional supplemental layer
- **Resource Sharing**: Uses same Express server as other API endpoints; fine for current load

## Current Implementation Status

### ✅ Completed in Repo

- HTTP 402 response format with payment requirements
- On-chain transaction verification via Solana RPC
- Treasury USDC inflow calculation from pre/post token balances
- Redis-backed replay protection with in-memory fallback
- Express middleware interface with `res.locals.verifiedPayment`
- Unit tests and integration documentation

### 🔲 Remaining to close Phase 8

- [x] Adopt the middleware rules in a real protected treasury snapshot route
- [ ] Run live treasury + x402 smoke verification against redeployed services
- [ ] Add product-level monitoring for replay-store and RPC health

## Usage

```typescript
import express from 'express';
import { x402Middleware } from './x402';

const app = express();

// Protected route requiring 1 USDC payment
app.get('/api/premium-data',
  x402Middleware(1.0, 'TREASURY_PUBLIC_KEY_HERE'),
  (req, res) => {
    // Payment verified; access granted
    const { signature, amountUsdc } = res.locals.verifiedPayment;
    res.json({ data: 'premium content', paidWith: signature });
  }
);
```

## Payment Flow

1. Client makes request without payment → 402 response with treasury address and amount
2. Client sends USDC to treasury on-chain, obtains transaction signature
3. Client retries request with `X-Payment-Signature: <tx_sig>` header
4. Middleware verifies transaction on Solana, checks treasury inflow, marks signature as consumed
5. Request proceeds to handler with `res.locals.verifiedPayment` populated

## Security Features

- **Replay Protection**: Each signature can only be used once within 24hr TTL window
- **On-Chain Verification**: Confirms transaction exists, succeeded, and matches treasury/amount
- **Amount Enforcement**: Validates exact USDC inflow to treasury address
- **Signature Pruning**: Auto-prunes expired signatures every 5 minutes to prevent memory bloat

## Configuration

Environment variables (set in `backend/x402/.env`):

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
REDIS_URL=redis://localhost:6379     # Falls back to in-memory if not set
X402_TREASURY_PUBKEY=<AgentTreasury PDA address>
X402_PRICE_LAMPORTS=1000000          # 1 USDC (6 decimals)
```

Constants in `middleware-redis.ts`:

- `DEVNET_USDC_MINT`: Devnet USDC mint address
- `REPLAY_TTL_MS`: 24 hours
- `REPLAY_PRUNE_INTERVAL_MS`: 5 minutes
- `MAX_CONSUMED_SIGNATURES`: 100,000 signatures

---

## Redis Setup

Redis is used as the replay-protection store. If `REDIS_URL` is not set, the middleware falls back to an in-memory store (local dev only — not safe for production).

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu / WSL
sudo apt install redis-server && redis-server --daemonize yes

# Verify Redis is running
redis-cli ping   # Should return: PONG
```

Then set in your `.env`:
```bash
REDIS_URL=redis://localhost:6379
```

> ⚠️ In production (Vercel / Railway / Render), use a managed Redis instance (e.g., Upstash). The in-memory fallback does **not** persist across serverless cold starts.

---

## 402 Response Format

When a request arrives without payment, the middleware returns:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "Payment required",
  "payment": {
    "treasury": "Tx72udP7...",
    "amount": 1.0,
    "currency": "USDC",
    "network": "solana-devnet"
  }
}
```

The client should send USDC to the `treasury` address on-chain, then retry with `X-Payment-Signature: <tx_sig>`.

---

## Running Tests

```bash
cd backend/x402
npm install

# Unit tests (no network required)
npm test

# Integration test (requires funded devnet wallet and SOLANA_RPC_URL)
npm run test:integration
```

## Deployment Status

x402 is implemented and tested as an optional off-chain payment guard. The next milestone is product adoption: wiring it into one real API endpoint and verifying it against a live treasury after redeploy.

The first paid route now exists in the metadata API deployment surface:

- `GET /premium/treasury/:agentId`

It returns a paid treasury snapshot for a live `AgentIdentity` PDA and uses x402-style settlement verification against that agent's treasury PDA.
