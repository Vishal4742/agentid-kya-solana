# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project structure and professional documentation improvements
- CHANGELOG.md for release tracking
- Simplified CONTRIBUTING.md for solo developers
- scripts/README.md for script documentation
- SDK treasury deposit helper and treasury PDA/ATA derivation helpers
- Phase-status documentation refresh aligned with the verified repo state

### Changed
- Improved `.gitignore` to exclude logs/ directory and build artifacts
- Updated roadmap, deployment, README, and x402 docs to distinguish local verification from live deployment state

## [1.0.0] - 2026-04-12

### Added
- ✅ On-chain agent identity (cNFT via Bubblegum) - Live on devnet
- ✅ Agent verification & reputation scoring - Live on devnet
- ✅ USDC treasury with spending limits - Live on devnet
- ✅ Autonomous payments (x402 protocol) - Live on devnet
- ✅ Oracle webhooks (HMAC-secured, Helius) - Live on devnet
- ✅ Metadata API (Vercel serverless) - Live at `agentid-metadata-api.vercel.app`
- ✅ ElizaOS plugin (`packages/eliza-plugin`) - Published
- ✅ TypeScript SDK (`packages/sdk`) - Published
- Monorepo structure with frontend, backend, and packages
- Comprehensive test coverage (Vitest, Anchor integration tests)
- Security audit (internal, completed 2026-04-12)
- Deployment guides and documentation
- Conventional commit guidelines
- GitHub Actions CI/CD workflows

### Changed
- Initial release of AgentID Know Your Agent (KYA) Protocol

---

## Release Guidelines

When releasing a new version:

1. Update version in `package.json` files.
2. Update `CHANGELOG.md` with changes under a new version header.
3. Create a git tag: `git tag -a v1.x.x -m "Release v1.x.x"`.
4. Push the tag: `git push origin v1.x.x`.
5. Create a GitHub Release with the changelog excerpt.

## Notes

- **Devnet Program**: [`Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`](https://explorer.solana.com/address/Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF?cluster=devnet)
- For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md)
