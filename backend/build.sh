#!/bin/bash
set -e

# Ensure Solana CLI is on path
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

cd /mnt/c/Users/vg890/OneDrive/Desktop/agentid-kya-solana/agentid-program

echo "=== Building Anchor Program ==="
anchor build

echo "=== Build Complete ==="
