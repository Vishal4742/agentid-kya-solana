#!/bin/bash
# Install Solana CLI (Agave) in WSL
set -e

echo "=== Installing Solana CLI (Agave) ==="
curl -sSfL https://release.anza.xyz/stable/install | sh

# Add to PATH for this session
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo ""
echo "=== Verifying versions ==="
solana --version
cargo build-sbf --version 2>/dev/null || echo "cargo build-sbf not yet on PATH (restart shell)"

echo ""
echo "=== Setting Solana to devnet ==="
solana config set --url devnet

echo ""
echo "=== Generating keypair (if not exists) ==="
if [ ! -f ~/.config/solana/id.json ]; then
    solana-keygen new --no-bip39-passphrase --silent
    echo "New keypair generated"
else
    echo "Keypair already exists: $(solana address)"
fi

echo ""
echo "=== DONE — now run: anchor build ==="
