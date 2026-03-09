# 🤖 AgentID — KYA Protocol on Solana
## Master Project & Build Guide

> **Repo:** `Vishal4742/agentid-kya-solana`
> **Program ID (Devnet):** `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`
> **IDL Account:** `FE74FsqJ9YsGGrKCW8y66UC6JDpsxfPuSP86dF9d3ZM8`
> **Grant Target:** Solana Foundation via Superteam Earn — up to $10,000
> **Last Audited:** March 9, 2026 — 10:15 IST

---

## 1. Vision & Problem Statement

**AgentID** is the first Solana-native "Know Your Agent" (KYA) protocol giving every AI agent:
- A **verifiable on-chain identity** (soul-bound cNFT credential)
- A **reputation score** (0–1000) from tx history, uptime & human ratings
- **Autonomous payment capability** via x402 + USDC treasury
- An **immutable audit trail** of every action on Solana

### Why it matters
Every major player (Stripe, Visa, OpenAI, Google) launched AI agent identity frameworks in 2025 — all off-chain & Web2. ERC-8004 exists on Ethereum only. Solana (home of ai16z/ELIZA, 50k+ GitHub stars) has **zero on-chain agent identity layer**. AgentID fills this gap.

### India-specific angle
Indian AI freelance agencies need TDS compliance for agent-generated payments. AgentID stores GSTIN and PAN hash on-chain and auto-generates compliant invoices.

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────┐
│                      AGENTID STACK                      │
│                                                         │
│  L1 IDENTITY   → Soul-bound cNFT via Metaplex Bubblegum│
│  L2 REPUTATION → Oracle-computed score (0–1000)        │
│  L3 PAYMENT    → x402 micropayments + USDC Treasury    │
│  L4 SDK        → ELIZA plugin + TypeScript SDK         │
│                                                         │
│  Stack: Anchor (Rust) | Vite/React/TS | Tailwind       │
│         Metaplex cNFT | Helius DAS | Arweave | Supabase│
└────────────────────────────────────────────────────────┘
```

---

## 3. Current Project Status *(Audited March 9, 2026 — 10:15 IST)*

### 3.1 Overall Progress

| Layer | UI | Smart Contract | Backend | SDK | Overall |
|---|---|---|---|---|---|
| **L1 — Identity Registry** | ✅ 100% | ✅ 100% | ✅ 100% | ❌ 0% | **~75%** |
| **L2 — Reputation Engine** | ✅ 85% | ❌ 0% | ❌ 0% | ❌ 0% | **~20%** |
| **L3 — Payment Layer** | ✅ 80% | ❌ 0% | ❌ 0% | ❌ 0% | **~20%** |
| **L4 — SDK & Plugins** | ✅ 70% | — | — | ❌ 0% | **~15%** |
| **India Compliance** | ✅ 85% | ✅ 60% | ❌ 0% | ❌ 0% | **~40%** |

### 3.2 Completed vs Remaining

| ✅ DONE (confirmed in repo) | ❌ REMAINING |
|---|---|
| Real Phantom + Solflare wallet integration | `frontend/src/lib/indiaCompliance.ts` (Phase 6.1) |
| Anchor smart contract deployed to devnet | Invoice modal in Dashboard (Phase 6.2) |
| `registerAgent` on-chain from `Register.tsx` | GSTIN badge in AgentProfile (Phase 6.3) |
| `useAllAgents()` — `Agents.tsx`, `Verify.tsx`, `AgentProfile.tsx` | Metadata API Vercel function (Phase 4.4) |
| `useMyAgent()` — `Dashboard.tsx` real PDA | cNFT badge in AgentProfile UI (Phase 4.5) |
| `AgentProfile.tsx` — real on-chain PDA fetch | Reputation oracle + Helius webhook (Phase 5) |
| **Bubblegum CPI in `register.rs`** — `non_transferable: true` ✅ | `@agentid/sdk` npm package (Phase 7) |
| **All 7 Anchor instructions** (register, rate, verify, log, update_rep, init_config, update_cap) | `@agentid/eliza-plugin` npm package (Phase 7) |
| **`AgentAction` + `ProgramConfig` + `VerificationResult` structs** ✅ | Agent Treasury program (Phase 8) |
| `Docs.tsx` page — exists (verify route in App.tsx) | x402 payment middleware (Phase 8) |
| `OnboardingModal.tsx` component exists | `packages/sdk/` + `packages/eliza-plugin/` dirs |
| 49+ shadcn/ui components + Framer Motion | `Index.tsx` live agents still using `MOCK_AGENTS` |
| IDL: `agentid_program.json` + `.ts` types | **Re-deploy to devnet needed** (Bubblegum accounts added) |

### 3.3 Hooks & Data Layer

| File | Status | Confirmed |
|---|---|---|
| `hooks/useWallet.tsx` | ✅ Real wallet adapter | ✅ |
| `hooks/useProgram.ts` | ✅ Typed Anchor client | ✅ file exists |
| `hooks/useAgents.ts` | ✅ `useAllAgents()` + `useMyAgent()` | ✅ file exists |
| `hooks/useTextScramble.ts` | ✅ Text animation | ✅ |
| `hooks/use-toast.ts` | ✅ Toast hook | ✅ |
| `lib/indiaCompliance.ts` | ❌ **Not created yet** | ❌ missing |
| `idl/agentid_program.json` | ✅ Deployed IDL | ✅ file exists |
| `idl/agentid_program.ts` | ✅ TypeScript types | ✅ file exists |

### 3.4 Pages Status *(Confirmed by grep)*

| Page | File | On-Chain? | Confirmed Status |
|---|---|---|---|
| Landing `/` | `Index.tsx` | ⚠️ Partial | **`MOCK_AGENTS` still used** for live agents section |
| Register `/register` | `Register.tsx` | ✅ | Real `registerAgent().rpc()` |
| Agents `/agents` | `Agents.tsx` | ✅ | `useAllAgents()` confirmed |
| Verify `/verify` | `Verify.tsx` | ✅ | `useAllAgents()` confirmed |
| Dashboard `/dashboard` | `Dashboard.tsx` | ✅ | `useMyAgent()` confirmed |
| Agent Profile `/agent/:id` | `AgentProfile.tsx` | ✅ | Real PDA fetch + `useAllAgents()` |
| Docs `/docs` | `Docs.tsx` | — | **File exists** — verify it's routed in `App.tsx` |
| 404 | `NotFound.tsx` | — | ✅ |

---

## 4. Grant Milestones

| Milestone | Deliverable | Amount | Status |
|---|---|---|---|
| **M1** | Identity Registry live on mainnet + 5 registered agents | $3,000 | 🟡 Devnet done, mainnet next |
| **M2** | ELIZA plugin published 50+ downloads + reputation engine live | $4,000 | ❌ Not started |
| **M3** | 1 DeFi protocol CPI integration + India compliance + docs | $3,000 | ❌ Not started |

---

## 5. Phase Build Log

### ✅ Phase 0 — UI Polish (Complete)
- Search + filter on Agents page
- Analytics charts in Dashboard
- Loading skeletons across all pages
- `OnboardingModal.tsx` component built

### ✅ Phase 1 — Real Wallet Integration (Complete, March 9)
- `@solana/wallet-adapter-react` + Phantom + Solflare wired
- `vite.config.ts` + `main.tsx` polyfills (`Buffer`, `global`, `process.env`)

### ✅ Phase 2 — Anchor Smart Contract (Complete, March 9)
- `AgentIdentity` PDA account deployed to devnet
- Program ID: `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF`
- `agentid_program.so` confirmed in `backend/target/deploy/`

### ✅ Phase 3 — Frontend Wired to On-Chain (Complete, March 9)
- `useProgram.ts` — typed Anchor client via browser wallet
- `Register.tsx` → real `registerAgent().rpc()`
- `useAgents.ts` → `useAllAgents()` + `useMyAgent(pubkey)`
- `Agents.tsx`, `Verify.tsx`, `Dashboard.tsx` all reading real chain data

### ✅ Phase 4.1 — AgentProfile On-Chain (Complete, March 9)
- `AgentProfile.tsx` now fetches real `AgentIdentity` PDA by base58 pubkey from URL
- `normalizeAccount()` maps all on-chain fields to existing `Agent` UI shape
- 404 state shows real agents from `useAllAgents()` as suggestions
- Build verified: exit code 0

### ✅ Phase 4.2 — Merkle Tree + Bubblegum CPI (Complete, confirmed in repo)
- `register.rs` imports `mpl_bubblegum`, `spl_account_compression`, `spl_noop`
- `MintV1CpiBuilder` call with `non_transferable: true` (soul-bound)
- cNFT metadata URI: `https://agentid.xyz/metadata/<hex_agent_id>`
- `credential_nft` field stored in `AgentIdentity` PDA after mint
- `AgentIdentity` struct includes all capability, reputation, and India compliance fields

