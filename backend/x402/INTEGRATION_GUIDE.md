# x402 Middleware Integration Guide

## Quick Start

### 1. Installation

```bash
cd backend/x402
npm install
npm run build
```

### 2. Environment Configuration

Add to `backend/.env`:

```bash
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Redis for production replay protection
# REDIS_URL=redis://localhost:6379
```

### 3. Basic Usage

```typescript
import express from 'express';
import { x402Middleware } from './x402/middleware';

const app = express();

// Define treasury public key
const TREASURY_PUBKEY = process.env.TREASURY_PUBKEY || "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

// Protected endpoint requiring 1 USDC payment
app.get('/api/premium-data',
  x402Middleware(1.0, TREASURY_PUBKEY),
  (req, res) => {
    const { signature, amountUsdc, treasury } = res.locals.verifiedPayment;
    res.json({
      data: 'Your premium content here',
      payment: { signature, amount: amountUsdc, treasury }
    });
  }
);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## Client-Side Integration

### Payment Flow

1. **Request without payment** → Get payment requirements
2. **Send USDC on-chain** → Obtain transaction signature
3. **Retry with signature** → Access granted

### Example Client (TypeScript/Node.js)

```typescript
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import fetch from "node-fetch";

const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const API_ENDPOINT = "https://your-api.com/api/premium-data";

async function accessPremiumEndpoint(payer: Keypair) {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Step 1: Try to access endpoint (get payment requirements)
  const initialResponse = await fetch(API_ENDPOINT);
  
  if (initialResponse.status === 402) {
    const paymentInfo = await initialResponse.json();
    console.log("Payment required:", paymentInfo);
    
    const requiredAmount = paymentInfo.required_amount;
    const treasury = new PublicKey(paymentInfo.treasury);
    const mint = new PublicKey(paymentInfo.mint);
    
    // Step 2: Send USDC payment
    const payerTokenAccount = await getAssociatedTokenAddress(mint, payer.publicKey);
    const treasuryTokenAccount = await getAssociatedTokenAddress(mint, treasury);
    
    const transferIx = createTransferInstruction(
      payerTokenAccount,
      treasuryTokenAccount,
      payer.publicKey,
      Math.round(requiredAmount * 1_000_000) // Convert to raw amount
    );
    
    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction().add(transferIx);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    
    const signature = await connection.sendTransaction(transaction, [payer]);
    await connection.confirmTransaction(signature, "confirmed");
    
    console.log("Payment sent:", signature);
    
    // Step 3: Retry request with payment signature
    const finalResponse = await fetch(API_ENDPOINT, {
      headers: {
        "X-Payment-Signature": signature,
      },
    });
    
    if (finalResponse.ok) {
      const data = await finalResponse.json();
      console.log("Access granted:", data);
      return data;
    } else {
      const error = await finalResponse.json();
      console.error("Payment verification failed:", error);
      throw new Error(error.error);
    }
  } else if (initialResponse.ok) {
    // Already paid or no payment required
    return await initialResponse.json();
  } else {
    throw new Error(`Unexpected response: ${initialResponse.status}`);
  }
}
```

### Example Client (Browser / React)

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

function usePremiumData() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  async function fetchPremiumData() {
    const response = await fetch('/api/premium-data');
    
    if (response.status === 402) {
      const paymentInfo = await response.json();
      
      // Prompt user to approve payment
      if (!confirm(`Pay ${paymentInfo.required_amount} USDC to access?`)) {
        return;
      }
      
      // Send payment transaction
      const mint = new PublicKey(paymentInfo.mint);
      const treasury = new PublicKey(paymentInfo.treasury);
      
      const payerTokenAccount = await getAssociatedTokenAddress(mint, publicKey!);
      const treasuryTokenAccount = await getAssociatedTokenAddress(mint, treasury);
      
      const transferIx = createTransferInstruction(
        payerTokenAccount,
        treasuryTokenAccount,
        publicKey!,
        Math.round(paymentInfo.required_amount * 1_000_000)
      );
      
      const transaction = new Transaction().add(transferIx);
      const signature = await sendTransaction(transaction, connection);
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Retry with payment signature
      const finalResponse = await fetch('/api/premium-data', {
        headers: { 'X-Payment-Signature': signature }
      });
      
      return await finalResponse.json();
    }
    
    return await response.json();
  }
  
  return { fetchPremiumData };
}
```

