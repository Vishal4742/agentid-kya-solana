# AgentID KYA Reputation Oracle

This is the Node.js / Express backend service that acts as the Reputation Oracle for the AgentID KYA Protocol.

## Features

1. **Helius Webhook Processing**: Listens for verified transaction events on the Solana devnet from your registered Agent programs.
2. **Reputation Math**: Calculates the 0-1000 reputation score based on success rate, human rating, longevity, transaction volume, and verification level.
3. **Hourly Cron Synchronization**: Uses `node-cron` to fetch all registered Agent identities and recalculate their scores every hour.
4. **On-Chain Updating**: Invokes the `update_reputation` instruction on the smart contract directly using the official Oracle Authority Keypair.

## Prerequisites

- Node.js (v18+)
- A Solana Oracle Authority Keypair (used to deploy the program originally)
- A Helius API Key (for RPC and webhook registration)

## Environment Variables

Copy `.env.example` to `.env` and fill the variables:

```bash
ORACLE_PRIVATE_KEY=[12,34,56,...] # The array format of your private key
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
HELIUS_WEBHOOK_AUTH=your_secure_random_string
PORT=3001
WEBHOOK_URL=https://your-deployment-url.app/webhook
HELIUS_API_KEY=your_helius_api_key
```

## Local Development

```bash
# Install dependencies
npm install

# Run locally in dev mode
npx ts-node src/index.ts
```

## Deployment (Render / Railway)

This project can be easily deployed using Node.js hosting providers like Railway or Render.

### Deploying to Render

1. Go to [Render](https://render.com) and create a new **Web Service**.
2. Connect your GitHub repository containing the Code.
3. Set the Root Directory to `backend/oracle` (if Render supports it) or configure the build commands.
4. **Build Command**: `npm install && npm run build` (make sure you have a `build` script in package.json like `"build": "tsc"`)
5. **Start Command**: `npm start` (make sure `package.json` main is `dist/index.js` and start script is `node dist/index.js`)
6. Add the environment variables from your `.env` file into the Render dashboard.
7. Once deployed, note the URL (e.g., `https://agentid-oracle.onrender.com`).

### Deploying to Railway

1. Go to [Railway](https://railway.app) and create a New Project from GitHub.
2. Railway should auto-detect the Node.js environment.
3. Add the required environment variables in the Variables tab. 
4. Railway will automatically install and build. Ensure your `start` script points to the compiled code.

## Registering the Webhook

After deploying, run the registration script locally to tell Helius to send transaction events to your live deployment:

```bash
# Ensure your local .env has WEBHOOK_URL and HELIUS_API_KEY filled
npx ts-node src/register-webhook.ts
```
