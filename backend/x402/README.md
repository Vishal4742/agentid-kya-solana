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

- **Replay Store Scaling**: In-memory Map with pruning is simple but doesn't scale horizontally; Redis upgrade path exists
- **Coupling**: Payment logic lives with backend; acceptable since x402 is optional supplemental layer
- **Resource Sharing**: Uses same Express server as other API endpoints; fine for current load

## Current Implementation Status

### ✅ Completed (60%)

- HTTP 402 response format with payment requirements
- On-chain transaction verification via Solana RPC
- Treasury USDC inflow calculation from pre/post token balances
- Replay protection with in-memory Map (24hr TTL, auto-pruning)
- Express middleware interface with `res.locals.verifiedPayment`

### 🔲 Remaining (40%)

- [ ] Settlement validation rules documentation
- [ ] Redis replay store for production
- [ ] Unit and integration tests
- [ ] API integration guide

## Usage

```typescript
import express from 'express';
import { x402Middleware } from './x402/middleware';

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

Environment variables (loaded from `backend/.env`):

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
```

Constants in `middleware.ts`:

- `DEVNET_USDC_MINT`: Devnet USDC mint address
- `REPLAY_TTL_MS`: 24 hours
- `REPLAY_PRUNE_INTERVAL_MS`: 5 minutes
- `MAX_CONSUMED_SIGNATURES`: 100,000 signatures

## Deployment Status

**Deprioritized for devnet launch** — x402 is an optional off-chain layer. The canonical payment mechanism is the `autonomous_payment` instruction in the Anchor program.

Integration with API endpoints is deferred until post-devnet.