### ✅ Phase 4.3 — Full Anchor Program (Complete, confirmed in repo)
- **All 7 instructions present:** `register`, `update_capabilities`, `log_action`, `rate`, `verify`, `update_reputation`, `init_config`
- `AgentAction` PDA for audit trail
- `ProgramConfig` PDA with `oracle_authority` for reputation oracle
- `VerificationResult` return type for CPI calls
- **Needs re-deploy to devnet** — Bubblegum accounts added since last deploy

### ✅ Phase 4.4 — Metadata API (Complete, March 9)
- `backend/api/metadata/[agentId].ts` — Vercel serverless function
- Accepts `GET /api/metadata/:agentId` (64-char hex `agent_id`)
- Fetches real `AgentIdentity` PDA on devnet via `@coral-xyz/anchor`
- Returns full Metaplex-compatible JSON: name, image, attributes (framework, model, reputation, dates, capabilities), `non_transferable: true`
- 5-minute `Cache-Control` (reputation updates hourly)
- `backend/api/idl/agentid_program.json` — IDL copied for Vercel runtime
- `backend/api/vercel.json` + `package.json` + `tsconfig.json`
- **Deployed:** `https://agentid-metadata-api.vercel.app`
- **Endpoint:** `https://agentid-metadata-api.vercel.app/api/metadata/<hex_agent_id>`
### ✅ Phase 4.5 — cNFT badge in AgentProfile UI (Complete, March 9)
- Fetches `credentialNft` from parsed `AgentIdentity` data.
- Displays `🎖 Soul-Bound Credential` badge with Solana Explorer link if the agent has a credential NFT.
- Shows pending upgrade message if KYB/Audited is not yet met and no credential exists.
### ⚠️ Phase 5 — Reputation Oracle (Not started)
### ⚠️ Phase 6 — India Compliance Wiring (Not started — UI exists, `indiaCompliance.ts` missing)
### ⚠️ Phase 7 — ELIZA Plugin + SDK (Not started — no `packages/` folder yet)
### ⚠️ Phase 8 — Treasury + x402 (Not started)
### ⚠️ Phase 9 — Mainnet Deploy (Not started)
### ✅ Phase 10.1 — Docs Page (File `Docs.tsx` exists — verify route in App.tsx)

