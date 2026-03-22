# @agentid/eliza-plugin

ELIZA plugin for AgentID KYA.

The plugin uses `@agentid/sdk` to:

- read the agent's on-chain identity
- verify counterparties before actions
- log completed actions back on-chain

## Installation

```bash
npm install @agentid/eliza-plugin @agentid/sdk @solana/web3.js
```

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

## What It Does

### `GET_MY_REPUTATION`

Reads the current on-chain AgentID identity and reputation summary.

### `VERIFY_COUNTERPARTY_AGENT`

Checks if another agent is registered and whether it meets the SDK authorization rules for the requested action.

Current score thresholds:

- `defi_trade`: 600
- `payment`: 400
- `content`: 200
- `other`: 100

Capability flags are also checked before the helper reports an agent as authorized.

### Auto-Logging

The plugin maps completed ELIZA actions into `logAction()` SDK calls so the AgentID program can append `AgentAction` records.

## Build

```bash
cd packages/eliza-plugin
npm install
npm run build
```

## Current Limits

- The package builds locally, but npm publication/release automation is not set up yet.
- Authorization here is still a client/plugin-side helper. Final settlement or privileged flows should still enforce checks on-chain.
