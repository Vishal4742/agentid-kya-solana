#!/bin/bash
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Installing Node 20..."
nvm install 20
nvm use 20

echo "Installing Yarn..."
npm install -g yarn

echo "Node version: $(node -v)"
echo "Yarn version: $(yarn -v)"
