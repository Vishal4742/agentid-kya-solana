# AgentID Project Companion

This file is the source of truth for roadmap status, release readiness, and the current gap between repo-complete work and live deployment health.

## Phases & Status
| Phase | Description | Status | Primary code | Notes |
| --- | --- | --- | --- | --- |
| 1 | Anchor identity and reputation protocol | Complete in repo | `backend/programs/agentid-program`, `backend/tests` | `anchor test` passes locally and covers identity, verification, logging, rating, reputation, and treasury flows. |
| 2 | Merkle tree and Bubblegum credential path | Complete in repo | shared tree setup, registration flow | Registration is wired to the shared tree and local verification clones required Bubblegum/compression dependencies. |
| 3a | Metadata API | Complete in repo | `backend/api/metadata` | Metadata URL generation is config-driven and no longer depends on a dead frontend URL. |
| 3b | Oracle service | Complete in repo | `backend/oracle`, `backend/api/webhook.ts` | HMAC-compatible webhook validation exists; deployed secret wiring still needs live verification after redeploy. |
| 3c | x402 middleware | Complete in repo | `backend/x402` | Redis replay protection with in-memory fallback is implemented and tested. |
| 4 | Frontend app | Complete in repo | `frontend/` | Register, verify, dashboard, and profile pages read real on-chain state. |
| 5 | End-to-end verification | Complete locally | `frontend/src/test/e2e.test.ts`, `backend/tests` | Frontend tests/build, SDK tests, x402 tests, API typecheck, and `anchor test` are green locally. |
| 6 | India compliance layer | In progress | `frontend/src/lib/indiaCompliance.ts`, dashboard invoice flow | Helpers and invoice UI exist, but this is not yet a full compliance product surface. |
| 7 | SDK and ELIZA plugin | Complete in repo | `packages/sdk`, `packages/eliza-plugin` | Typed SDK and plugin are implemented and tested. |
| 8 | Payment layer (treasury + x402 adoption) | In progress | `frontend/src/pages/Dashboard.tsx`, `backend/x402`, `packages/sdk` | Treasury instructions, dashboard controls, x402 middleware, and SDK treasury helpers exist. Remaining work is product-level adoption and live treasury smoke validation. |
| 9 | Security audit and mainnet readiness | Planned | `docs/security/audit.md` | Internal audit is done; external audit and mainnet preparation remain open. |
| 10 | Launch and GTM | Planned | docs/demo scripts | Defer until live deployments are healthy again. |

## What Is Actually Verified
- `cd frontend && npm test`
- `cd frontend && npm run build`
- `cd packages/sdk && npm test`
- `cd packages/eliza-plugin && npm run build`
- `cd backend/x402 && npm test`
- `cd backend/api && npx tsc --noEmit`
- `cd backend && anchor test`

## What Is Not Automatically Proven Yet
- Redeployed frontend health
- Redeployed metadata API health
- Oracle webhook delivery against deployed secrets
- Live treasury initialization/deposit/pause/payment flow after redeploy

## Phase 8 Current Truth
Implemented already:
- `AgentTreasury` initialization, deposit, spending-limit updates, pause, and autonomous payment instructions
- Treasury dashboard controls in the frontend
- Redis-backed x402 middleware with tests and integration documentation
- First paid serverless route for treasury snapshots at `backend/api/api/premium/treasury/[agentId].ts`
- SDK treasury reads and control methods
- SDK treasury deposit helper added in this pass

Still open:
1. Run live treasury smoke checks after redeploy: initialize treasury, deposit devnet USDC, update limits, pause/unpause, and confirm expected payment failures/successes.
2. Improve payment-facing telemetry so treasury activity is visible without explorer-only debugging.
3. Decide whether additional paid endpoints should live in the metadata API deployment or a dedicated API service.

## Release Guidance
- Treat “complete in repo” and “live complete” as different states.
- Keep `anchor test` green before any devnet deploy; it now validates the real local registration/treasury path using cloned devnet dependencies.
- After redeploy, rerun a live smoke flow before claiming phase 5 or phase 8 complete externally.