---

## 6. Upcoming Phases — Detailed Build Steps

---

### Phase 4: AgentProfile On-Chain + Metaplex cNFT Credential
**⏱️ 2–3 days | 🔵 Codex (Rust) + 🟢 Antigravity (wiring)**

#### Step 4.1 — Wire AgentProfile Page to Real PDA

**Ask Antigravity:**
```
In frontend/src/pages/AgentProfile.tsx, replace the mock data lookup with a real on-chain fetch.

Context:
- The route is /agent/:id where :id is currently a mock string like "agent-001"
- The real agent PDA pubkey is the base58 string from useAllAgents() (agent.id field)
- useProgram.ts hook is at src/hooks/useProgram.ts
- IDL is at src/idl/agentid_program.json

What to do:
1. Import useProgram from @/hooks/useProgram and PublicKey from @solana/web3.js
2. In the component, call program.account.agentIdentity.fetch(new PublicKey(id)) where id is from useParams()
3. Map the on-chain AgentIdentity account to the existing Agent interface shape:
   - framework: use FRAMEWORKS array [ELIZA, AutoGen, CrewAI, LangGraph, Custom][account.framework]
   - llmModel: account.model (string, max 32 chars)
   - verifiedLevel: ["Unverified","KYB","Audited"][account.verifiedLevel]
   - reputationScore: account.reputationScore (u16)
   - registeredAt: new Date(account.registeredAt.toNumber() * 1000).toISOString()
   - lastActive: new Date(account.lastActive.toNumber() * 1000).toISOString()
   - capabilities.maxUsdcTx: account.maxTxSizeUsdc.toNumber() / 1_000_000
   - ownerWallet: account.owner.toBase58()
4. Show a skeleton while loading, and a "Agent not found" state if fetch throws
5. Keep all existing UI exactly as-is — just swap mock data for real data
6. Activity feed can remain empty array [] for now (no ActivityLog PDA yet)
```

#### Step 4.2 — Set Up Merkle Tree for Bubblegum cNFTs

**Ask Codex:**
```
Write a TypeScript script at backend/scripts/create-merkle-tree.ts that:

1. Imports @metaplex-foundation/umi, @metaplex-foundation/umi-bundle-defaults,
   and @metaplex-foundation/mpl-bubblegum
2. Creates a Umi instance connected to devnet
3. Creates a Bubblegum Merkle tree with:
   - maxDepth: 14 (supports ~16,384 NFTs)
   - maxBufferSize: 64
   - canopyDepth: 10
4. Saves the tree address to backend/.env as MERKLE_TREE_ADDRESS=<address>
5. Logs: "Merkle tree created: <address>"

Run with: npx ts-node backend/scripts/create-merkle-tree.ts
Include package.json dependencies needed.
```

#### Step 4.3 — Add Bubblegum CPI to registerAgent Instruction

**Ask Codex:**
```
Update the Anchor program at backend/programs/agentid-program/src/lib.rs to add
a Metaplex Bubblegum CPI call inside the register_agent instruction.

After creating the AgentIdentity PDA account, add:

1. Import mpl_bubblegum and spl_account_compression crates (add to Cargo.toml)
2. In register_agent, after setting identity fields, call mpl_bubblegum CPI mint_v1:
   - name: format!("AgentID: {}", params.name)
   - uri: format!("https://agentid.xyz/metadata/{}", hex::encode(agent_id))
   - symbol: "AID"
   - seller_fee_basis_points: 0
   - is_mutable: false
   - creators: vec![{address: owner.key(), verified: true, share: 100}]
3. Add non_transferable: true to make it soul-bound
4. Store the resulting asset_id (Pubkey) in identity.credential_nft
5. Add these accounts to RegisterAgent context:
   - tree_config: Account<TreeConfig>
   - merkle_tree: UncheckedAccount (the tree address from .env)
   - bubblegum_program: Program<MplBubblegum>
   - compression_program: Program<SplAccountCompression>
   - log_wrapper: Program<Noop>
   - token_metadata_program: Program<MplTokenMetadata>

Use Anchor 0.30 conventions. Show the updated Cargo.toml dependencies too.
```

#### Step 4.4 — Build Metadata API for cNFT

**Ask Codex:**
```
Create a Vercel serverless function at backend/api/metadata/[agentId].ts that:

1. Accepts GET /api/metadata/:agentId
2. The agentId is a hex-encoded 32-byte agent_id from the on-chain AgentIdentity
3. Returns Metaplex-compatible JSON:
{
  "name": "AgentID: <name>",
  "description": "On-chain identity credential for AI agent on Solana",
  "image": "https://agentid.xyz/nft/<agentId>.png",
  "animation_url": null,
  "external_url": "https://agentid.xyz/agent/<ownerPubkey>",
  "attributes": [
    {"trait_type": "Framework", "value": "ELIZA"},
    {"trait_type": "Model", "value": "Claude 3.5 Sonnet"},
    {"trait_type": "Verified Level", "value": "Unverified"},
    {"trait_type": "Reputation Score", "value": 500},
    {"trait_type": "Registration Date", "value": "2026-03-09"}
  ],
  "properties": {
    "category": "identity",
    "non_transferable": true
  }
}
4. Fetch data from the on-chain AgentIdentity PDA using @coral-xyz/anchor + devnet RPC
5. Deploy to Vercel: vercel.json with {"routes": [{"src": "/api/(.*)", "dest": "/api/$1"}]}
Include vercel.json and package.json.
```

