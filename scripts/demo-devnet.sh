#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/demo-devnet.sh
#
# AgentID KYA — Live Devnet Demo Script
# Checks wallet balance, derives PDAs, verifies the program is live on devnet,
# and fetches metadata from the Vercel API.
#
# Usage:
#   bash scripts/demo-devnet.sh
#
# Requirements:
#   - Solana CLI (>= 1.18) installed and configured for devnet
#   - Node.js >= 18 with @solana/web3.js available (cd frontend && npm install)
#   - curl, bc, grep (POSIX)
#   - Funded devnet wallet (~0.1 SOL for balance check)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROGRAM_ID="Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF"
METADATA_API="https://agentid-metadata-api.vercel.app"
RPC="https://api.devnet.solana.com"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       AgentID KYA — Devnet Live Demo                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check wallet ───────────────────────────────────────────────────
echo "▶ Step 1/5 — Checking wallet balance..."
BALANCE=$(solana balance --url "$RPC" 2>&1)
echo "  Wallet balance: $BALANCE"

BALANCE_NUM=$(echo "$BALANCE" | grep -oP '[0-9]+\.[0-9]+' | head -1 || echo "0")
if (( $(echo "$BALANCE_NUM < 0.1" | bc -l 2>/dev/null || echo 1) )); then
  echo "  ⚠️  Low balance. Run: solana airdrop 2 --url $RPC"
fi

# ── Step 2: Derive Config PDA ──────────────────────────────────────────────
echo ""
echo "▶ Step 2/5 — Deriving program config PDA..."
CONFIG_PDA=$(node -e "
const { PublicKey } = require('@solana/web3.js');
const PROGRAM_ID = new PublicKey('$PROGRAM_ID');
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('program-config')],
  PROGRAM_ID
);
console.log(pda.toBase58());
" 2>/dev/null || echo "ERROR")

if [ "$CONFIG_PDA" = "ERROR" ]; then
  echo "  ✗ Could not derive PDA. Is @solana/web3.js installed?"
  echo "    Run: cd frontend && npm install"
  exit 1
fi
echo "  Config PDA: $CONFIG_PDA"

# Check if config PDA exists on-chain
CONFIG_CHECK=$(solana account "$CONFIG_PDA" --url "$RPC" 2>&1 | head -3 || echo "NOT FOUND")
if echo "$CONFIG_CHECK" | grep -q "Balance"; then
  echo "  ✅ Config PDA exists on devnet"
else
  echo "  ⚠️  Config PDA not found — run init_config first (see docs/operations/deployment.md Step 3)"
fi

# ── Step 3: Check program is live ─────────────────────────────────────────
echo ""
echo "▶ Step 3/5 — Verifying program is live on devnet..."
PROGRAM_CHECK=$(solana account "$PROGRAM_ID" --url "$RPC" 2>&1 | head -5)
if echo "$PROGRAM_CHECK" | grep -q "Executable"; then
  echo "  ✅ Program $PROGRAM_ID is live and executable"
else
  echo "  ✗ Program not found on devnet!"
  exit 1
fi

# ── Step 4: Derive identity PDA for current wallet ────────────────────────
echo ""
echo "▶ Step 4/5 — Deriving agent identity PDA for your wallet..."
WALLET_PUBKEY=$(solana-keygen pubkey 2>/dev/null || solana address 2>/dev/null || echo "UNKNOWN")
echo "  Wallet: $WALLET_PUBKEY"

IDENTITY_PDA=$(node -e "
const { PublicKey } = require('@solana/web3.js');
const PROGRAM_ID = new PublicKey('$PROGRAM_ID');
const WALLET = new PublicKey('$WALLET_PUBKEY');
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from('agent-identity'), WALLET.toBuffer()],
  PROGRAM_ID
);
console.log(pda.toBase58());
" 2>/dev/null || echo "ERROR")

if [ "$IDENTITY_PDA" = "ERROR" ]; then
  echo "  ✗ Could not derive identity PDA"
  exit 1
fi
echo "  Identity PDA: $IDENTITY_PDA"

IDENTITY_CHECK=$(solana account "$IDENTITY_PDA" --url "$RPC" 2>&1 | head -3 || echo "NOT FOUND")
if echo "$IDENTITY_CHECK" | grep -q "Balance"; then
  echo "  ✅ Identity PDA exists — agent is already registered"
else
  echo "  ℹ️  Identity PDA not found — register via the dashboard UI or Anchor CLI"
fi

# ── Step 5: Call Metadata API ─────────────────────────────────────────────
echo ""
echo "▶ Step 5/5 — Fetching metadata for known devnet agent..."
KNOWN_AGENT="8DLr8MYie8VHBiLkFcoE6YHtNeKdgz5PWy5tpSV3iqZA"
META_RESPONSE=$(curl -s --max-time 10 "$METADATA_API/metadata/$KNOWN_AGENT" 2>&1 || echo "ERROR")

if echo "$META_RESPONSE" | grep -q '"name"'; then
  echo "  ✅ Metadata API response:"
  echo "$META_RESPONSE" | python3 -m json.tool 2>/dev/null | head -15 || echo "$META_RESPONSE" | head -5
else
  echo "  ⚠️  Metadata API returned: $META_RESPONSE"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Demo complete!                                      ║"
echo "║  • Program:  $PROGRAM_ID  ║"
echo "║  • Docs:     README.md  |  docs/operations/deployment.md ║"
echo "║  • Audit:    docs/security/audit.md                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
