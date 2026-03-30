# AgentID Project Tasks

Updated: March 30, 2026 (P1 code deliverables complete — tests, oracle hardening, SDK tests, dashboard cleanup)

## Current State

- Anchor program deployed to devnet: `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`
- `register_agent` mints a soul-bound Bubblegum cNFT (1.4.0 CpiBuilder, shared devnet Merkle tree)
- Treasury is live on devnet; `TREASURY_ENABLED=true` in Dashboard
- Negative test for `autonomous_payment` while paused: implemented ✅
- All IDLs resynced (frontend + API) after latest build
- Metadata API has both hex-ID and name-based routes
- Frontend dev server at `http://localhost:8080`

The main remaining pieces are SDK/plugin sync, x402 hardening, oracle robustness, and mainnet prep.

## P0: Fix Before Public Demo Or External Use

- [x] Regenerate and resync all shipped IDLs whenever the Anchor program changes — **Done: `scripts/sync-idl.ps1` created; `backend/target/idl/*.json` and `*.ts` copied to `packages/sdk/src/idl/` and `frontend/src/idl/` (12 instructions confirmed)**
- [x] Align `packages/sdk` with the exact current on-chain schema (12-instruction IDL) and verify all public methods against the live IDL — **Done: `registerAgent()` now passes all 8 Bubblegum CPI accounts (identity, owner, treeAuthority, merkleTree, logWrapper, compressionProgram, bubblegumProgram, systemProgram); `metadataUri` + `merkleTree` + `treeAuthority` added to `RegisterAgentParams`; `deriveTreeAuthority()` helper exported; `autonomousPayment()` method added; `verifyAgent()` fail-closed for unknown action types**
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
