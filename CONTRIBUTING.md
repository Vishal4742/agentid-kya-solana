# Contributing to AgentID

A solo project, but contributions are welcome! Here's how to get started.

## Setup

```bash
git clone https://github.com/Vishal4742/agentid-kya-solana.git
cd agentid-kya-solana
cd frontend && npm install
cd ../backend && yarn install && anchor build
```

## Development

1. Create branch: `git checkout -b feature/your-feature`
2. Follow existing code style
3. Test locally:
   - Frontend: `npm test && npm run lint`
   - Backend: `anchor test`
4. Commit: Use [Conventional Commits](https://www.conventionalcommits.org/)
5. Push and create PR with description

## Code Style

- **TypeScript:** 2-space indent, PascalCase components, camelCase functions
- **Rust:** snake_case, rustfmt formatting
- **Components:** `ComponentName.tsx` | **Hooks:** `useHookName.ts`

## Testing

```bash
cd frontend && npm test              # Frontend tests
cd backend && anchor test            # Anchor tests
npm run test:integration             # E2E on devnet
```

## Before Submitting

- Tests pass locally
- Code follows existing style  
- Documentation updated if needed
- Commit history is clean

Questions? Check README.md or open an issue.
