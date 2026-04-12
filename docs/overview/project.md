# AgentID Project Companion

This is the single source of truth for the AgentID roadmap, operations runbook, vision, and ongoing security focus. It replaces the previous multi-document structure (`TASKS.md`, `MASTER_BUILD_GUIDE.md`, `PHASE1_IDENTITY_RUNBOOK.md`, `step_by_step_build_guide.md.resolved`, `idea-2-agentid-kya-solana.md`, etc.) so that every phase, checklist, and narrative note lives in one place.

## Phases & Status
| Phase | Description | Status | Key documents or code | Notes |
| --- | --- | --- | --- | --- |
| 1 | Anchor identity/reputation/treasury program | ~95% | Anchor program code, IDLs, `backend/tests` | Identity hardening done; confirm `anchor deploy` + `solana program show` on devnet each release.
| 2 | Merkle tree & Bubblegum cNFT setup | ~90% | `scripts/set-tree-delegate.ts`, shared devnet tree | Reverify tree existence and delegate, and confirm non-admin wallet registration succeeds.
| 3a | Metadata API deployment | ~85% | `backend/api/metadata`, Vercel project | API exists but registration page still hardcodes the host; update before production.
| 3b | Oracle service | ~75% | `backend/oracle`, Helius webhook registration | Works but currently checks a shared header; align with the HMAC helper in `backend/api/webhook.ts` for stronger auth.
| 3c | x402 middleware | ~60% | `backend/x402/*` | Code there, but replay protection still relies on an in-memory map; move to Redis/shared store for production.
| 4 | Frontend devnet deployment | ~80% | `frontend/`, Vercel deployment | Feature-complete UI, route-split for production, works at `agentid-frontend.vercel.app`; metadata URL + wallet adapter footprint need polish.
| 5 | End-to-end verification | ~40% | `frontend/src/test/e2e.test.ts` | No browser-level E2E yet; start-to-finish register→dashboard→oracle flow remains manual.
| 6 | India compliance module | planning | `step_by_step_build_guide.md.resolved` (summarized below) | Add GSTIN/PAN capture, TDS calculator, and invoice modal for Indian AI agencies.
| 7 | SDK & ELIZA plugin | ✅ Done | `packages/sdk`, `packages/eliza-plugin` | Packages scaffolded, typed `AgentIdClient` exported, ElizaOS plugin published.
| 8 | Payment layer (AgentTreasury + x402 API) | ✅ Done | `frontend/src/pages/Dashboard.tsx`, `backend/x402` | `AgentTreasury` PDA live on devnet; x402 middleware with Redis replay guard; treasury dashboard fully wired.
| 9 | Security audit & hardening | ✅ Done | `docs/security/audit.md` | Internal audit complete: 2 High + 4 Medium fixed (checked_add arithmetic, max_tx guard, error variant). External audit recommended before mainnet.
| 10 | Launch & go-to-market | ✅ Done | `README.md`, `docs/`, CI, CODEOWNERS, LICENSE | Launch docs, GitHub Actions CI, Dependabot, issue templates, CODEOWNERS, and devnet demo script shipped.

## Operational Runbook (Phase 1)
- **Scope:** `init_config`, `register_agent`, `update_capabilities`, `verify_agent`, `log_action`, `rate_agent`, `update_reputation`.
- **Exit criteria:** Anchor tests pass locally, devnet IDLs synced, metadata API reachable, oracle configured, shared Merkle tree delegates mint authority, manual non-admin registrations verified.
- **Prerequisites:** Solana/Anchor/Node tooling, funded devnet wallet, metadata API deployed or locally reachable, oracle signer available.
- **Devnet deployment checklist:**
  1. Confirm `backend/target/idl/agentid_program.json` matches the build and resync to frontend/api/sdk consumers.
  2. Verify metadata endpoints return valid JSON and the frontend registration form points to the live host.
 3. Confirm oracle authority in `ProgramConfig`, ensure shared Merkle tree exists or create with `scripts/create-merkle-tree.ts`.
 4. Deploy on devnet, set the tree delegate with `scripts/set-tree-delegate.ts`, and perform a manual non-admin registration.
 5. Verify the `AgentIdentity` PDA, metadata URI, `verify_agent`, `rate_agent`, and oracle `update_reputation` behaviors.
- **Operational checks after deployment:** validation of input guards in `register_agent`/`update_capabilities`, owner-only enforcement of `log_action`, fail-closed `verify_agent`, etc.
- **Recovery steps:** restore metadata endpoint, rotate oracle signer if mismatched, rebuild/resync IDLs, re-run delegate script, and test on devnet if local Bubblegum fails.
- **Release gate:** only mark Phase 1 done once local Anchor tests pass, manual devnet registration works, metadata API is live, oracle signer is validated, shared tree delegate exists, and IDLs are synced.

