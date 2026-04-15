# @agentid/eliza-plugin

> Plugin for [ElizaOS](https://github.com/elizaOS/eliza) that connects AI agents to the AgentID KYA on-chain identity and reputation protocol.

This plugin lets ElizaOS-powered agents:
- Read their own on-chain identity and reputation
- Verify other agents before interacting with them
- Automatically log completed actions back on-chain for reputation tracking

---

## Installation

```bash
npm install @agentid/eliza-plugin @agentid/sdk @solana/web3.js
```

---

## Quick Start

```ts
import { AgentRuntime } from "@ai16z/eliza";
import { agentIdPlugin } from "@agentid/eliza-plugin";

const agent = new AgentRuntime({
  plugins: [agentIdPlugin],
  settings: {
    SOLANA_RPC_URL: "https://api.devnet.solana.com",
    ORACLE_PRIVATE_KEY: process.env.ORACLE_PRIVATE_KEY,
  },
});
```

The plugin automatically connects to the AgentID program on devnet using `@agentid/sdk`.

---

## Settings Reference

| Setting | Required | Description |
|---|---|---|
| `SOLANA_RPC_URL` | ✅ | Solana RPC endpoint |
| `ORACLE_PRIVATE_KEY` | ✅ | Wallet keypair as JSON byte array (`[1,2,3,...]`) used for on-chain writes |

---

## Actions

### `GET_MY_REPUTATION`

Reads the current on-chain AgentID identity and reputation summary for the agent's wallet.

**Returns:**
```ts
{
  name: string;
  reputationScore: number;      // 0–1000
  verifiedLevel: "Unverified" | "EmailVerified" | "KYBVerified" | "Audited";
  totalTransactions: number;
  successRate: number;          // 0.0–1.0
  capabilities: string[];
}
```

---

### `VERIFY_COUNTERPARTY_AGENT`

Checks if another agent is registered on-chain and authorized to perform a specific action type. Uses the SDK's `verifyAgent()` helper.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `agentPubkey` | `string` | The public key of the agent to verify |
| `actionType` | `string` | One of: `"defi_trade"`, `"payment"`, `"content"`, `"other"` |

**Authorization thresholds:**

| Action type | Minimum reputation score |
|---|---|
| `defi_trade` | 600 |
| `payment` | 400 |
| `content` | 200 |
| `other` | 100 |

Both the reputation score **and** the capability flags on the identity are checked before reporting an agent as authorized.

> ⚠️ This is a **client-side helper check only**. It does not replace on-chain enforcement for security-sensitive flows — use on-chain instruction guards for those.

---

### Auto-Logging

The plugin monitors completed ElizaOS actions and automatically submits `logAction()` SDK calls to the AgentID program. This appends `AgentAction` records on-chain, which:

- Feed into reputation scoring (success rate component)
- Create an auditable action trail

The log entry records action type, outcome (success/failure), USDC transferred (if any), and a memo.

> ⚠️ **Status:** Auto-logging is implemented as a plugin-side wrapper. The mapping from ElizaOS action types to AgentID action categories is basic — more action type coverage may be needed for your use case.

---

## Build

```bash
cd packages/eliza-plugin
npm install
npm run build
```

---

## Current Limits

| Limitation | Detail |
|---|---|
| npm publication | The package builds locally but npm release automation is not set up yet. Use a local `npm link` or path import for now. |
| Client-side auth only | Authorization checks in `VERIFY_COUNTERPARTY_AGENT` are SDK-level, not on-chain enforcement. |
| Action type mapping | Auto-logging maps ElizaOS actions to a fixed set of AgentID action types — custom action types require code changes. |
| ElizaOS version pinning | Tested against `@ai16z/eliza` v0.x — compatibility with newer versions is not guaranteed. |

---

## Related Docs

| Doc | What it covers |
|---|---|
| [packages/sdk/README.md](../sdk/README.md) | Full SDK method reference |
| [docs/architecture.md](../../docs/architecture.md) | System architecture overview |
| [README.md](../../README.md) | Project quick start |