## Advanced Usage

### Multiple Payment Tiers

```typescript
// Free tier
app.get('/api/basic-data', (req, res) => {
  res.json({ data: 'Free content' });
});

// Standard tier - 0.1 USDC
app.get('/api/standard-data',
  x402Middleware(0.1, TREASURY_PUBKEY),
  (req, res) => {
    res.json({ data: 'Standard content' });
  }
);

// Premium tier - 1.0 USDC
app.get('/api/premium-data',
  x402Middleware(1.0, TREASURY_PUBKEY),
  (req, res) => {
    res.json({ data: 'Premium content' });
  }
);

// Enterprise tier - 10.0 USDC
app.get('/api/enterprise-data',
  x402Middleware(10.0, TREASURY_PUBKEY),
  (req, res) => {
    res.json({ data: 'Enterprise content' });
  }
);
```

### Dynamic Pricing

```typescript
function dynamicPricingMiddleware(req: Request, res: Response, next: NextFunction) {
  const itemId = req.params.id;
  const item = getItem(itemId);
  const price = item.price; // e.g., 2.5 USDC
  
  const middleware = x402Middleware(price, TREASURY_PUBKEY);
  return middleware(req, res, next);
}

app.get('/api/items/:id', dynamicPricingMiddleware, (req, res) => {
  res.json({ item: getItem(req.params.id) });
});
```

### Health Check Integration

```typescript
import { getReplayStoreStatus } from './x402/middleware-redis';

app.get('/health', (req, res) => {
  const replayStore = getReplayStoreStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    replay_store: replayStore
  });
});
```

### Audit Logging

```typescript
app.get('/api/protected',
  x402Middleware(1.0, TREASURY_PUBKEY),
  async (req, res) => {
    const { signature, amountUsdc, treasury } = res.locals.verifiedPayment;
    
    // Log payment for audit trail
    await db.payments.insert({
      signature,
      amount: amountUsdc,
      treasury,
      endpoint: req.path,
      ip: req.ip,
      timestamp: new Date(),
    });
    
    res.json({ data: 'protected content' });
  }
);
```

## Error Handling

### Client-Side Error Handling

```typescript
async function callProtectedEndpoint(signature?: string) {
  const headers: Record<string, string> = {};
  if (signature) {
    headers['X-Payment-Signature'] = signature;
  }
  
  try {
    const response = await fetch('/api/protected', { headers });
    
    switch (response.status) {
      case 200:
        return await response.json();
      
      case 402: {
        const info = await response.json();
        if (info.error === "Payment Required") {
          // No payment provided - show payment UI
          console.log(`Pay ${info.required_amount} USDC to ${info.treasury}`);
        } else if (info.error === "Insufficient payment") {
          // Paid but not enough
          console.error(`Insufficient: sent ${info.observed_amount}, need ${info.required_amount}`);
        }
        break;
      }
      
      case 409: {
        // Signature already used
        const info = await response.json();
        console.error("Replay detected:", info.message);
        break;
      }
      
      case 400: {
        // Bad transaction
        const info = await response.json();
        console.error("Invalid transaction:", info.error);
        break;
      }
      
      case 500: {
        // Server error
        console.error("Server error verifying payment");
        break;
      }
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}
```

## Testing

### Run Unit Tests

```bash
cd backend/x402
npm test
```

### Run Integration Tests (Devnet)

```bash
cd backend/x402
INTEGRATION=true npm test -- integration.test.ts
```

### Manual Testing with cURL

