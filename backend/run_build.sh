#!/bin/bash
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
export RUSTUP_HOME="$HOME/.rustup"
export CARGO_HOME="$HOME/.cargo"

cd -- "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "--- Building Anchor Project ---"
anchor build
