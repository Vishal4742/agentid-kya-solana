# AgentID KYA — AI Coding Assistant Guide

This file is read by AI coding assistants (Codex, Claude Code, etc.) to understand
the repository layout, build system, key conventions, and rules before making changes.

---

## Project Summary

**AgentID KYA** is a Solana-based on-chain identity and reputation protocol for AI agents.
It lets autonomous agents register a verifiable identity (name, capabilities, reputation),
handle USDC treasury payments, and gate HTTP API access via the x402 payment standard.

**Live deployments:**
- Frontend: <https://agentid.netlify.app>
- Metadata API: <https://agentid-kya-solana.vercel.app>

---

## Monorepo Layout

```
agentid-kya-solana/
├── backend/
│   ├── programs/agentid-program/src/   ← Anchor program (Rust)
│   │   ├── instructions/               ← one file per instruction
│   │   ├── state/                      ← account structs
│   │   ├── errors.rs
│   │   └── lib.rs
│   ├── tests/                          ← Anchor integration tests (TypeScript)
│   ├── api/                            ← Vercel serverless functions
│   │   └── api/
│   │       ├── metadata/               ← public metadata endpoint
│   │       ├── oracle/webhook.ts       ← HMAC-validated oracle webhook
│   │       └── premium/treasury/       ← x402-gated treasury snapshot
│   ├── oracle/src/index.ts             ← Oracle sync service
│   └── x402/                          ← x402 payment middleware + tests
├── frontend/
│   └── src/
│       ├── components/                 ← React components (PascalCase)
│       ├── pages/                      ← Route-level pages
│       │   ├── Index.tsx, Register.tsx, Verify.tsx
│       │   ├── Dashboard.tsx           ← TREASURY_ENABLED flag lives here
│       │   ├── AgentProfile.tsx, Agents.tsx
│       │   └── Docs.tsx, NotFound.tsx
│       ├── hooks/                      ← React hooks (useX naming)
│       ├── lib/                        ← Utilities and SDK wrappers
│       └── test/                       ← Vitest tests
├── packages/
│   ├── sdk/                            ← @agentid/sdk (publishable)
│   └── eliza-plugin/                   ← @agentid/eliza-plugin (publishable)
├── scripts/                            ← Dev utilities (PowerShell + JS)
├── docs/                               ← Architecture and security docs
├── AGENTS.md                           ← Repo coding guidelines (authoritative)
└── PROJECT.md                          ← Phase roadmap and deployment status
```

---

## Build & Test Commands

> Always run from the directory shown — do **not** run Anchor commands from the repo root.

### Frontend (Vite + React + TypeScript)
```bash
cd frontend
npm install
npm run dev        # dev server
npm run build      # production build
npm run lint       # ESLint — run before every PR
npm test           # Vitest unit tests
```

### Anchor Backend (Rust + Solana)
```bash
cd backend
yarn install
anchor build        # compile Rust program
anchor test         # integration tests against localnet
npm run lint        # Prettier check
```

After any IDL change:
```bash
pwsh ./scripts/sync-idl.ps1
```

### Metadata API (Vercel serverless)
```bash
cd backend/api
npm install
npm run dev         # local Vercel dev
npx tsc --noEmit    # type-check without emitting
```

### x402 Middleware
```bash
cd backend/x402
npm install
npm test
```

### SDK Package
```bash
cd packages/sdk
npm install
npm run build
npm test
```

### ELIZA Plugin
```bash
cd packages/eliza-plugin
npm install
npm run build
```

---

## Anchor Program — 12 Instructions

| Instruction | File | Who Can Call |
|---|---|---|
| `init_config` | `init_config.rs` | Protocol authority (once) |
| `register_agent` | `register.rs` | Any wallet (creates PDA) |
| `update_capabilities` | `update_capabilities.rs` | Agent owner |
| `verify_agent` | `verify.rs` | Protocol authority only |
| `log_action` | `log_action.rs` | Agent owner |
| `rate_agent` | `rate.rs` | Any signer |
| `update_reputation` | `update_reputation.rs` | Protocol authority |
| `initialize_treasury` | `treasury_init.rs` | Agent owner |
| `deposit` | `treasury_deposit.rs` | Anyone |
| `update_spending_limits` | `treasury_update.rs` | Agent owner |
| `autonomous_payment` | `treasury_payment.rs` | Agent or delegate |
| `emergency_pause` | `instructions/` | Agent owner |

