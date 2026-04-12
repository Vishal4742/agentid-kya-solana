# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Vite + React + TypeScript UI. Main code lives in `src/components`, `src/pages`, `src/hooks`, `src/lib`, and `src/test`.
- `backend/`: Solana Anchor workspace. Program source is in `programs/agentid-program/src`; Anchor tests live in `tests`; serverless metadata API lives in `api/metadata`.
- The Anchor program currently exposes 12 instructions: `init_config`, `register_agent`, `update_capabilities`, `verify_agent`, `log_action`, `rate_agent`, `update_reputation`, `initialize_treasury`, `autonomous_payment`, `update_spending_limits`, `emergency_pause`, and `deposit`.
- `packages/sdk` and `packages/eliza-plugin`: publishable TypeScript packages with source in `src/` and compiled output in `dist/`.
- `PROJECT.md` is the canonical project-facing doc; `AGENTS.md` holds repo instructions. Avoid committing generated files from `dist/`, `target/`, or `node_modules/`.

## Build, Test, and Development Commands
- Frontend:
  ```bash
  cd frontend
  npm install
  npm run dev
  npm run build
  npm run lint
  npm test
  ```
- Anchor backend:
  ```bash
  cd backend
  yarn install
  anchor build
  anchor test
  npm run lint
  ```
- IDL sync after backend changes: `pwsh ./scripts/sync-idl.ps1`
- Metadata API: `cd backend/api && npm install && npm run dev`
- Packages: `cd packages/sdk && npm install && npm run build && npm test`, `cd packages/eliza-plugin && npm install && npm run build`

## Coding Style & Naming Conventions
- Use TypeScript for app and package code, Rust for Anchor program logic.
- Follow existing 2-space indentation in `package.json`, config files, and frontend source.
- React components use `PascalCase` filenames (`Navbar.tsx`); hooks use `useX` (`useAgents.ts`); utility/UI primitives stay lowercase or kebab-style when already established (`button.tsx`, `use-mobile.tsx`).
- Backend Rust modules use snake_case filenames such as `update_reputation.rs`.
- Run `frontend` ESLint before opening a PR; run backend Prettier checks with `cd backend && npm run lint`.

## Testing Guidelines
- Frontend tests use Vitest and Testing Library under `frontend/src/test`; name files `*.test.ts` or `*.test.tsx`.
- Anchor integration tests live in `backend/tests/**/*.ts`; keep new tests close to the instruction or flow they cover.
- Treasury tests in `backend/tests/agentid-program.ts` use a mock USDC mint created with `spl-token` helpers on localnet.
- No coverage gate is configured; add or update tests for every behavior change touching UI state, API responses, or on-chain instructions.

## Feature Flags
- `TREASURY_ENABLED` in `frontend/src/pages/Dashboard.tsx` controls whether the live treasury UI is shown.
- Keep `TREASURY_ENABLED` set to `false` until treasury is deployed to devnet.

## Commit & Pull Request Guidelines
- Follow Conventional Commits already used in history: `feat: ...`, `fix: ...`.
- Keep PRs scoped to one feature or fix. Include a short description, linked issue/task, test notes, and UI screenshots for frontend changes.
- If IDL, API metadata, and frontend behavior change together, mention the cross-package impact explicitly.
- AI-authored commits should include:
  ```text
  Co-Authored-By: Codex <noreply@example.com>
  ```