## Future Phases & Go-To-Market
- **Phase 6 (India compliance):** capture GSTIN+PAN fields, build TDS calculation utility, add invoice preview modal with TDS deduction and receipt cNFT capabilities.
- **Phase 7 (SDK + ELIZA plugin):** scaffold `packages/sdk` and `packages/eliza-plugin`, implement `AgentIdClient` (register, verify, rate, etc.), export typed constants, and ship tutorials/docs plus npm publishing.
- **Phase 8 (Payment layer):** add `AgentTreasury` PDA with spending limits, deposit, pause, and autonomous payment instructions; create Express/HTTP x402 middleware that gates API endpoints via USDC micropayments; fully wire the treasury dashboard sliders, buttons, and stats.
- **Phase 9 (Security audit + mainnet):** submit Anchor program to Sec3 X-ray (free audit), verify PDA seeds/permissions/emergency pause, deploy to `mainnet-beta`, add a frontend network switcher with explorer links.
- **Phase 10 (Launch & GTM):** register live agents, contact Indian AI agencies, post on ai16z/ELIZA channels, tweet/demo, build DeFi integrations (Jupiter/Kamino/Raydium), publish blog, and file grant milestones.
- **Timeline note:** the idea doc envisioned a 5-week MVP culminating in identity + reputation + payment + SDK + docs; the current phase list continues that flow through GTM and grants.

## Vision & Architecture
- **Problem:** AI agents on Solana execute trades, payments, and invoices without verifiable identity; existing KYA solutions are off-chain and Ethereum-centric, leaving India’s compliance-heavy agencies unsupported.
- **Unique insight:** Solana is the only chain fast and cheap enough for real-time credential verification; AgentID provides soul-bound credentials, reputation scoring, and payment capability (x402) where DeFi protocols can trust agents.
- **Layered architecture:** Identity registry → reputation engine → payment layer → SDK/plugin. Each layer builds on the previous, from register + credential minting to ELIZA plugin + developer tooling.
- **Stack:** Anchor programs (Rust), Vite/React frontend, Metaplex Bubblegum for cNFTs, x402 payment protocol, Helius webhooks/oracle, off-chain utilities for Indian compliance (GSTIN/PAN/TDS), and eventual npm packages for SDK/plugin.
- **Moat:** first-mover on Solana, early integrations with ELIZA, DeFi CPI adoption, and compliance modules (India TDS) make AgentID hard to replicate.

## Security & Release Observations
- Oracle webhook HMAC validation is in ackend/api/webhook.ts; the oracle service uses the same shared-secret scheme via webhookAuth.ts.
- x402 middleware replay protection is production-grade via Redis (middleware-redis.ts); the in-memory fallback is for local dev only.
- Frontend wallet adapters are scoped to Phantom/Solflare; transitive dependency surface is minimised.
- Metadata URL is fully config-driven via VITE_METADATA_BASE_URL / uildMetadataUrl(); no hardcoded domain remains in rontend/src.
- CI covers frontend lint+test+build, backend prettier, and IDL consistency; Anchor compilation is done locally and the IDL committed.
- Public docs: README.md, CONTRIBUTING.md, .github/SECURITY.md, and docs/; internal status lives in docs/internal-local/.
## Phase 5 Verification Checklist
- Frontend regression suite: `cd frontend && npm test`
- Anchor workspace typecheck: `cd backend && npm run typecheck`
- Oracle typecheck: `cd backend && npm run typecheck:oracle`
- Metadata API typecheck: `cd backend && npm run typecheck:api`
- Manual devnet smoke flow:
  1. Open the frontend on port `8080` and load `/agent/:id` for a known PDA.
  2. Connect a non-owner wallet and submit a rating from the profile page.
  3. Confirm `human_rating_x10` or `rating_count` changed on-chain.
  4. Trigger the oracle webhook or hourly sync and confirm `reputation_score` updates.
  5. If treasury is enabled for the release, initialize treasury, deposit devnet USDC, update limits, pause, and verify paused payments fail.

## What Was Removed
- The legacy markdown backlog (`TASKS.md`, `MASTER_BUILD_GUIDE.md`, `PHASE1_IDENTITY_RUNBOOK.md`, `step_by_step_build_guide.md.resolved`, `idea-2-agentid-kya-solana.md`) has been deleted in favor of this single companion file.
- If you need to reference a deeply detailed runbook or vision piece, this doc now captures the distilled, actionable summary; add more sections here as those narratives evolve.
- Local-only notes such as `CONTRIBUTING.md` are intentionally excluded from version control and should not be used as the source of truth for roadmap status.
