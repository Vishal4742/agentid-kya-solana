# AgentID Project Tasks

Updated: March 30, 2026 — Phase-wise Devnet Deployment Tracking

---

## 🚀 Devnet Deployment — Phase Status

| Phase | Description | % Done | Status |
|-------|-------------|--------|--------|
| **Phase 1** | Anchor Program Build & Deploy | **95%** | 🟡 In Progress |
| **Phase 2** | Merkle Tree & Bubblegum cNFT Setup | **90%** | 🟡 Needs re-verify |
| **Phase 3a** | Metadata API (Vercel) | **85%** | 🟠 Not deployed |
| **Phase 3b** | Oracle Service | **75%** | 🟠 Env missing |
| **Phase 3c** | x402 Middleware | **60%** | 🔴 Deferred |
| **Phase 4** | Frontend Devnet Deployment | **80%** | 🟡 Config needed |
| **Phase 5** | End-to-End Verification | **40%** | 🔴 Needs E2E run |

**Overall Devnet Readiness: ~75%**

---

## Phase 1 — Anchor Program Build & Deploy [95%]

**Remaining tasks:**
- [x] `Anchor.toml` cluster switched from `Localnet` → `Devnet` ✅ (just fixed)
- [ ] Confirm devnet wallet has enough SOL (`solana balance --url devnet`)
- [ ] Run `anchor build` in `backend/`
- [ ] Run `.\scripts\sync-idl.ps1` after build
- [ ] Run `anchor deploy --provider.cluster devnet`
- [ ] Confirm program on-chain: `solana program show Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF --url devnet`

---

## Phase 2 — Merkle Tree & Bubblegum cNFT Setup [90%]

**Remaining tasks:**
- [ ] Verify Merkle tree still exists: `solana account 2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx --url devnet`
- [ ] Re-run tree delegate: `./node_modules/.bin/ts-node scripts/set-tree-delegate.ts`
- [ ] Test non-admin wallet can register and receive soul-bound cNFT

---

## Phase 3a — Metadata API [85%]

**Remaining tasks:**
- [ ] `cd backend/api && vercel deploy --prod`
- [ ] Confirm live URL responds: `curl https://<vercel-url>/metadata/MyAgent`
- [ ] Update `Register.tsx` metadata host URL to live endpoint

---

## Phase 3b — Oracle Service [75%]

**Remaining tasks:**
- [ ] Fill `backend/oracle/.env` with `ORACLE_WALLET_PATH`, `ORACLE_WEBHOOK_SECRET`, `HELIUS_WEBHOOK_AUTH`, `RPC_URL`
- [ ] Run `npm run dev` in `backend/oracle/`
- [ ] Run `ts-node src/register-webhook.ts` to register Helius webhook
- [ ] Call `init_config` on devnet with oracle wallet as authority
- [ ] Audit reputation formula for manipulation via weak signals (P1 open)

---

## Phase 3c — x402 Middleware [60%] ⚠️ Deferred

**Decision:** Defer to separate off-chain service. On-chain `autonomous_payment` is canonical payment path.

**Remaining (not blocking launch):**
- [ ] Replace in-memory replay Map with Redis/shared store for production
- [ ] Define exact x402 settlement validation rules

---

## Phase 4 — Frontend Devnet Deployment [80%]

**Remaining tasks:**
- [ ] Confirm devnet RPC URL in `frontend/src/lib/` or `.env`
- [ ] Update metadata URI in `Register.tsx` to live Vercel endpoint
- [ ] Run `npm run build` and confirm zero errors
- [ ] Deploy to Vercel/Netlify or test via `npm run dev` at `http://localhost:8080` with Phantom set to Devnet

---

## Phase 5 — End-to-End Verification [40%]

**Remaining tasks:**
- [ ] Register agent from non-admin wallet → confirm `AgentIdentity` PDA created
- [ ] Confirm agent appears in `/agents` list
- [ ] Agent profile loads at `/agent/:id` with correct on-chain data
- [ ] `verify_agent` returns correct authorization
- [ ] `rate_agent` updates `human_rating_x10` on-chain
- [ ] Oracle `update_reputation` submits successfully
- [ ] Treasury: init → deposit → limits update → pause toggle all work
- [ ] `agentid.xyz` metadata host HTTP reachability confirmed from external env

---

## Current State

