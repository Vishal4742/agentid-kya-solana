#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
export RUSTUP_HOME="$HOME/.rustup"
export CARGO_HOME="$HOME/.cargo"

cd /mnt/c/Users/vg890/OneDrive/Desktop/agentid-kya-solana/agentid-program

echo "--- Running Anchor Tests ---"
anchor test
