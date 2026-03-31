# AgentID - Solana Agent Identity Protocol

[![CI](https://github.com/Vishal4742/agentid-kya-solana/actions/workflows/ci.yml/badge.svg)](https://github.com/Vishal4742/agentid-kya-solana/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A decentralized identity protocol for AI agents built on Solana, enabling verifiable agent registration, reputation tracking, autonomous payments, and secure interactions.

## 🌟 Features

- **On-Chain Identity**: Register and verify AI agents with NFT-based identities using Metaplex Bubblegum
- **Reputation System**: Track agent actions and maintain reputation scores on-chain
- **Treasury Management**: Built-in treasury for autonomous agent payments with spending limits
- **Metadata API**: Serverless metadata API for agent profiles and capabilities
- **SDK & Plugin**: TypeScript SDK and Eliza plugin for easy integration
- **Web Dashboard**: React + TypeScript frontend for agent registration and management

## 📁 Project Structure

```
agentid-kya-solana/
├── frontend/              # Vite + React + TypeScript UI
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilities and helpers
│   └── package.json
├── backend/              # Solana Anchor workspace
│   ├── programs/         # Anchor programs
│   │   └── agentid-program/  # Main AgentID program
│   ├── tests/            # Anchor integration tests
│   ├── api/              # Serverless metadata API
│   └── Anchor.toml
├── packages/
│   ├── sdk/              # TypeScript SDK
│   └── eliza-plugin/     # Eliza framework plugin
└── scripts/              # Build and deployment scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Rust 1.75+
- Solana CLI 1.18.18
- Anchor 0.30.1
- Yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vishal4742/agentid-kya-solana.git
   cd agentid-kya-solana
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   yarn install
   ```

### Development

#### Frontend

```bash
cd frontend
npm run dev       # Start dev server
npm run build     # Build for production
npm run lint      # Run ESLint
npm test          # Run tests
```

#### Backend

```bash
cd backend
anchor build      # Build Anchor program
anchor test       # Run integration tests
npm run lint      # Run Prettier check
```

#### Metadata API

```bash
cd backend/api
npm install
npm run dev       # Start local dev server
```

### Sync IDL

After making changes to the Anchor program:

```powershell
.\scripts\sync-idl.ps1
```

## 📚 Documentation

- [AGENTS.md](AGENTS.md) - Repository guidelines and conventions
- [MASTER_BUILD_GUIDE.md](MASTER_BUILD_GUIDE.md) - Comprehensive build guide
- [PHASE1_IDENTITY_RUNBOOK.md](PHASE1_IDENTITY_RUNBOOK.md) - Phase 1 implementation runbook
- [Frontend README](frontend/README.md) - Frontend-specific documentation
- [SDK README](packages/sdk/README.md) - SDK usage and API reference
- [Plugin README](packages/eliza-plugin/README.md) - Eliza plugin integration guide

## 🏗️ Architecture

### Anchor Program

The main AgentID program exposes 12 instructions:

1. `init_config` - Initialize program configuration
2. `register_agent` - Register a new agent identity
3. `update_capabilities` - Update agent capabilities
4. `verify_agent` - Verify an agent
5. `log_action` - Log an agent action
6. `rate_agent` - Rate an agent
7. `update_reputation` - Update reputation score
8. `initialize_treasury` - Initialize agent treasury
9. `autonomous_payment` - Execute autonomous payment
10. `update_spending_limits` - Update spending limits
11. `emergency_pause` - Pause treasury operations
12. `deposit` - Deposit funds to treasury

### Frontend Stack

- **Framework**: Vite + React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Web3**: @solana/web3.js + @coral-xyz/anchor
- **Wallet**: @solana/wallet-adapter
- **Routing**: React Router

### Backend Stack

- **Framework**: Anchor 0.30.1
- **Blockchain**: Solana (Devnet)
- **NFT Standard**: Metaplex Bubblegum (cNFTs)
- **API**: Vercel Serverless Functions
- **Database**: Anchor program state

## 🧪 Testing

### Frontend Tests

```bash
cd frontend
npm test
```

### Anchor Tests

```bash
cd backend
anchor test
```

Treasury tests use a mock USDC mint created with `spl-token` helpers on localnet.

## 🔒 Security

- See [SECURITY.md](.github/SECURITY.md) for security policies
- Report vulnerabilities responsibly to repository maintainers
- Never commit private keys or seed phrases
- Audit smart contracts before mainnet deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit with conventional commits (`feat: add amazing feature`)
6. Push to your branch
7. Open a Pull Request

See [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) for PR guidelines.

## 📋 Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `perf:` - Performance improvements

## 🛣️ Roadmap

- [x] Phase 1: Core identity registration with NFTs
- [x] Treasury management with spending limits
- [x] Reputation tracking system
- [x] Metadata API and SDK
- [ ] Enhanced reputation algorithms
- [ ] Cross-chain identity bridges
- [ ] Advanced governance features
- [ ] Mainnet deployment

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- [@Vishal4742](https://github.com/Vishal4742)

## 🙏 Acknowledgments

- Built with [Anchor](https://www.anchor-lang.com/)
- NFTs powered by [Metaplex Bubblegum](https://developers.metaplex.com/bubblegum)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

## 📞 Support

- Create an [Issue](https://github.com/Vishal4742/agentid-kya-solana/issues/new/choose)
- Check existing [Issues](https://github.com/Vishal4742/agentid-kya-solana/issues)
- Read the [Documentation](MASTER_BUILD_GUIDE.md)

---

**Note**: This project is in active development. Features and APIs may change. Always test on devnet before deploying to mainnet.