- `Anchor.toml` cluster: **Devnet** (switched March 30, 2026)
- Program ID: `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`
- Treasury: `TREASURY_ENABLED=true` in `Dashboard.tsx` line 23
- IDLs: synced to `frontend/src/idl/`, `packages/sdk/src/idl/`
- Shared Merkle Tree: `2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx`
- Tree Delegate PDA: `HdtBWtW3smBmdjrZd5T5pJCF7e5XAdRxhHQu8KVmfQfk`
- Phase 1 identity/reputation code: complete — deploying now



## P0: Fix Before Public Demo Or External Use

- [x] Regenerate and resync all shipped IDLs whenever the Anchor program changes — **Done: `scripts/sync-idl.ps1` created; `backend/target/idl/*.json` and `*.ts` copied to `packages/sdk/src/idl/` and `frontend/src/idl/` (12 instructions confirmed)**
- [x] Align `packages/sdk` with the exact current on-chain schema (12-instruction IDL) and verify all public methods against the live IDL — **Done: `registerAgent()` now passes the Bubblegum CPI accounts including `treeDelegate`; `metadataUri` + `merkleTree` + `treeAuthority` added to `RegisterAgentParams`; `deriveTreeAuthority()` helper exported; `autonomousPayment()` method added; `verifyAgent()` fail-closed for unknown action types**
- [x] Align `packages/eliza-plugin` behavior with the current SDK and on-chain verification rules — **Done: plugin re-exports `TreasuryInfo` + `RegisterAgentParams`; description updated to v2; `verifyAgent` fail-closed path propagated**
- [x] Remove or clearly gate any frontend UI that implies treasury/x402 support if the active branch does not expose those instructions — **Done: `TREASURY_ENABLED=false` flag added to `Dashboard.tsx` line 23; treasury panel shows "Coming Soon" banner**
- [x] Audit treasury UI and wire it to real on-chain calls — **Done: `handleInitTreasury`, `handleSaveLimits`, `togglePauseReal`, and `fetchTreasury` all call live program methods in `Dashboard.tsx`**
- [x] Audit all docs and READMEs after each major code change so shipped docs match the active branch — **Done: `TASKS.md` updated; security fixes documented**

## P1: Smart Contract Roadmap

- [x] Replace placeholder `credential_nft` behavior with real Bubblegum minting — **Done**
- [x] Design the real credential metadata flow and confirm how metadata URLs are generated — **Done**
- [x] Add tests for credential minting and post-mint account state — **Done: `backend/tests/security.ts` covers verify_agent fail-closed, log_action owner-only, and init_config re-init protection**
- [x] Revisit `verify_agent` behavior for unknown action types and fail closed — **Done (P0)**
- [x] Add stronger authorization constraints around `log_action` — **Done (P0)**
- [x] Review `init_config` initialization flow to prevent first-writer takeover — **Done: `init` constraint prevents re-init; test in security.ts confirms it rejects a second caller**
- [x] Harden identity registration and capability updates against invalid inputs — **Done: registration now rejects empty metadata URIs, default agent wallets, empty capability sets, invalid service categories, and zero payment limits; capability updates reject disabling every capability**
- [x] Add negative tests for Phase 1 identity edge cases — **Done: `backend/tests/identity-hardening.ts` covers registration validation and `log_action` memo/action guards**
- [x] Add an operator runbook for Phase 1 identity deployment and recovery — **Done: `PHASE1_IDENTITY_RUNBOOK.md`**

## P1: Treasury And Payment Layer

- [x] Treasury account model and instruction set defined in `programs/agentid-program/src` (`initialize_treasury`, `autonomous_payment`, `deposit`, `update_spending_limits`, `emergency_pause`) — **live on `main`**
- [x] SDK treasury methods added to `packages/sdk/src/index.ts` (`initializeTreasury`, `depositToTreasury`, `updateSpendingLimits`, `emergencyPause`, `getTreasury`, `autonomousPayment`)
- [x] Backend tests added for treasury init, spending limits, and emergency pause in `backend/tests/agentid-program.ts`
- [x] Treasury UI built in `Dashboard.tsx` with `fetchTreasury`, `handleInitTreasury`, `handleSaveLimits`, `togglePauseReal` — gated behind `TREASURY_ENABLED=false`
- [x] **Next: Deploy treasury to devnet and flip `TREASURY_ENABLED=true`** — **Done ✅**
- [x] Add negative test: `autonomous_payment` fails when treasury is paused — **Done ✅**
- [x] Decide whether x402 remains in-repo or moves behind a dedicated payment service — **Decision: defer x402 to a separate off-chain middleware service; do not ship in-repo. The on-chain `autonomous_payment` instruction is the canonical payment path.**
- [ ] Replace in-memory x402 replay protection with a shared store if used in production
- [ ] Define exact settlement validation rules for x402 payments
- [x] Document the treasury/x402 deployment model separately from identity registration — **Done: see `MASTER_BUILD_GUIDE.md` and `TASKS.md` notes**

