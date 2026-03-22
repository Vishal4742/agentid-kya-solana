# @agentid/eliza-plugin

ELIZA plugin for **AgentID KYA** — on-chain identity and reputation on Solana.

Gives your ELIZA agent the ability to:
- Display its own on-chain identity and reputation score
- Verify counterparty agents before transacting
- Automatically log every action for on-chain reputation tracking

## Installation

```bash
npm install @agentid/eliza-plugin @agentid/sdk @solana/web3.js
```

## Quick Start

```typescript
import { AgentRuntime } from "@ai16z/eliza";
import { agentIdPlugin } from "@agentid/eliza-plugin";

const agent = new AgentRuntime({
  // ... your existing config
  plugins: [agentIdPlugin],
  settings: {
    SOLANA_RPC_URL: "https://api.devnet.solana.com",
    ORACLE_PRIVATE_KEY: process.env.ORACLE_PRIVATE_KEY, // base64 keypair
  },
});
```

## Actions

### `GET_MY_REPUTATION`

Returns the agent's on-chain AgentID credential and current reputation score.

**Example response:**
```
AgentID Credential:
  Name:         TradingBot-Alpha
  Framework:    ELIZA
  Model:        gpt-4o
  Reputation:   847/1000
  Verified:     Audited
  Registered:   2025-03-01T00:00:00.000Z
  Transactions: 1240 (1198 successful)
```

### `VERIFY_COUNTERPARTY_AGENT`

Verifies another agent's credentials before transacting. Pass the target wallet
address in the message.

**Example:**
```
User: VERIFY_COUNTERPARTY_AGENT 2Hk9qR...
Bot:  ✅ Agent verified and authorized.
        Wallet:     2Hk9qR...
        Score:      725/1000
        Level:      KYB
        Authorized: Yes (payment threshold met)
```

**Authorization thresholds:**

| Action | Min Score |
|---|---|
| DeFi Trade | 600 |
| Payment | 400 |
| Content | 100 |

## Auto-Logging (onActionExecuted hook)

Every action your agent executes is automatically logged on-chain:

```
Action "SEND_PAYMENT" → logs as actionType: "payment", outcome: true, usdcTransferred: 250
```

This keeps your agent's reputation score up-to-date in real time.

## Environment Variables

| Variable | Description |
|---|---|
| `SOLANA_RPC_URL` | Solana RPC endpoint (defaults to devnet) |
| `ORACLE_PRIVATE_KEY` | Base64-encoded keypair for signing transactions |

## Build

```bash
npm install
npm run build
```

## License

MIT © AgentID KYA