#### Step 4.5 — Show cNFT in AgentProfile UI

**Ask Antigravity:**
```
In frontend/src/pages/AgentProfile.tsx, add a "Soul-Bound Credential" section below
the capabilities list:

1. If agent.credentialNft is set (non-zero pubkey), show:
   - A bordered card with title "🎖 Soul-Bound Credential"
   - The cNFT address truncated: first 8...last 8 chars
   - A link to Solana Explorer: https://explorer.solana.com/address/<credentialNft>?cluster=devnet
   - Text: "Non-transferable • Minted on registration"
2. If not set, show:
   - A muted card with text "Credential NFT pending — upgrade to KYB"

Use the same editorial styling (border border-border, label-meta class, font-mono).
```

---

### Phase 5: Reputation Engine
**⏱️ 3–4 days | 🔵 Codex (oracle service) + 🟢 Antigravity (wiring)**

#### Step 5.1 — Add update_reputation Instruction to Anchor Program

**Ask Codex:**
```
Add an update_reputation instruction to backend/programs/agentid-program/src/lib.rs:

1. Add a ProgramConfig PDA account that stores oracle_authority: Pubkey
   - Seeds: [b"program-config"]
   - Add initialize_config instruction (one-time setup, signer = deployer)
2. update_reputation instruction:
   - Accounts: identity (AgentIdentity PDA, mut), oracle (Signer), config (ProgramConfig)
   - Validation: require!(oracle.key() == config.oracle_authority, ErrorCode::Unauthorized)
   - Params: new_score: u16 — validate 0 <= new_score <= 1000
   - Sets identity.reputation_score = new_score
   - Emits event: ReputationUpdated { agent: identity.key(), old_score, new_score, timestamp }
3. Add log_action instruction:
   - Creates AgentAction PDA: seeds [b"agent-action", identity.key(), &action_count.to_le_bytes()]
   - Records: action_type (u8), program_called (Pubkey), outcome (bool), usdc_transferred (u64), timestamp (i64)
   - Increments identity.total_transactions
   - If outcome == true: increments identity.successful_transactions
   - Updates identity.last_active

Use Anchor 0.30. Show the full updated lib.rs.
```

#### Step 5.2 — Build Reputation Oracle Service

**Ask Codex:**
```
Create a Node.js/TypeScript reputation oracle at backend/oracle/index.ts:

Purpose: Fetch all AgentIdentity accounts, compute scores, update on-chain every hour.

1. Connect to Solana devnet via @coral-xyz/anchor
2. Load oracle keypair from ORACLE_KEYPAIR_PATH env var
3. Fetch ALL AgentIdentity accounts: program.account.agentIdentity.all()
4. For each agent, compute reputation score (0-1000):

   successRate    = (successful_transactions / max(total_transactions, 1)) * 400
   humanRating    = ((human_rating - 1) / 4) * 200  (if rated, else 0)
   longevity      = min(daysSince(registered_at) / 365, 1) * 150
   txVolume       = min(total_transactions / 1000, 1) * 150
   verifiedLevel  = [0, 50, 100, 200][verified_level]  (Unverified/Email/KYB/Audited)
   
   total = round(successRate + humanRating + longevity + txVolume + verifiedLevel)

5. Call program.methods.updateReputation(new_score).accounts({...}).rpc() for each agent
6. Log: "Updated <agent_name>: <old_score> → <new_score>"
7. Run via cron: setInterval(updateAll, 60 * 60 * 1000)  // every hour

.env variables needed:
  ORACLE_KEYPAIR_PATH=/path/to/oracle-keypair.json
  PROGRAM_ID=Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF
  RPC_URL=https://api.devnet.solana.com

Include package.json with ts-node, @coral-xyz/anchor, @solana/web3.js.
Include a README on how to deploy to Railway or Render.
```

#### Step 5.3 — Set Up Helius Webhook for Real-Time Updates

**Ask Codex:**
```
Create a webhook listener at backend/oracle/webhook.ts:

1. Express server listening on PORT env var (default 3001)
2. POST /webhook — receives Helius transaction webhooks
3. Filter for transactions involving program ID Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF
4. For each transaction, extract:
   - Which AgentIdentity PDA was involved (from account keys)
   - Whether it succeeded (confirmationStatus === "finalized")
5. Trigger reputation recalculation only for that agent (not all)
6. Register the webhook on Helius:
   POST https://api.helius.xyz/v0/webhooks?api-key=<HELIUS_API_KEY>
   body: { webhookURL, transactionTypes: ["ANY"], accountAddresses: [PROGRAM_ID], webhookType: "enhanced" }

Include the Helius registration script as a separate file: backend/oracle/register-webhook.ts
```

#### Step 5.4 — Wire Reputation to Frontend

**Ask Antigravity:**
```
In frontend/src/pages/AgentProfile.tsx, update the reputation gauge to show real-time data:

1. Below the reputation gauge (score number), add:
   - "Last updated: <relative time>" — read from identity.lastActive timestamp
   - A tooltip on hover showing the score breakdown:
     "Tx Success: X pts | Rating: X pts | Longevity: X pts | Volume: X pts | Verified: X pts"
     (compute these client-side from the on-chain account fields)
2. Add a small "Refresh" icon button (RefreshCw from lucide-react) next to the score
   - On click, re-fetch the PDA account and update the displayed score
3. Use the existing editorial styling — keep all animations intact
```

