# AgentID Project Overview

This document gives a complete picture of what AgentID KYA is, what's been built, what's verified, and what still needs work.

---

## What Is AgentID KYA?

**AgentID KYA** ("Know Your Agent") is an on-chain identity and reputation protocol for AI agents on Solana. Just as KYC ("Know Your Customer") lets banks verify humans, AgentID lets developers and other agents verify that an AI agent is:

- **Registered** — has a provable on-chain identity (stored as a compressed NFT)
- **Trusted** — has a reputation score earned from real on-chain activity
- **Accountable** — has an auditable action log
- **Funded** — can hold and spend USDC autonomously via a treasury

This is infrastructure for the **autonomous agent economy** — a world where AI agents transact with each other without constant human oversight.

---

## Technology Overview

| Component | Technology | Notes |
|---|---|---|
| Smart contract | Anchor (Rust) on Solana | 12 instructions |
| Identity storage | Compressed NFT (Bubblegum) | Cheap at scale |
| Frontend | Vite + React + TypeScript | Hosted on Netlify |
| SDK | TypeScript (`@agentid/sdk`) | Publishes to npm |
| AI runtime plugin | `@agentid/eliza-plugin` | For ElizaOS agents |
| Metadata API | Vercel serverless (Node.js) | 3 route groups |
| Reputation oracle | GitHub Actions + Helius webhook | HMAC-secured |
| Payment middleware | x402 (HTTP 402) + Redis | Solana USDC |
| Hosting | Netlify (frontend) + Vercel (API) | — |

---

## Phase Summary

| Phase | Description | Status |
|---|---|---|
| 1 | Anchor identity and reputation protocol | ✅ Complete in repo — all 12 instructions implemented and tested |
| 2 | Bubblegum cNFT identity minting | ✅ Complete in repo — registration wired to shared Merkle tree |
| 3a | Metadata API (Vercel) | ✅ Live at `agentid-kya-solana.vercel.app` |
| 3b | Oracle sync (GitHub Actions + webhook) | ✅ Complete — HMAC auth aligned |
| 3c | x402 payment middleware | ✅ Complete — Redis replay protection implemented |
| 4 | Frontend (Register, Dashboard, Profile) | ✅ Complete — reads live on-chain state |
| 5 | End-to-end verification | ✅ Verified — all test suites green |
| 6 | India compliance layer | 🔄 In progress — helpers and invoice UI exist, not a full product surface |
| 7 | SDK + ELIZA plugin | ✅ Complete in repo — both packages implemented and tested |
| 8 | Treasury + x402 adoption | 🔄 In progress — foundations complete; live smoke checks pending |
| 9 | External security audit + mainnet prep | 📋 Planned — internal audit done; external audit needed for mainnet |
| 10 | Launch and go-to-market | 📋 Planned — defer until live deployments are healthy |

---

## Local Verification Checklist

These commands should all pass before treating any phase as complete:

```bash
cd frontend && npm test              # 30/30 tests (includes devnet E2E)
cd frontend && npm run build         # production build
cd packages/sdk && npm test          # SDK unit tests
cd packages/eliza-plugin && npm run build  # plugin build
cd backend/x402 && npm test          # x402 middleware tests
cd backend/api && npx tsc --noEmit   # API type-check
cd backend && anchor test            # Anchor integration tests (local validator)
node scripts/deployment-preflight.mjs
```

---

## Live Deployment Status

| Service | URL | Status |
|---|---|---|
| Frontend | <https://agentid.netlify.app> | ✅ Live |
| Metadata API | <https://agentid-kya-solana.vercel.app> | ✅ Live |
| Oracle webhook | Vercel API route `/api/oracle/webhook` | ✅ Deployed |
| Devnet program | `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF` | ✅ Live |

---

## Phase 8 — What's Done and What's Next

### Done
- `AgentTreasury` initialization, deposit, spending-limit updates, pause, and autonomous payment instructions
- Treasury dashboard controls in the frontend
- Redis-backed x402 middleware with tests and integration documentation
- Paid serverless route for treasury snapshots at `GET /api/premium/treasury/:agentId`
- SDK treasury reads, control methods, and deposit helper

### Still to do
1. Live end-to-end treasury smoke test on devnet
2. Payment telemetry improvements

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Compressed NFTs for identity | Standard NFTs cost ~0.002 SOL each; cNFTs are orders of magnitude cheaper, enabling mass agent registration |
| x402 for payment gating | HTTP 402 enables machine-to-machine micropayment discovery — agents can autonomously find and pay for gated resources |
| Oracle as trusted off-chain authority | Simpler and cheaper than a keeper program; acceptable for devnet; should be replaced by decentralized oracle for mainnet |
| Redis for replay protection | Fast, TTL-based store for consumed payment signatures; in-memory fallback for local dev only |
| GitHub Actions for oracle scheduling | Serverless, free for public repos, easy to configure |

---

## Related Docs

| Doc | Purpose |
|---|---|
| [README.md](../../README.md) | Quick start and feature overview |
| [docs/architecture.md](../architecture.md) | Full technical architecture deep-dive |
| [docs/x402-architecture.md](../x402-architecture.md) | x402 payment flow and Redis architecture |
| [docs/operations/deployment.md](../operations/deployment.md) | Step-by-step deployment guide |
| [docs/security/audit.md](../security/audit.md) | Internal security audit findings |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | How to contribute |
