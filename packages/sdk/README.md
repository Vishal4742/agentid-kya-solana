# @agentid/sdk

TypeScript SDK for **AgentID KYA** — on-chain agent identity and reputation on Solana.

## Installation

```bash
npm install @agentid/sdk @coral-xyz/anchor @solana/web3.js
```

## Quick Start

```typescript
import { Connection } from "@solana/web3.js";
import { AgentIdClient, DEVNET_RPC } from "@agentid/sdk";

// Setup
const connection = new Connection(DEVNET_RPC, "confirmed");
const client = new AgentIdClient(connection, wallet); // AnchorWallet
```

## API Reference

### `new AgentIdClient(connection, wallet)`

Creates a new client instance.

| Param | Type |
|---|---|
| `connection` | `Connection` |
| `wallet` | `AnchorWallet` |

---

### `registerAgent(params)` → `Promise<string>`

Registers a new agent identity on-chain. Returns the transaction signature.

```typescript
const sig = await client.registerAgent({
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
  gstin: "29ABCDE1234F1Z5",   // optional — India compliance
  panHash: "sha256hash...",   // optional
});
```

---

### `getAgentIdentity(ownerPubkey)` → `Promise<AgentIdentity | null>`

Fetches an agent's on-chain identity by their owner wallet address.

```typescript
const identity = await client.getAgentIdentity("2Hk9q...");
if (identity) {
  console.log(identity.name, identity.reputationScore);
}
```

---

### `verifyAgent(ownerPubkey, actionType)` → `Promise<VerificationResult>`

Checks if an agent is registered and authorized for a specific action type.

| `actionType` | Min Reputation Required |
|---|---|
| `"defi_trade"` | 600 |
| `"payment"` | 400 |
| `"content"` | 100 |
| `"other"` | 100 |

```typescript
const result = await client.verifyAgent("2Hk9q...", "payment");

if (!result.isAuthorized) {
  console.error(`Agent not authorized. Score: ${result.reputationScore}/1000`);
} else {
  console.log(`✅ Authorized. Level: ${result.verifiedLevel}`);
}
```

---

### `rateAgent(agentPDA, rating)` → `Promise<string>`

Submit a human rating (1–5 stars) for an agent. Returns the tx signature.

```typescript
const sig = await client.rateAgent("AgentPDA...", 5);
```

---

### `logAction(params)` → `Promise<string>`

Log a completed action on-chain for reputation tracking.

```typescript
const sig = await client.logAction({
  actionType: "payment",
  programCalled: "PROGRAM_ID",
  outcome: true,
  usdcTransferred: 250.00,
});
```

---

### `getAllAgents()` → `Promise<AgentIdentity[]>`

Returns all registered agents from the on-chain program.

```typescript
const agents = await client.getAllAgents();
agents.sort((a, b) => b.reputationScore - a.reputationScore);
```

---

## Types

```typescript
type AgentFramework = "ELIZA" | "AutoGen" | "CrewAI" | "LangGraph" | "Custom";
type VerifiedLevel  = "Unverified" | "KYB" | "Audited";
type ActionType     = "defi_trade" | "payment" | "content" | "other";
```

## Constants

```typescript
import { PROGRAM_ID, DEVNET_RPC } from "@agentid/sdk";
// PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF"
// DEVNET_RPC = "https://api.devnet.solana.com"
```

## Build

```bash
npm install
npm run build   # outputs to dist/
```

## License

MIT © AgentID KYA
