# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- CHANGELOG.md for release tracking
- Simplified CONTRIBUTING.md for solo developers
- scripts/README.md documenting utility scripts
- On-chain agent identity (cNFT via Bubblegum) - Live on devnet
- Agent verification & reputation scoring - Live on devnet
- USDC treasury with spending limits - Live on devnet
- Autonomous payments (x402 protocol) - Live on devnet
- Oracle webhooks (HMAC-secured) - Live on devnet
- Metadata API (Vercel serverless) - Live at agentid-metadata-api.vercel.app
- ElizaOS plugin (packages/eliza-plugin) - Published
- TypeScript SDK (packages/sdk) - Published

---

## Release Guidelines

When releasing a new version:

1. Update version in `package.json` files
2. Update CHANGELOG.md with changes under a new version header
3. Create a git tag: `git tag -a v1.x.x -m "Release v1.x.x"`
4. Push tag: `git push origin v1.x.x`
5. Create a GitHub Release with changelog excerpt
