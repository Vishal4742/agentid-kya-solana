# Scripts Guide

This directory contains utility scripts for development, deployment, and testing.

## demo-devnet.sh

Demonstrates the AgentID registration flow on Solana devnet.

```bash
bash scripts/demo-devnet.sh
```

What it does:
1. Checks wallet balance on devnet
2. Derives the agent identity PDA
3. Registers the agent on-chain
4. Verifies the identity PDA exists
5. Fetches metadata from the API

Prerequisites:
- Solana CLI configured for devnet
- Funded devnet wallet
- `.env` files configured

## sync-idl.ps1

Synchronizes the Anchor IDL between the local workspace and consumers.

```powershell
.\scripts\sync-idl.ps1
```

What it does:
- Fetches or copies the latest program interface
- Syncs generated types for frontend and SDK consumers
- Keeps the local toolchain aligned with the deployed program shape

Prerequisites:
- PowerShell 7+
- Anchor CLI installed

## Adding New Scripts

When adding a new script:

1. Use a descriptive name.
2. Document usage and prerequisites here.
3. Prefer `.sh` for bash-oriented tasks and `.ps1` for PowerShell-specific workflows.
4. Keep scripts executable and test them before relying on them in docs.