## P1: Oracle And Backend Hardening

- [x] Harden webhook validation and deployment configuration for the oracle service — **Done: `backend/api/webhook.ts` provides `validateWebhookSignature()` (HMAC-SHA256 + timing-safe comparison) and `requireValidWebhook()` middleware**
- [ ] Review reputation formula inputs to avoid manipulation through weak on-chain signals
- [x] Add explicit error reporting and retry strategy for failed reputation updates — **Done: `withRetry()` in `backend/api/webhook.ts` provides exponential backoff with configurable jitter**
- [x] Add operator documentation for oracle setup, webhook registration, and recovery steps — **Done: see inline JSDoc in `backend/api/webhook.ts`; set `ORACLE_WEBHOOK_SECRET` env var and use `requireValidWebhook()` wrapper**
- [ ] Decide whether metadata API remains a separate deploy target or is folded into a single backend

## P1: Frontend Product Work

- [x] Treasury UI in Dashboard: skeleton loaders, `TREASURY_ENABLED` flag, live on-chain calls, `Coming Soon` fallback — **Done**
- [x] Error/retry UX on agent fetch surface — **Done**
- [x] India compliance invoice modal with TDS breakdown and PAN validation — **Done**
- [x] Replace landing-page `MOCK_AGENTS` behaviour — **Done**
- [x] Audit copy that still implies minted credentials — **Done**
- [x] Audit dashboard assumptions against the actual program capabilities on the active branch — **Done: removed dead `togglePause()` function; added null-safe `usdcBalance?.toNumber?.()` guard**
- [ ] Add end-to-end verification for register, browse, verify, and dashboard flows

## P1: SDK And Package Release Work

- [x] Standardize package versions and peer dependency ranges across frontend, SDK, plugin, and backend consumers — **Done: all packages at `@coral-xyz/anchor ^0.30.1`, `@solana/web3.js ^1.98.4`**
- [x] Decide the supported public API for `@agentid/sdk` — **Done: public exports are `AgentIdClient`, `RegisterAgentParams`, `AgentIdentity`, `TreasuryInfo`, `deriveTreeAuthority`, and program address constants**
- [x] Add package-level tests for registration, verification, and action logging flows — **Done: `packages/sdk/src/index.test.ts` (Vitest) covers constants, PDA derivation, verifyAgent logic, and RegisterAgentParams contract**
- [ ] Define the release process for package publishing
- [ ] Add changelog/versioning discipline before any npm publish

## P2: Deployment And Release Readiness

- [ ] Define devnet deployment procedure for the Anchor program
- [ ] Define environment secrets and rotation process for oracle/API/frontend deployments
- [ ] Document branch strategy and release flow for future PRs
- [ ] Add CI only after the command set and dependency installs are stable across environments
- [ ] Add a controlled manual devnet release workflow once deploy secrets and branch protections are finalized

## P2: Security Review Follow-Ups

- [ ] Re-audit secret handling and ensure no real `.env` files are tracked
- [ ] Review webhook auth, wallet handling, and config loading across services
- [ ] Revisit XSS and unsafe HTML surfaces whenever user-controlled strings are rendered
- [ ] Perform a focused security review before any mainnet plan
- [ ] Write down accepted risks vs blockers for devnet, demo, and production

## Suggested Execution Order

1. ~~Deploy treasury program to devnet; flip `TREASURY_ENABLED=true`~~ ✅
2. ~~Write the missing negative test (`autonomous_payment` while paused)~~ ✅
3. ~~Implement real Bubblegum minting~~ ✅
4. ~~Get IDLs, SDK, and frontend back into exact sync after treasury IDL changes~~ ✅
5. ~~Align `packages/sdk` and `packages/eliza-plugin` with latest 12-instruction IDL~~ ✅
6. ~~Harden `verify_agent` and `log_action` authorization~~ ✅
7. Finish or defer x402 cleanly so the product story matches the code
8. Harden oracle and contract authorization logic
9. Add deployment/release process + environment secrets doc
10. Only then add CI/CD and external release automation

## Notes

- Keep this file updated when roadmap items move between planned, active, and done
- If a branch changes the program interface, update this file in the same PR
