# Scripts Guide

This directory contains utility scripts for development, deployment, and testing.

## Available Scripts

### demo-devnet.sh
Demonstrates the AgentID registration flow on Solana devnet.

**Usage:**
`ash
bash scripts/demo-devnet.sh
`

**What it does:**
1. Checks wallet balance on devnet
2. Derives agent identity PDA
3. Registers the agent on-chain
4. Verifies the identity PDA exists
5. Fetches metadata from the API

**Prerequisites:**
- Solana CLI configured for devnet
- Funded devnet wallet
- .env files configured (see root README)

---

### sync-idl.ps1
Synchronizes the Anchor IDL (Interface Definition Language) between local and deployed program.

**Usage (PowerShell):**
`powershell
.\scripts\sync-idl.ps1
`

**What it does:**
- Fetches the current IDL from deployed Anchor program
- Syncs type definitions with frontend and SDK packages
- Ensures all consumers have up-to-date program interface

**Prerequisites:**
- PowerShell 7+
- Anchor CLI installed
- Connected wallet has access to deployed program

---

## Adding New Scripts

When adding new scripts:

1. Use clear, descriptive names (e.g., deploy-mainnet.sh, 	est-integration.sh)
2. Add a header comment explaining the script's purpose
3. Document prerequisites and usage in this README
4. Make scripts executable: chmod +x scripts/script-name.sh
5. Test on both Unix-like systems and Windows (use .sh for bash, .ps1 for PowerShell)

## Script Conventions

- **Bash scripts** (.sh): Use for cross-platform, Unix-compatible tasks
- **PowerShell scripts** (.ps1): Use for Windows-specific or complex automation
- **Node.js scripts**: Add to package.json scripts section instead

---

## Troubleshooting

If scripts fail:

1. Check prerequisites are installed: solana --version, nchor --version, 
ode --version
2. Ensure environment variables are set: Check .env and .env.local files
3. Review script output for specific errors
4. Check wallet balance and permissions: solana balance

For issues, open a GitHub issue or see [SUPPORT.md](../SUPPORT.md).
