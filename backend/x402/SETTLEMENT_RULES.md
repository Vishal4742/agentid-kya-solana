# x402 Settlement Validation Rules

## Payment Verification Requirements

### 1. Transaction Confirmation Level
- **Requirement**: Transaction must be `confirmed` (not just `processed`)
- **Rationale**: Prevents accepting transactions that may be rolled back
- **Implementation**: `commitment: "confirmed"` in `getParsedTransaction`

### 2. Transaction Success
- **Requirement**: `tx.meta.err` must be null
- **Rationale**: Failed transactions don't transfer funds
- **Error Response**: 400 Bad Request with "Transaction failed on-chain"

### 3. Treasury Address Verification
- **Requirement**: Payment must increase USDC balance of specified treasury address
- **Match Logic**: 
  - Token account pubkey === treasury address, OR
  - Token account owner === treasury address
- **Rationale**: Supports both ATA and custom token accounts owned by treasury

### 4. Token Mint Verification
- **Requirement**: Only USDC token transfers count toward payment
- **Mint Address**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Devnet USDC)
- **Rationale**: Prevents payment with worthless tokens

### 5. Amount Verification
- **Requirement**: `postBalance - preBalance >= requiredAmountRaw`
- **Precision**: Raw token amounts (1 USDC = 1,000,000 raw units, 6 decimals)
- **Aggregation**: If multiple token accounts receive USDC in same transaction, sum all inflows
- **Error Response**: 402 Payment Required with observed vs required amounts

### 6. Replay Protection
- **Requirement**: Each transaction signature can only be consumed once
- **TTL**: 24 hours
- **Storage**: In-memory Map (production should use Redis)
- **Error Response**: 409 Conflict with "Replay detected"
- **Pruning**: Auto-prune every 5 minutes or when > 100k signatures stored

### 7. Transaction Timeout Window
- **Requirement**: Transaction must be retrievable on-chain
- **No Explicit Timeout**: Relies on Solana RPC returning transaction
- **Future Enhancement**: Could add `blockTime` check to reject old transactions (e.g., > 1 hour old)

### 8. Multi-Payment Aggregation
- **Current Implementation**: Single transaction verification
- **Future Enhancement**: Could accept multiple signatures that collectively meet required amount
- **Use Case**: Large payments split across multiple transactions
- **Not Implemented**: Out of scope for v1

## Validation Flow

```
1. Extract X-Payment-Signature header
   └─ Missing? → 402 with payment requirements

2. Check replay cache
   └─ Signature seen? → 409 Replay detected

3. Fetch transaction from Solana RPC
   └─ Not found? → 400 Transaction not found
   └─ Still pending? → 400 Transaction not confirmed

4. Check transaction success
   └─ tx.meta.err != null? → 400 Transaction failed on-chain

5. Calculate USDC inflow to treasury
   └─ For each postTokenBalance:
       ├─ Filter: mint === DEVNET_USDC_MINT
       ├─ Filter: targets treasury address
       └─ Sum: (postBalance - preBalance) if positive

6. Verify amount
   └─ inflow < required? → 402 Insufficient payment

7. Mark signature as consumed
   └─ Store in replay cache with timestamp

8. Populate res.locals.verifiedPayment
   └─ Continue to route handler
```

## Error Response Format

### 402 Payment Required (No Signature)
```json
{
  "error": "Payment Required",
  "message": "Provide an 'X-Payment-Signature' header proving a 1.0 USDC payment to treasury ABC123...",
  "required_amount": 1.0,
  "treasury": "ABC123...",
  "currency": "USDC",
  "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
}
```

### 402 Insufficient Payment
```json
{
  "error": "Insufficient payment",
  "message": "Expected at least 1.0 USDC to treasury ABC123...",
  "observed_amount": 0.5,
  "required_amount": 1.0,
  "treasury": "ABC123...",
  "currency": "USDC",
  "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
}
```

### 409 Replay Detected
```json
{
  "error": "Replay detected",
  "message": "This payment signature has already been accepted."
}
```

### 400 Bad Request
```json
{
  "error": "Transaction not found or not confirmed on-chain."
}
```
or
```json
{
  "error": "Transaction failed on-chain."
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to verify payment signature on Solana."
}
```

## Success Response

When validation passes, `res.locals.verifiedPayment` is populated:

```typescript
{
  signature: string;        // Transaction signature
  treasury: string;         // Treasury address (base58)
  mint: string;             // USDC mint address
  amountRaw: string;        // Raw token amount (bigint as string)
  amountUsdc: number;       // USDC amount with decimals (e.g., 1.5)
}
```

## Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DEVNET_USDC_MINT` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | Devnet USDC mint address |
| `REPLAY_TTL_MS` | `86,400,000` (24 hours) | Signature TTL before auto-pruning |
| `REPLAY_PRUNE_INTERVAL_MS` | `300,000` (5 minutes) | Auto-prune interval |
| `MAX_CONSUMED_SIGNATURES` | `100,000` | Max signatures before forced pruning |
| `USDC_DECIMALS` | `6` | Token decimal places |

## Production Considerations

### Minimum Payment Amount
- **Recommendation**: Set minimum to cover Solana transaction fees (~0.005 SOL) plus desired revenue
- **Typical Values**: 0.1 - 10 USDC depending on API value
- **Anti-Spam**: Too low enables spam; too high reduces adoption

### Treasury Security
- **Multi-Sig**: Production treasury should use Squads or multi-sig
- **Monitoring**: Alert on unexpected treasury balance changes
- **Access Control**: Limit who can withdraw from treasury

### Replay Store Upgrade Path
- **Current**: In-memory Map (single-server only)
- **Production**: Redis with TTL (`SETEX` command)
- **Fallback**: If Redis unavailable, accept risk of replay across servers or reject requests

### Rate Limiting
- **Recommendation**: Add rate limiting per IP or wallet
- **Attack Vector**: Attacker could spam with invalid signatures
- **Mitigation**: Cloudflare, nginx rate limiting, or Express middleware

## Future Enhancements

1. **Transaction Age Check**: Reject transactions older than 1 hour
2. **Multi-Signature Payment**: Accept multiple tx signatures that sum to required amount
3. **Token Flexibility**: Support tokens other than USDC (SOL, BONK, etc.)
4. **Webhook Notifications**: Notify backend on successful payment for audit trail
5. **Refund Logic**: Partial refunds if user overpays
