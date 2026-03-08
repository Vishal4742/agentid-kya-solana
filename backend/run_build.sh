#!/bin/bash
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
export RUSTUP_HOME="$HOME/.rustup"
export CARGO_HOME="$HOME/.cargo"

cd /mnt/c/Users/vg890/OneDrive/Desktop/agentid-kya-solana/agentid-program

echo "--- Building Anchor Project ---"
anchor build