**Adding a new instruction:**
1. Create `backend/programs/agentid-program/src/instructions/<name>.rs`
2. Export it in `instructions/mod.rs`
3. Add the handler to `lib.rs`
4. Run `anchor build` then `pwsh ./scripts/sync-idl.ps1`
5. Add/update tests in `backend/tests/`

---

## Critical Rules

### Never Do These
- ❌ Do **not** commit files from `dist/`, `target/`, or `node_modules/`
- ❌ Do **not** run `anchor build` from the repo root — always `cd backend` first
- ❌ Do **not** store secrets in code — use `.env` files (see `.env.example` in each package)
- ❌ Do **not** modify `AGENTS.md` content without understanding repo-wide impact; it is injected as a system rule

### Always Do These
- ✅ Run `npm run lint` in `frontend/` before any PR
- ✅ Run `anchor test` in `backend/` before any PR touching Rust or IDL
- ✅ Sync IDL after every Anchor change: `pwsh ./scripts/sync-idl.ps1`
- ✅ Add or update tests for every behavior change touching UI state, API responses, or on-chain instructions
- ✅ Follow Conventional Commits: `feat: ...`, `fix: ...`, `chore: ...`

---

## Feature Flags

| Flag | Location | Default | Meaning |
|---|---|---|---|
| `TREASURY_ENABLED` | `frontend/src/pages/Dashboard.tsx` | `false` | Show live treasury UI |

---

## Environment Variables

### `backend/api/.env`
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
HELIUS_API_KEY=
HELIUS_WEBHOOK_AUTH=          # Must match ORACLE_WEBHOOK_SECRET
PROGRAM_ID=
USDC_MINT=
```

### `backend/x402/.env`
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
REDIS_URL=redis://localhost:6379    # Falls back to in-memory store
X402_TREASURY_PUBKEY=
X402_PRICE_LAMPORTS=1000000
```

### `backend/oracle/.env`
```env
ORACLE_WEBHOOK_SECRET=    # 32-byte hex, must match HELIUS_WEBHOOK_AUTH
HELIUS_API_KEY=
PROGRAM_ID=
```

---

## Key Conventions

### TypeScript / React
- Components: `PascalCase` filename (`MyComponent.tsx`)
- Hooks: `useX` naming (`useAgents.ts`)
- Utilities/primitives: lowercase or kebab-case (`button.tsx`, `use-mobile.tsx`)
- 2-space indentation everywhere

### Rust (Anchor)
- Module filenames: `snake_case` (e.g., `update_reputation.rs`)
- Account structs live in `state/`; instruction context structs stay in their instruction file
- Use `require!()` macro for guard clauses, not raw `if/return Err`

### Testing
- Frontend: Vitest + Testing Library → `frontend/src/test/*.test.ts(x)`
- Anchor: TypeScript tests → `backend/tests/**/*.ts`
- Keep test files next to the instruction or feature they cover

---

## Commit Format

```
feat: add autonomous payment rate limiting
fix: resolve treasury PDA seed collision
chore: sync IDL after emergency_pause rename

Co-Authored-By: Codex
```

---

## Where to Look for Things

| I need to… | Go to |
|---|---|
| Change on-chain logic | `backend/programs/agentid-program/src/instructions/` |
| Change account state shape | `backend/programs/agentid-program/src/state/` |
| Add an Anchor test | `backend/tests/` |
| Change the metadata response | `backend/api/api/metadata/` |
| Change oracle webhook auth | `backend/api/api/oracle/webhook.ts` |
| Add a paid API route | `backend/api/api/premium/` |
| Change x402 payment logic | `backend/x402/src/` |
| Change the SDK public API | `packages/sdk/src/` |
| Add an ELIZA action | `packages/eliza-plugin/src/` |
| Change the frontend UI | `frontend/src/pages/` or `frontend/src/components/` |
| Add a frontend hook | `frontend/src/hooks/` |
| Change IDL the frontend uses | Run `pwsh ./scripts/sync-idl.ps1` after backend change |
| Review roadmap/phase status | `PROJECT.md` |
| Review repo coding rules | `AGENTS.md` |
