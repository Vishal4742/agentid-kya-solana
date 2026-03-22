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
import { PROGRAM_ID, DEVNET_RPC } from "@agentid/sdk";
```

- `PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF"`
- `DEVNET_RPC = "https://api.devnet.solana.com"`

## Build

```bash
cd packages/sdk
npm install
npm run build
```

## Current Limits

- This package assumes the current devnet program/IDL shape and is not version-negotiated.
- `verifyAgent()` is a client-side helper, not a replacement for on-chain verification in security-sensitive flows.
- Treasury/x402 flows are not exposed from this package yet.