---

### Phase 6: India Compliance Module
**⏱️ 2 days | 🟢 Antigravity (wiring) + 🟣 Lovable (invoice UI)**

#### Step 6.1 — TDS Calculation Utility Module

**Ask Codex:**
```
Create frontend/src/lib/indiaCompliance.ts:

1. Export function calculateTDS(serviceCategory: string, grossAmount: number):
   Returns { tdsRate: number, tdsAmount: number, netPayable: number, section: string }
   
   Mapping:
   - "Information Technology Services" → Section 194J, 10%
   - "Financial Services" → Section 194A, 2%
   - "Consulting Services" → Section 194J, 10%
   - "Marketing & Advertising" → Section 194C, 1%
   - "Research & Development" → Section 194J, 10%

2. Export function generateInvoice(agent: Agent, amount: number, clientPan: string):
   Returns Invoice object:
   {
     invoiceNumber: "INV-<timestamp>-<random4>",
     agentName: string,
     gstin: string,
     serviceCategory: string,
     grossAmount: number,
     tdsRate: number,
     tdsAmount: number,
     netPayable: number,
     section: string,
     date: string (ISO),
     clientPan: string
   }

3. Export function formatFor26Q(invoices: Invoice[], quarter: "Q1"|"Q2"|"Q3"|"Q4"):
   Returns JSON matching ITD 26Q format for filing

Use TypeScript with full type exports.
```

#### Step 6.2 — Invoice Modal UI

**Ask Antigravity:**
```
In frontend/src/pages/Dashboard.tsx, add an invoice generation button for agents with India compliance enabled.

1. In the agent list row (My Agents section), add a "Invoice" button next to the existing
   ExternalLink and Pause buttons — only visible when agent.indiaCompliance is set.
   Use FileText icon from lucide-react.

2. Create a modal (use Dialog from @/components/ui/dialog) that opens when clicked:
   - Title: "Generate Invoice — {agent.name}"
   - Input: "Gross Amount (USDC)" — number input
   - Input: "Client PAN" — text input (10 chars, uppercase)
   - Display: auto-calculated TDS breakdown using calculateTDS from @/lib/indiaCompliance
     Show: Gross Amount | TDS @ X% (Section 194X) | Net Payable
   - Button: "Download PDF" (uses browser print: window.print())
   - Button: "Copy Invoice JSON" (copies generateInvoice() result to clipboard)

3. Use amber color scheme for India compliance elements (text-amber, border-amber/30)
4. Match the existing editorial modal styling
```

#### Step 6.3 — GSTIN Verification Badge

**Ask Antigravity:**
```
In frontend/src/pages/AgentProfile.tsx, update the India Compliance section:

1. If agent.indiaCompliance.gstin is set and length === 15, show a green "GSTIN Verified" badge
   next to the GSTIN number. Use CheckCircle2 from lucide-react.
2. Add the TDS section reference text: "Section 194J — 10% TDS applicable"
   (or Section 194A for Financial Services)
3. Add a small amber "India KYA" pill badge in the agent name header if India compliance is set
4. Keep all existing styling unchanged
```

---

### Phase 7: ELIZA Plugin + TypeScript SDK
**⏱️ 3–4 days | 🔵 Codex**

#### Step 7.1 — Scaffold npm Packages

```bash
cd agentid-kya-solana
mkdir -p packages/sdk packages/eliza-plugin
```

#### Step 7.2 — Build TypeScript SDK

**Ask Codex:**
```
Create packages/sdk/ as an npm package @agentid/sdk:

package.json:
{
  "name": "@agentid/sdk",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}

src/index.ts must export:

1. class AgentIdClient:
   constructor(connection: Connection, wallet: AnchorWallet)
   
   async registerAgent(params: RegisterAgentParams): Promise<string>
   // params: { name, framework, model, agentWallet, capabilities, gstin?, panHash? }
   // Returns: transaction signature
   
   async getAgentIdentity(ownerPubkey: string): Promise<AgentIdentity | null>
   // Derives PDA: ["agent-identity", owner.toBytes()], fetches account
   
   async verifyAgent(ownerPubkey: string, actionType: ActionType): Promise<VerificationResult>
   // actionType: "defi_trade" | "payment" | "content" | "other"
   // Returns: { isRegistered, verifiedLevel, reputationScore, isAuthorized }
   // isAuthorized thresholds: defi_trade>=600, payment>=400, other>=100
   
   async rateAgent(agentPDA: string, rating: 1|2|3|4|5): Promise<string>
   
   async getAllAgents(): Promise<AgentIdentity[]>

2. Export all TypeScript types:
   AgentIdentity, RegisterAgentParams, VerificationResult, ActionType
   AgentFramework = "ELIZA" | "AutoGen" | "CrewAI" | "LangGraph" | "Custom"
   VerifiedLevel = "Unverified" | "KYB" | "Audited"

3. Export constants:
   PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF"
   DEVNET_RPC = "https://api.devnet.solana.com"

4. Export the IDL (copy agentid_program.json into packages/sdk/src/idl/)

Use @coral-xyz/anchor under the hood. Include tsconfig.json and build script.
Write a comprehensive README.md with usage examples.
```

