# @agentid/sdk

TypeScript SDK for AgentID KYA on Solana devnet.

This package is currently aligned with the generated Anchor IDL shipped in `src/idl/agentid_program.json`.

## Installation

```bash
npm install @agentid/sdk @coral-xyz/anchor @solana/web3.js
```

## Quick Start

```ts
import { Connection } from "@solana/web3.js";
import { AgentIdClient, DEVNET_RPC } from "@agentid/sdk";

const connection = new Connection(DEVNET_RPC, "confirmed");
const client = new AgentIdClient(connection, wallet);
```

## Supported Methods

### `registerAgent(params)`

Registers the connected wallet's `AgentIdentity` PDA.

```ts
await client.registerAgent({
  name: "TradingBot-Alpha",
  framework: "ELIZA",
  model: "gpt-4o",
  agentWallet: "AgentWalletPubkey...",
  capabilities: {
    defiTrading: true,
    paymentSending: true,
    contentPublishing: false,
    dataAnalysis: true,
    maxUsdcTx: 5000,
  },
  gstin: "29ABCDE1234F1Z5",
  panHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  serviceCategory: "Information Technology Services",
});
```

### `getAgentIdentity(ownerPubkey)`

Fetches and normalizes the on-chain `AgentIdentity` account for an owner wallet.

### `getAllAgents()`

Returns all registered identities from the program.

### `verifyAgent(ownerPubkey, actionType)`

Performs an SDK-side authorization check using both:

- current reputation thresholds
- capability flags stored on the identity

Supported action types:

- `"defi_trade"`
- `"payment"`
- `"content"`
- `"other"`

### `rateAgent(agentPda, rating)`

Submits a human rating from 1 to 5.

### `logAction(params)`

Derives the next `AgentAction` PDA from the identity and submits a log entry.

```ts
await client.logAction({
  actionType: "payment",
  programCalled: "11111111111111111111111111111111",
  outcome: true,
  usdcTransferred: 250,
  memo: "invoice settlement",
});
```

### Treasury Methods

The SDK now exposes the core treasury flows used by phase 8:

- `initializeTreasury(usdcMint, spendingLimitPerTx, spendingLimitPerDay, multisigRequiredAbove)`
- `depositToTreasury(treasuryOwnerPubkey, amountUsdc, usdcMint?)`
- `getTreasury(ownerPubkey)`
- `updateSpendingLimits(ownerPubkey, spendingLimitPerTx, spendingLimitPerDay, multisigRequiredAbove)`
- `emergencyPause(ownerPubkey, paused)`
- `autonomousPayment(ownerPubkey, recipientUsdcAccount, amountUsdc, memo?)`

Example:

```ts
import { AgentIdClient, DEVNET_USDC_MINT } from "@agentid/sdk";

await client.initializeTreasury(
  DEVNET_USDC_MINT,
  250 * 1_000_000,
  1_000 * 1_000_000,
  800 * 1_000_000,
);

await client.depositToTreasury(
  wallet.publicKey.toBase58(),
  25,
);

const treasury = await client.getTreasury(wallet.publicKey.toBase58());
console.log(treasury?.usdcBalance);
```

## Types

```ts
type AgentFramework =
  | "ELIZA"
  | "AutoGen"
  | "CrewAI"
  | "LangGraph"
  | "Custom";

type VerifiedLevel =
  | "Unverified"
  | "EmailVerified"
  | "KYBVerified"
  | "Audited";
```

`AgentIdentity` normalization currently includes:

- owner and agent wallet addresses
- framework and model
- verified level
- reputation stats
- capability flags
- India compliance fields (`gstin`, `panHash`, `serviceCategory`)
- `credentialNft`

## Constants

```ts
import {
  PROGRAM_ID,
  DEVNET_RPC,
  DEVNET_USDC_MINT,
  deriveAssociatedTokenAccount,
  deriveTreasuryPda,
  deriveTreeAuthority,
} from "@agentid/sdk";
```

- `PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF"`
- `DEVNET_RPC = "https://api.devnet.solana.com"`
- `DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"`

## Build

```bash
cd packages/sdk
npm install
npm run build
npm test
```

---

## Error Handling

The SDK throws standard JavaScript errors. Common errors you may encounter:

| Error message | Meaning | Fix |
|---|---|---|
| `Account does not exist` | The agent PDA hasn't been created yet | Call `registerAgent()` first |
| `Missing ORACLE_PRIVATE_KEY` | Oracle env var not set | Set `ORACLE_PRIVATE_KEY` in your `.env` |
| `Invalid ORACLE_PRIVATE_KEY format. Must be a JSON array.` | Key format wrong | Use `[1,2,3,...]` byte array format, not base58 |
| `Program was packed or has no data` | Wrong Program ID | Check `PROGRAM_ID` constant against your deployed program |
| `Signature verification failed` | Wrong wallet signing | Ensure the wallet matches the agent owner |

Wrap SDK calls in try/catch for production use:

```ts
try {
  await client.registerAgent({ name: "my-agent", ... });
} catch (err) {
  console.error("Registration failed:", err.message);
}
```

---

## IDL Sync (For Consumers)

If you are building on top of this SDK and the on-chain program changes, the SDK's IDL may be out of date. After a program update:

1. Rebuild the Anchor program: `cd backend && anchor build`
2. Sync the IDL: `pwsh ./scripts/sync-idl.ps1`
3. Rebuild the SDK: `cd packages/sdk && npm run build`

The IDL file lives at `packages/sdk/src/idl/agentid_program.json`.

---

## USDC Units

All USDC amounts in treasury methods are in **micro-USDC** (6 decimal places), matching the on-chain token representation:

| Human amount | Micro-USDC value |
|---|---|
| 1 USDC | `1_000_000` |
| 10 USDC | `10_000_000` |
| 100 USDC | `100_000_000` |

The `depositToTreasury()` method is the exception — it accepts whole USDC:

```ts
await client.depositToTreasury(ownerPubkey, 25);  // deposits 25 USDC
```

## Current Limits

- This package assumes the current devnet program/IDL shape and is not version-negotiated.
- `verifyAgent()` is a client-side helper, not a replacement for on-chain verification in security-sensitive flows.
- Treasury limit initialization methods currently take raw micro-USDC amounts for parity with the on-chain instruction API.
- x402 remains a separate middleware package rather than an SDK transport concern.
