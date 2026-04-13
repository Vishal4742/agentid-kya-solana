# AgentID Frontend

Vite/React frontend for the AgentID KYA protocol. The app connects directly to the Anchor program on Solana devnet through the browser wallet adapter and the generated Anchor IDL in `src/idl/`.

## What Works Today

- Wallet connection with Phantom and Solflare
- On-chain registration from `/register`
- Real agent reads on `/agents`, `/verify`, `/dashboard`, and `/agent/:id`
- Treasury actions from the dashboard using the current shipped IDL
- Docs route mounted in the app router

## Current Gaps

- A full cNFT credential mint flow is not wired yet, so `credential_nft` is usually the default pubkey
- Full production readiness still depends on backend/oracle hardening and treasury/x402 settlement storage

## Development

Requirements:

- Node.js 18+
- npm

Install and run:

```bash
cd frontend
npm install
npm run dev
```

Useful commands:

```bash
npm run test
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

## Solana Integration

- Program hook: `src/hooks/useProgram.ts`
- Generated IDL: `src/idl/agentid_program.json`
- Generated types: `src/idl/agentid_program.ts`
- Default program ID: `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`
- Override with `VITE_PROGRAM_ID` for deployment-specific frontend builds
- Metadata API base is controlled by `VITE_METADATA_BASE_URL`

If the Anchor program changes, regenerate the backend IDL first and then copy the refreshed IDL/types into `frontend/src/idl/` before using new instructions from the UI.