#### Step 7.3 — Build ELIZA Plugin

**Ask Codex:**
```
Create packages/eliza-plugin/ as @agentid/eliza-plugin npm package.

It must conform to ELIZA's Plugin interface from @ai16z/eliza.

src/index.ts:

import { AgentIdClient } from "@agentid/sdk";

export const agentIdPlugin: Plugin = {
  name: "agentid",
  description: "AgentID KYA — on-chain identity and reputation for ELIZA agents",
  
  actions: [
    {
      name: "GET_MY_REPUTATION",
      description: "Returns this agent's AgentID credential and reputation score",
      handler: async (runtime) => {
        const client = new AgentIdClient(connection, wallet);
        const identity = await client.getAgentIdentity(runtime.agentWallet);
        if (!identity) return "This agent has no AgentID credential. Register at https://agentid.xyz/register";
        return `AgentID Credential:
  Name: ${identity.name}
  Framework: ${identity.framework}
  Reputation: ${identity.reputationScore}/1000
  Verified: ${identity.verifiedLevel}
  Registered: ${identity.registeredAt}`;
      }
    },
    {
      name: "VERIFY_COUNTERPARTY_AGENT",
      description: "Verify another agent's credentials before transacting with them",
      handler: async (runtime, message) => {
        // Extract wallet address from message
        const client = new AgentIdClient(connection, wallet);
        const result = await client.verifyAgent(targetWallet, "payment");
        if (!result.isAuthorized) return `⛔ Agent ${targetWallet} is NOT authorized. Score: ${result.reputationScore}/1000`;
        return `✅ Agent verified. Score: ${result.reputationScore}/1000. Level: ${result.verifiedLevel}`;
      }
    }
  ],
  
  // Hook into ELIZA's action:executed event to auto-log actions on-chain
  onActionExecuted: async (runtime, action, result) => {
    const client = new AgentIdClient(connection, wallet);
    await client.logAction({
      actionType: mapActionType(action.name),
      programCalled: PROGRAM_ID,
      outcome: result.success,
      usdcTransferred: result.amount ?? 0
    });
  }
};

Include README.md showing:
  import { agentIdPlugin } from '@agentid/eliza-plugin'
  const agent = new AgentRuntime({ plugins: [agentIdPlugin] })
```

#### Step 7.4 — Publish Packages

```bash
# Build
cd packages/sdk && npm run build && npm publish --access public
cd ../eliza-plugin && npm run build && npm publish --access public
```

---

### Phase 8: Payment Layer (Treasury + x402)
**⏱️ 3–5 days | 🔵 Codex (Rust) + 🟢 Antigravity (wiring)**

#### Step 8.1 — AgentTreasury Anchor Account

**Ask Codex:**
```
Add an AgentTreasury account and instructions to the Anchor program:

Account struct AgentTreasury:
  agent_identity: Pubkey      // link to AgentIdentity PDA
  owner: Pubkey
  usdc_mint: Pubkey           // devnet USDC: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
  usdc_balance: u64           // stored as lamports (6 decimals)
  total_earned: u64
  total_spent: u64
  spending_limit_per_tx: u64
  spending_limit_per_day: u64
  spent_today: u64
  day_reset_timestamp: i64
  emergency_pause: bool
  multisig_required_above: u64 // if tx > this amount, require multisig
  bump: u8
  
PDA seeds: [b"agent-treasury", agent_identity.key().as_ref()]

Instructions:
1. initialize_treasury(spending_limit_per_tx, spending_limit_per_day, multisig_required_above)
   - Creates treasury PDA
   - Sets day_reset_timestamp = Clock::get()?.unix_timestamp

2. autonomous_payment(amount: u64, recipient: Pubkey, memo: String)
   - require!(!treasury.emergency_pause, ErrorCode::TreasuryPaused)
   - require!(amount <= treasury.spending_limit_per_tx, ErrorCode::ExceedsPerTxLimit)
   - Reset daily spent if new day: if now > day_reset_timestamp + 86400
   - require!(treasury.spent_today + amount <= treasury.spending_limit_per_day, ErrorCode::ExceedsDailyLimit)
   - require!(agent_identity.reputation_score >= 100, ErrorCode::InsufficientReputation)
   - Transfer USDC via SPL token transfer CPI
   - Update treasury.spent_today, total_spent, usdc_balance
   - Emit PaymentExecuted event

3. update_spending_limits(per_tx, per_day, multisig_above)
   - require!(ctx.accounts.owner.key() == treasury.owner)

4. emergency_pause(paused: bool)
   - Owner only

5. deposit(amount: u64)
   - Anyone can deposit USDC to the treasury
   - Increases treasury.usdc_balance, total_earned

Use Anchor 0.30, SPL token CPI. Show updated Cargo.toml. Include error codes.
```

#### Step 8.2 — x402 Payment Middleware

**Ask Codex:**
```
Create backend/x402/middleware.ts — Express middleware implementing the x402 protocol:

1. When a request arrives without X-Payment header:
   return 402 Payment Required with:
   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "solana-devnet",
       "maxAmountRequired": "1000000",  // 1 USDC in lamports
       "resource": req.path,
       "description": "AgentID API access",
       "mimeType": "application/json",
       "payTo": TREASURY_ADDRESS,
       "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"  // devnet USDC
     }]
   }

2. When X-Payment header is present:
   - Verify the USDC transfer on-chain (check tx signature in header)
   - If valid: forward request to handler
   - If invalid: return 402 again

3. Log each verified payment as an AgentAction on-chain via logAction instruction

Usage:
   app.use('/api/premium/*', agentPaymentGate({ amount: 1_000_000 }))

Include a test script that simulates payment flow.
```