```bash
# 1. Get payment requirements
curl -i http://localhost:3000/api/protected

# Response: 402 Payment Required
# {
#   "error": "Payment Required",
#   "required_amount": 1.0,
#   "treasury": "7xKXtg2...",
#   "currency": "USDC",
#   "mint": "4zMMC9..."
# }

# 2. Send USDC payment on-chain (using Solana CLI or wallet)
# Get transaction signature: TX_SIG

# 3. Retry with payment signature
curl -H "X-Payment-Signature: TX_SIG" http://localhost:3000/api/protected

# Response: 200 OK
# { "data": "premium content", "payment": { ... } }

# 4. Try to replay same signature
curl -H "X-Payment-Signature: TX_SIG" http://localhost:3000/api/protected

# Response: 409 Conflict
# { "error": "Replay detected", "message": "..." }
```

## Troubleshooting

### "Transaction not found or not confirmed on-chain"

**Cause**: Transaction hasn't been confirmed yet or doesn't exist

**Solution**:
- Wait for transaction confirmation (`confirmed` commitment)
- Verify transaction signature is correct
- Check Solana explorer: `https://explorer.solana.com/tx/<signature>?cluster=devnet`

### "Insufficient payment"

**Cause**: Transaction doesn't transfer enough USDC to treasury

**Solution**:
- Verify you're sending to correct treasury address
- Check token amount (1 USDC = 1,000,000 raw units)
- Ensure using correct USDC mint (devnet vs mainnet)

### "Replay detected"

**Cause**: Payment signature was already used

**Solution**:
- Each payment can only be used once
- Create a new payment transaction for each request
- Check if endpoint was already accessed successfully

### "Failed to verify payment signature on Solana"

**Cause**: RPC error or network issue

**Solution**:
- Check `SOLANA_RPC_URL` is correct and accessible
- Verify RPC endpoint is responsive
- Consider using a dedicated RPC provider (Helius, QuickNode)

### Redis Connection Issues

**Cause**: Redis unavailable or misconfigured

**Solution**:
- Middleware automatically falls back to in-memory store
- Check `REDIS_URL` environment variable
- Verify Redis server is running: `redis-cli ping`
- Review logs for Redis connection errors

## Production Checklist

- [ ] Set `REDIS_URL` for distributed replay protection
- [ ] Use dedicated Solana RPC provider (not public endpoint)
- [ ] Configure Redis password and TLS
- [ ] Set appropriate payment amounts for your use case
- [ ] Implement rate limiting (per IP or wallet)
- [ ] Add payment audit logging
- [ ] Monitor treasury balance and alert on anomalies
- [ ] Test with mainnet USDC before launch
- [ ] Document payment flow for users
- [ ] Set up health check monitoring

## API Reference

### Middleware Function

```typescript
x402Middleware(requiredUsdcAmount: number, treasuryAddress: string)
```

**Parameters:**
- `requiredUsdcAmount` - USDC amount required (e.g., 1.0 for 1 USDC)
- `treasuryAddress` - Treasury public key (base58 string)

**Returns:** Express middleware function

### Response Object (Success)

```typescript
res.locals.verifiedPayment = {
  signature: string;        // Transaction signature
  treasury: string;         // Treasury address
  mint: string;             // USDC mint address
  amountRaw: string;        // Raw token amount (bigint as string)
  amountUsdc: number;       // USDC amount with decimals
}
```

### Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Payment verified, request processed |
| 400 | Bad Request | Invalid transaction or not confirmed |
| 402 | Payment Required | No signature or insufficient amount |
| 409 | Conflict | Replay detected (signature reused) |
| 500 | Internal Server Error | RPC failure or server error |

## Support

For issues or questions:
- Review [SETTLEMENT_RULES.md](./SETTLEMENT_RULES.md) for validation logic
- Check [REDIS_CONFIG.md](./REDIS_CONFIG.md) for Redis setup
- See [README.md](./README.md) for architecture decisions
- Open an issue in the repository

## License

MIT
