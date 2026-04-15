# Contributing to AgentID KYA

Thanks for your interest in contributing! AgentID is a Solana-based identity protocol for AI agents. Whether you're fixing a bug, adding a feature, or improving docs — all contributions are welcome.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting a PR](#submitting-a-pr)
- [Commit Format](#commit-format)

---

## Prerequisites

Before you start, install these tools:

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org/) |
| Yarn | ≥ 1.22 | `npm i -g yarn` |
| Solana CLI | ≥ 1.18 | [docs.solanalabs.com](https://docs.solanalabs.com/cli/install) |
| Anchor CLI | ≥ 0.30 | [anchor-lang.com](https://www.anchor-lang.com/docs/installation) |
| Rust | stable | [rustup.rs](https://rustup.rs/) |

You'll also need a Solana wallet with devnet SOL. Get some from the [faucet](https://faucet.solana.com).

---

## Getting Started

### 1. Fork & clone

```bash
git clone https://github.com/Vishal4742/agentid-kya-solana.git
cd agentid-kya-solana
```

### 2. Install dependencies (all packages)

```bash
# Frontend
cd frontend && npm install && cd ..

# Anchor backend
cd backend && yarn install && cd ..

# Metadata API
cd backend/api && npm install && cd ../..

# x402 middleware
cd backend/x402 && npm install && cd ../..

# Oracle service
cd backend/oracle && npm install && cd ../..

# SDK
cd packages/sdk && npm install && cd ../..

# ELIZA plugin
cd packages/eliza-plugin && npm install && cd ../..
```

### 3. Set up environment files

Each package has a `.env.example` you can copy:

```bash
cp backend/.env.example backend/.env
cp backend/api/.env.example backend/api/.env
cp backend/oracle/.env.example backend/oracle/.env
cp frontend/.env.example frontend/.env.local
```

Edit each `.env` file and fill in your values.

### 4. Run the preflight check

```bash
node scripts/deployment-preflight.mjs
```

This validates that your local environment is set up correctly before you start coding.

---

## Project Structure

```
agentid-kya-solana/
├── frontend/           # Vite + React + TypeScript UI
├── backend/
│   ├── programs/       # Anchor (Rust) smart contract — 12 instructions
│   ├── tests/          # Anchor integration tests
│   ├── api/            # Vercel serverless API (metadata, oracle, premium)
│   ├── oracle/         # Oracle sync service
│   └── x402/           # x402 payment middleware
├── packages/
│   ├── sdk/            # @agentid/sdk TypeScript SDK
│   └── eliza-plugin/   # @agentid/eliza-plugin for ElizaOS
└── docs/               # Architecture and operations docs
```

See [README.md](./README.md) for a full feature overview, and [docs/architecture.md](./docs/architecture.md) for technical internals.

---

## Development Workflow

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<short-description>` | `feature/add-treasury-export` |
| Bug fix | `fix/<short-description>` | `fix/oracle-hmac-null-check` |
| Documentation | `docs/<short-description>` | `docs/add-x402-guide` |
| Chore | `chore/<short-description>` | `chore/bump-anchor-version` |

```bash
git checkout -b feature/your-feature
```

### Running the frontend

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### Running Anchor tests

```bash
cd backend
anchor test
```

> ⚠️ Always run `anchor test` from inside `backend/` — not from the repo root.

### After changing the Anchor program

Any IDL change requires syncing the IDL to the frontend and SDK:

```bash
# From repo root
pwsh ./scripts/sync-idl.ps1
```

---

## Testing

Run all tests before opening a PR:

```bash
# Frontend (Vitest — includes devnet E2E tests)
cd frontend && npm test

# Frontend lint
cd frontend && npm run lint

# Anchor integration tests (local validator)
cd backend && anchor test

# x402 middleware unit tests
cd backend/x402 && npm test

# SDK unit tests
cd packages/sdk && npm test

# API type-check
cd backend/api && npx tsc --noEmit
```

Add or update tests for **every** behavior change that touches:
- UI state (frontend components or hooks)
- API responses (metadata, oracle, premium routes)
- On-chain instructions (Rust program)

---

## Code Style

### TypeScript / React

- **2-space indentation** everywhere
- React components: `PascalCase` filenames (`MyComponent.tsx`)
- Hooks: `useX` naming (`useAgents.ts`)
- Utility/primitive files: lowercase or kebab-case (`button.tsx`, `use-mobile.tsx`)
- Run ESLint before committing: `cd frontend && npm run lint`

### Rust (Anchor)

- `snake_case` filenames for instruction modules (e.g., `update_reputation.rs`)
- Account structs live in `state/`; instruction context structs stay in their instruction file
- Use `require!()` macro for guard clauses — not raw `if/return Err`
- Use `checked_add()` / `checked_sub()` for all arithmetic to prevent overflow

---

## Submitting a PR

**Before you open a PR, make sure:**

- [ ] All tests pass (`npm test`, `anchor test`)
- [ ] Lint is clean (`npm run lint` in `frontend/`)
- [ ] If you changed the Anchor program: IDL is synced (`pwsh ./scripts/sync-idl.ps1`)
- [ ] Docs updated if behavior changed
- [ ] Commit history is clean (squash fixup commits if needed)

**PR description should include:**
- What the PR does and why
- How to test it locally
- Screenshots/recordings for any UI changes
- Any cross-package impact (IDL, API, frontend)

---

## Commit Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add treasury USDC export to dashboard
fix: resolve oracle HMAC null-check edge case
docs: add x402 architecture deep-dive
chore: bump anchor-lang to 0.30.1
```

AI-authored commits should include:
```
Co-Authored-By: Codex
```

---

## Questions?

- Search or open an [issue](https://github.com/Vishal4742/agentid-kya-solana/issues)
- See [SUPPORT.md](./SUPPORT.md) for more help options