#### Step 8.3 — Wire Dashboard Treasury

**Ask Antigravity:**
```
In frontend/src/pages/Dashboard.tsx, wire the Treasury panel to real on-chain data:

Context:
- AgentTreasury PDA: seeds ["agent-treasury", agentIdentityPDA.toBytes()]
- Program has: initialize_treasury, autonomous_payment, update_spending_limits, emergency_pause, deposit instructions
- useProgram hook at src/hooks/useProgram.ts
- Connected wallet available via useWallet

Changes needed:

1. Fetch real treasury data:
   - Derive treasury PDA from the agent's identity PDA
   - Call program.account.agentTreasury.fetch(treasuryPDA)
   - If not found, show "Treasury not initialized" with "Initialize" button
   
2. Replace mock USDC balance "$24,850":
   - Show real treasury.usdc_balance / 1_000_000 as "$X,XXX USDC"
   
3. Wire "Save Limits" button:
   - Call program.methods.updateSpendingLimits(
       new BN(spendingLimit * 1_000_000),
       new BN(spendingLimit * 1_000_000 * 30),  // 30x as daily
       new BN(10_000 * 1_000_000)              // multisig above $10k
     ).rpc()
   - Show toast on success/failure

4. Wire Pause button (add to Quick Actions):
   - Call program.methods.emergencyPause(!treasury.emergencyPause).rpc()
   - Show real pause state from treasury.emergencyPause

5. Add real total_earned / total_spent stats below the USDC balance

Keep all existing UI unchanged — just replace mock values with real data.
```

---

### Phase 9: Security Audit + Mainnet Deploy
**⏱️ 2–3 days | 🟢 Antigravity**

#### Step 9.1 — Automated Audit

```bash
# Submit to Sec3 X-ray (free)
# https://pro.sec3.dev — upload backend/target/deploy/agentid_program.so
# Review all Critical and High findings before mainnet deploy
```

#### Step 9.2 — Manual Audit Checklist

```
Ask Antigravity to review lib.rs for:
- [ ] All PDA seeds are unique and collision-free
- [ ] Owner-only: require!(ctx.accounts.owner.key() == identity.owner)
- [ ] Oracle-only: require!(oracle.key() == config.oracle_authority)
- [ ] No u16/u64 overflow in reputation/payment math (use checked_add)
- [ ] Emergency pause checked before every autonomous_payment
- [ ] Soul-bound: confirm Bubblegum non_transferable = true
- [ ] Daily limit resets correctly on new calendar day
- [ ] Multisig threshold enforced for large transfers
```

#### Step 9.3 — Network Switcher UI

**Ask Antigravity:**
```
Add a network switcher to the frontend app:

1. In frontend/src/App.tsx:
   - Read network from localStorage: localStorage.getItem("solana-network") ?? "devnet"
   - Use DEVNET_RPC for devnet, "https://api.mainnet-beta.solana.com" for mainnet
   
2. In frontend/src/components/Navbar.tsx:
   - Add a small network badge next to the wallet address
   - Devnet: amber dot + "devnet" text
   - Mainnet: green dot + "mainnet" text
   - Clicking cycles between devnet/mainnet and saves to localStorage
   
3. Update all Solana Explorer links to append ?cluster=devnet or ?cluster=mainnet-beta

4. Show a modal warning when switching to mainnet:
   "You are switching to Mainnet. Real SOL and USDC will be used."
   with Confirm / Cancel buttons
```

#### Step 9.4 — Deploy to Mainnet

```bash
# Fund deployer with real SOL for deployment (~2-3 SOL needed)
solana config set --url mainnet-beta
anchor deploy --provider.cluster mainnet-beta
# Note new mainnet Program ID → update PROGRAM_ID everywhere
```

---

### Phase 10: /docs Page + Launch
**⏱️ 1 week | 🟣 Lovable (docs UI) + manual (launch)**

#### Step 10.1 — Build /docs Page

**Ask Lovable:**
```
Create a /docs page for the AgentID developer documentation. Match the existing editorial dark theme exactly.

Left sidebar with sections:
- Quick Start
- Register Agent
- Verify Agent
- Reputation Score
- CPI Integration
- ELIZA Plugin
- TypeScript SDK
- India Compliance

Each section has:
- Serif italic h2 heading
- Description paragraph in text-muted-foreground
- Syntax-highlighted code block (dark background, monospace font)

For "Quick Start" section, show:
  npm install @agentid/sdk
  
  import { AgentIdClient } from "@agentid/sdk";
  const client = new AgentIdClient(connection, wallet);
  const tx = await client.registerAgent({ name: "MyBot", framework: "ELIZA", ... });

For "CPI Integration" section (Rust code block):
  use agentid::cpi::verify_agent;
  let result = verify_agent(ctx, ActionType::Payment)?;
  require!(result.is_authorized, ErrorCode::AgentNotVerified);

For "ELIZA Plugin":
  import { agentIdPlugin } from '@agentid/eliza-plugin';
  const agent = new AgentRuntime({ plugins: [agentIdPlugin] });

Add route /docs to App.tsx.
Match all existing typography: Georgia serif headings, JetBrains Mono code, green accent color.
```

#### Step 10.2 — Update Landing Page Live Agents Section

**Ask Antigravity:**
```
In frontend/src/pages/Index.tsx, find the "Live Agents" section that currently shows mock MOCK_AGENTS data.

Replace it with real on-chain data:
1. Import useAllAgents from @/hooks/useAgents
2. Show the first 4 real registered agents
3. If < 4 agents: show a "Register your agent →" placeholder card for empty slots
4. If 0 agents: show "No agents registered yet. Be the first →" with a link to /register
5. Show loading skeleton while fetching
6. Display same fields as current mock: name, framework, reputation score, registered date

Keep all animations and styling unchanged.
```

#### Step 10.3 — Community Launch Plan

```
1. Post in ai16z Discord: "We built an AgentID plugin for ELIZA — your agent now has an on-chain passport 🪪"
2. Post on ELIZA GitHub Discussions thread
3. Tweet from AgentID account with Loom demo video
4. Submit to Superteam India bounty board
5. Contact Jupiter/Kamino/Raydium: show one-line CPI call agentid::cpi::verify_agent()
```

#### Step 10.4 — Grant Submission Checklist

```
Milestone 1 ($3,000):
  □ GitHub repo link with Anchor program source
  □ Solana Explorer link showing 5+ registered agents on mainnet
  □ Demo video: register agent → view on /agents → verify on /verify
  □ Program ID on mainnet

Milestone 2 ($4,000):
  □ npm link: npmjs.com/package/@agentid/eliza-plugin
  □ npm link: npmjs.com/package/@agentid/sdk
  □ Screenshot: 50+ downloads
  □ Live reputation oracle URL
  □ Helius webhook dashboard screenshot

Milestone 3 ($3,000):
  □ GitHub PR to a DeFi protocol using agentid::cpi::verify_agent
  □ India compliance demo: register agent with GSTIN → generate invoice → show TDS calc
  □ /docs page deployed
```

---

## 7. Tool Allocation

| When you need to... | Use |
|---|---|
| Build a new page or visual component | 🟣 **Lovable** |
| Generate Rust/Anchor boilerplate | 🔵 **Codex** |
| Generate TypeScript backend or oracle services | 🔵 **Codex** |
| Wire frontend to smart contracts (multi-file) | 🟢 **Antigravity** |
| Debug build/deploy issues | 🟢 **Antigravity** |
| Multi-file refactors with codebase context | 🟢 **Antigravity** |
| Polish animations, transitions, loading states | 🟣 **Lovable** |
| Research Solana/Anchor docs | 🟡 **Gemini** |

---

## 8. File Tree Reference (Current State)

```
agentid-kya-solana/
├── MASTER_BUILD_GUIDE.md           # ← this file
├── idea-2-agentid-kya-solana.md    # 800-line architecture & grant blueprint
├── frontend/                        # Vite + React + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx            ✅ Landing (mock agents — update Phase 10)
│   │   │   ├── Register.tsx         ✅ Real registerAgent().rpc()
│   │   │   ├── AgentProfile.tsx     ⚠️ Still mock — update Phase 4.1
│   │   │   ├── Dashboard.tsx        ✅ Real useMyAgent() PDA
│   │   │   ├── Verify.tsx           ✅ Real on-chain search
│   │   │   └── Agents.tsx           ✅ Real useAllAgents()
│   │   ├── hooks/
│   │   │   ├── useWallet.tsx        ✅ Real wallet adapter
│   │   │   ├── useProgram.ts        ✅ Anchor Program client
│   │   │   └── useAgents.ts         ✅ PDA fetchers
│   │   └── idl/
│   │       ├── agentid_program.json ✅ Deployed IDL
│   │       └── agentid_program.ts   ✅ TypeScript types
├── backend/                         # Anchor workspace
│   ├── Anchor.toml
│   ├── programs/agentid-program/    ✅ Deployed
│   └── target/deploy/
│       └── agentid_program.so       ✅ Deployed binary
└── packages/ (to create in Phase 7)
    ├── sdk/                         # @agentid/sdk
    └── eliza-plugin/                # @agentid/eliza-plugin
```

---

## 9. Summary Timeline

```
Week 0 ✅  Phase 0: UI polish, Phase 1: Real wallet
Week 1 ✅  Phase 2: Anchor smart contract deployed, Phase 3: Frontend wired
Week 2 →   Phase 4: cNFT credential, Phase 5: Reputation oracle
Week 3     Phase 6: India compliance, Phase 7: ELIZA SDK
Week 4     Phase 8: Treasury + x402, Phase 9: Security audit + mainnet
Week 5     Phase 10: /docs, launch, grant submission
```

---

## 10. Quick Reference

| Item | Value |
|---|---|
| Program ID (devnet) | `Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF` |
| IDL Account | `FE74FsqJ9YsGGrKCW8y66UC6JDpsxfPuSP86dF9d3ZM8` |
| PDA Seed (Identity) | `["agent-identity", owner.toBytes()]` |
| PDA Seed (Treasury) | `["agent-treasury", identityPDA.toBytes()]` |
| PDA Seed (Config) | `["program-config"]` |
| Devnet USDC Mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Frontend Dev Port | `localhost:8080` |
| Solana Explorer | `https://explorer.solana.com/address/<addr>?cluster=devnet` |

---

*Last updated: March 9, 2026 — Phases 1, 2, 3 complete. Next: Phase 4 (cNFT).*
