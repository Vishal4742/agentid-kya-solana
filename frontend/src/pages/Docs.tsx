import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronRight } from "lucide-react";

/* ── Syntax token types ── */
type Token = { type: "keyword" | "string" | "comment" | "fn" | "type" | "num" | "plain" | "punct"; text: string };

function tokenizeTS(line: string): Token[] {
  const tokens: Token[] = [];
  const keywords = /^(import|export|from|const|let|async|await|return|if|throw|new|default|function|type|interface|extends|implements|true|false|null|undefined)\b/;
  const types = /^(string|number|boolean|void|Promise|AgentCredential|AgentVerifyResult|VerifyOptions|PublicKey|BN|Program|AnchorProvider|Connection|Action|IAgentRuntime)\b/;
  const fns = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/;
  const strings = /^('[^']*'|"[^"]*"|`[^`]*`)/;
  const comments = /^(\/\/.*)/;
  const nums = /^(\d[\d_]*)/;
  let rest = line;
  while (rest.length > 0) {
    let m: RegExpMatchArray | null;
    if ((m = rest.match(comments))) { tokens.push({ type: "comment", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(strings))) { tokens.push({ type: "string", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(keywords))) { tokens.push({ type: "keyword", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(types))) { tokens.push({ type: "type", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(fns))) { tokens.push({ type: "fn", text: m[1] }); rest = rest.slice(m[1].length); }
    else if ((m = rest.match(nums))) { tokens.push({ type: "num", text: m[0] }); rest = rest.slice(m[0].length); }
    else { tokens.push({ type: "plain", text: rest[0] }); rest = rest.slice(1); }
  }
  return tokens;
}

function tokenizeRust(line: string): Token[] {
  const tokens: Token[] = [];
  const keywords = /^(use|pub|fn|let|mut|struct|impl|derive|account|require|mod|return|if|else|for|in|true|false|Ok|Err|Result)\b/;
  const macros = /^([a-z_]+!)/;
  const types = /^(Context|Account|Signer|Program|SystemAccount|AgentCredential|CpiContext|String|u64|u32|i32|bool|'info|'_)\b/;
  const strings = /^('[^']*'|"[^"]*")/;
  const comments = /^(\/\/.*)/;
  const nums = /^(\d[\d_]*)/;
  const attrs = /^(#\[[^\]]*\])/;
  let rest = line;
  while (rest.length > 0) {
    let m: RegExpMatchArray | null;
    if ((m = rest.match(attrs))) { tokens.push({ type: "comment", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(comments))) { tokens.push({ type: "comment", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(strings))) { tokens.push({ type: "string", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(keywords))) { tokens.push({ type: "keyword", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(macros))) { tokens.push({ type: "fn", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(types))) { tokens.push({ type: "type", text: m[0] }); rest = rest.slice(m[0].length); }
    else if ((m = rest.match(nums))) { tokens.push({ type: "num", text: m[0] }); rest = rest.slice(m[0].length); }
    else { tokens.push({ type: "plain", text: rest[0] }); rest = rest.slice(1); }
  }
  return tokens;
}

const tokenColor: Record<Token["type"], string> = {
  keyword: "hsl(var(--purple-accent))",
  string:  "hsl(var(--green))",
  comment: "hsl(var(--muted-foreground))",
  fn:      "hsl(var(--blue-accent))",
  type:    "hsl(var(--amber))",
  num:     "hsl(var(--green))",
  plain:   "hsl(var(--foreground) / 0.85)",
  punct:   "hsl(var(--foreground) / 0.5)",
};

function CodeBlock({ code, label, lang = "ts" }: { code: string; label?: string; lang?: "ts" | "rust" | "bash" }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");
  const tokenize = lang === "rust" ? tokenizeRust : lang === "bash" ? (l: string) => [{ type: "plain" as const, text: l }] : tokenizeTS;

  return (
    <div className="border border-border bg-card/60 mt-5 group/code">
      {label && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">{label}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/40 hover:text-green transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "copied" : "copy"}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[12px] leading-[1.7] scrollbar-thin">
        {lines.map((line, li) => (
          <div key={li} className="flex">
            <span className="select-none w-7 shrink-0 text-right pr-4 font-mono text-[10px] text-muted-foreground/20">
              {li + 1}
            </span>
            <span>
              {tokenize(line).map((tok, ti) => (
                <span key={ti} style={{ color: tokenColor[tok.type] }}>{tok.text}</span>
              ))}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function DocSection({ id, tag, title, children }: { id: string; tag: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className="border-b border-border py-14"
    >
      <span className="label-meta text-muted-foreground/40">{tag}</span>
      <h2 className="font-serif italic text-3xl sm:text-4xl mt-2 mb-6 leading-tight tracking-[-0.02em]">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

/* ── NAV items ── */
const NAV = [
  { id: "quickstart",        label: "Quick Start",       tag: "01" },
  { id: "register-agent",    label: "Register Agent",    tag: "02" },
  { id: "verify-agent",      label: "Verify Agent",      tag: "03" },
  { id: "reputation-score",  label: "Reputation Score",  tag: "04" },
  { id: "cpi-integration",   label: "CPI Integration",   tag: "05" },
  { id: "eliza-plugin",      label: "ELIZA Plugin",      tag: "06" },
  { id: "typescript-sdk",    label: "TypeScript SDK",    tag: "07" },
  { id: "india-compliance",  label: "India Compliance",  tag: "08" },
];

/* ── Code snippets ── */

const QUICKSTART_INSTALL = `npm install @agentid/sdk`;

const QUICKSTART_CODE = `import { AgentIDClient } from '@agentid/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

const client = new AgentIDClient({
  connection: new Connection('https://api.devnet.solana.com'),
});

const result = await client.verifyAgent('8xKZT...mQ9P');
console.log(result.credential.name);     // "AlphaTrader"
console.log(result.reputationScore);     // 847`;

const REGISTER_CODE = `import { AgentIDClient } from '@agentid/sdk';

const tx = await client.registerAgent({
  wallet: myKeypair,
  metadata: {
    name:         'DataHarvesterBot',
    framework:    'eliza',
    version:      '1.2.0',
    capabilities: ['data-collection', 'web-scraping'],
    llmModel:     'gpt-4o',
    ownerWallet:  myKeypair.publicKey.toBase58(),
    endpoint:     'https://my-agent.example.com',
    contactEmail: 'ops@example.com',
  },
  spendingLimits: {
    perTx:  50,   // USDC
    daily:  500,
  },
});

console.log('Agent registered:', tx.agentAddress);
console.log('Credential NFT:',  tx.credentialMint);`;

const VERIFY_CODE = `import { AgentIDClient } from '@agentid/sdk';

const client = new AgentIDClient({ connection });

// Verify by wallet address
const result = await client.verifyAgent({
  walletAddress: '8xKZT...mQ9P',
});

// Full credential + on-chain proof
console.log(result.credential.name);           // "AlphaTrader"
console.log(result.credential.framework);      // "eliza"
console.log(result.reputationScore);           // 847
console.log(result.spendingLimits.daily);      // 1000 (USDC)
console.log(result.verifiedLevel);             // "Audited"
console.log(result.onChainProof.signature);    // "3xR7K..."`;

const REPUTATION_CODE = `// Fetch live reputation score
const score = await client.getReputationScore('8xKZT...mQ9P');
// Returns: { score: 847, tier: "Gold", history: [...] }

// Listen for reputation changes via websocket
client.onReputationChange('8xKZT...mQ9P', (event) => {
  console.log('New score:', event.score);      // 852
  console.log('Delta:',     event.delta);      // +5
  console.log('Reason:',    event.reason);     // "successful_interaction"
});

// Reputation tiers
// 0–199    → Unverified
// 200–499  → Bronze
// 500–749  → Silver
// 750–899  → Gold
// 900–1000 → Platinum`;

const CPI_RUST_CODE = `use anchor_lang::prelude::*;
use agentid_program::{cpi, program::AgentId, state::AgentCredential};

#[derive(Accounts)]
pub struct VerifyAndTransfer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // The agent credential PDA owned by AgentID program
    #[account(
        seeds = [b"credential", agent_wallet.key().as_ref()],
        bump,
        seeds::program = agentid_program.key(),
    )]
    pub credential: Account<'info, AgentCredential>,

    pub agent_wallet:    SystemAccount<'info>,
    pub agentid_program: Program<'info, AgentId>,
}

pub fn verify_agent(ctx: Context<VerifyAndTransfer>) -> Result<()> {
    let cred = &ctx.accounts.credential;

    // Verify reputation threshold
    require!(cred.reputation_score >= 500, ErrorCode::InsufficientReputation);

    // Verify agent is active
    require!(!cred.is_paused, ErrorCode::AgentPaused);

    // CPI: increment reputation after interaction
    cpi::increment_reputation(
        CpiContext::new(
            ctx.accounts.agentid_program.to_account_info(),
            cpi::IncrementReputation {
                credential: ctx.accounts.credential.to_account_info(),
                authority:  ctx.accounts.payer.to_account_info(),
            },
        ),
        10, // reputation delta
    )?;

    Ok(())
}`;

const ELIZA_CODE = `import { agentIdPlugin } from '@agentid/eliza-plugin';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');

// Drop-in plugin for any ELIZA character
export const character = {
  name: 'MyAgent',
  plugins: [
    agentIdPlugin({
      connection,
      verifyBeforeAction: true,   // auto-verify counterparties
      minReputationScore: 500,    // reject below threshold
      rejectUnverified:   true,
    }),
  ],
  // ... rest of your character config
};`;

const ELIZA_HOOK_CODE = `// Access credentials inside any action handler
export const transferAction: Action = {
  name: 'TRANSFER_FUNDS',
  async handler(runtime: IAgentRuntime, message, state) {
    // agentIdPlugin pre-populates runtime.agentID before handler runs
    const credential = await runtime.agentID.getCredential(message.sender);

    if (credential.reputationScore < 700) {
      throw new Error('Counterparty reputation too low');
    }

    // proceed with transfer...
  },
};`;

const SDK_FULL_CODE = `import { AgentIDClient, AgentVerifyResult } from '@agentid/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

const client = new AgentIDClient({
  connection: new Connection('https://api.devnet.solana.com'),
  programId:  new PublicKey('AgentIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
});

// ── Verify ──────────────────────────────────────────
const result: AgentVerifyResult = await client.verifyAgent('8xKZT...mQ9P');

// ── Register ────────────────────────────────────────
const tx = await client.registerAgent({ wallet, metadata, spendingLimits });

// ── Update metadata ─────────────────────────────────
await client.updateMetadata(wallet, { endpoint: 'https://new.example.com' });

// ── Pause / unpause ──────────────────────────────────
await client.pauseAgent(wallet);
await client.resumeAgent(wallet);

// ── Score history ────────────────────────────────────
const history = await client.getScoreHistory('8xKZT...mQ9P', { days: 30 });`;

const INDIA_CODE = `import { AgentIDClient, IndiaComplianceModule } from '@agentid/sdk';

// Enable DPDP Act 2023 compliance module
const client = new AgentIDClient({
  connection,
  compliance: new IndiaComplianceModule({
    // Data Protection Officer contact
    dpoContact: 'dpo@youragent.com',
    // Enforce consent-based data processing
    requireExplicitConsent: true,
    // RBI spending limits for INR-denominated txns
    rbiDailyLimitINR: 200000,
    // Auto-report to CERT-In on anomaly detection
    certInReporting: true,
  }),
});

// Compliance check before any data-sharing action
const ok = await client.compliance.checkDataSharingPermission({
  agentWallet: '8xKZT...mQ9P',
  dataCategory: 'financial',
});

console.log(ok.permitted);   // true / false
console.log(ok.basis);       // "explicit_consent" | "legitimate_interest"`;

export default function Docs() {
  const [time, setTime] = useState("");
  const [activeSection, setActiveSection] = useState("quickstart");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-GB", { hour12: false }) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-background">
      {/* Page header breadcrumb */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between py-3">
            <span className="label-meta">AgentID / Developer Docs</span>
            <span className="font-mono text-[11px] text-muted-foreground/40">{time}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex gap-16 pt-10 pb-32">

          {/* ── Left Sidebar ── */}
          <aside className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-24">
              <p className="label-meta mb-5">Sections</p>
              <nav className="space-y-0.5">
                {NAV.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`group flex items-center gap-2.5 w-full text-left py-1.5 transition-colors ${
                      activeSection === item.id
                        ? "text-green"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`font-mono text-[9px] transition-colors shrink-0 ${
                      activeSection === item.id ? "text-green/60" : "text-muted-foreground/30"
                    }`}>{item.tag}</span>
                    <ChevronRight className={`w-2.5 h-2.5 shrink-0 transition-all ${
                      activeSection === item.id ? "opacity-100 translate-x-0.5" : "opacity-0"
                    }`} />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-10 pt-6 border-t border-border space-y-2.5">
                <p className="label-meta">Resources</p>
                {[
                  { label: "GitHub", href: "#" },
                  { label: "npm registry", href: "#" },
                  { label: "Changelog", href: "#" },
                  { label: "Discord", href: "#" },
                ].map((r) => (
                  <a key={r.label} href={r.href}
                    className="block text-[11px] text-muted-foreground hover:text-green transition-colors link-underline">
                    {r.label} →
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 min-w-0">

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pb-14 border-b border-border"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-green/25 text-green font-mono text-[10px] uppercase tracking-widest mb-6">
                <div className="w-1.5 h-1.5 bg-green animate-pulse" />
                SDK v0.1 · Solana devnet
              </div>
              <h1 className="font-serif italic text-5xl sm:text-6xl leading-tight tracking-[-0.02em] mb-4">
                Developer Docs
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                Integrate agent identity, on-chain credentials, and trust verification
                into your AI stack — ELIZA plugins, TypeScript SDK, and Anchor CPI.
              </p>
            </motion.div>

            {/* ── 01 Quick Start ── */}
            <DocSection id="quickstart" tag="01 · Getting Started" title="Quick Start">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                Install the SDK and verify your first agent in under two minutes.
                Works with Node 18+, Bun, and Deno.
              </p>
              <CodeBlock label="terminal" code={QUICKSTART_INSTALL} lang="bash" />
              <p className="text-xs text-muted-foreground/50 font-mono mt-3 mb-6">
                Includes <span className="text-foreground/50">@agentid/sdk</span> · <span className="text-foreground/50">@agentid/eliza-plugin</span> · <span className="text-foreground/50">@agentid/idl</span>
              </p>
              <CodeBlock label="quickstart.ts" code={QUICKSTART_CODE} lang="ts" />
            </DocSection>

            {/* ── 02 Register Agent ── */}
            <DocSection id="register-agent" tag="02 · Identity" title="Register Agent">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                Register a new on-chain agent identity. This mints a Credential NFT to
                the owner wallet and writes the agent PDA to the AgentID program.
              </p>
              <CodeBlock label="register.ts" code={REGISTER_CODE} lang="ts" />
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                {[
                  { k: "name", v: "string · required" },
                  { k: "framework", v: "eliza | custom" },
                  { k: "spendingLimits", v: "perTx · daily" },
                  { k: "contactEmail", v: "string · optional" },
                ].map((r) => (
                  <div key={r.k} className="bg-background px-4 py-3">
                    <p className="font-mono text-[10px] text-green mb-0.5">{r.k}</p>
                    <p className="text-[11px] text-muted-foreground">{r.v}</p>
                  </div>
                ))}
              </div>
            </DocSection>

            {/* ── 03 Verify Agent ── */}
            <DocSection id="verify-agent" tag="03 · Verification" title="Verify Agent">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                Verify any agent's credential and on-chain proof in a single call.
                Returns the full <code className="font-mono text-xs text-green bg-secondary/40 px-1.5 py-0.5">AgentVerifyResult</code> object.
              </p>
              <CodeBlock label="verify.ts" code={VERIFY_CODE} lang="ts" />
            </DocSection>

            {/* ── 04 Reputation Score ── */}
            <DocSection id="reputation-score" tag="04 · Trust" title="Reputation Score">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                Each agent carries a live on-chain reputation score (0–1000). Scores
                increase through successful interactions and decrease through disputes.
              </p>
              <CodeBlock label="reputation.ts" code={REPUTATION_CODE} lang="ts" />
              <div className="mt-6 space-y-px">
                {[
                  { range: "900–1000", tier: "Platinum", color: "hsl(var(--purple-accent))" },
                  { range: "750–899",  tier: "Gold",     color: "hsl(var(--amber))" },
                  { range: "500–749",  tier: "Silver",   color: "hsl(var(--foreground) / 0.5)" },
                  { range: "200–499",  tier: "Bronze",   color: "hsl(38 70% 40%)" },
                  { range: "0–199",    tier: "Unverified", color: "hsl(var(--destructive))" },
                ].map((t) => (
                  <div key={t.tier} className="flex items-center justify-between border border-border px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                    <span className="font-mono text-[11px]" style={{ color: t.color }}>{t.tier}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{t.range}</span>
                  </div>
                ))}
              </div>
            </DocSection>

            {/* ── 05 CPI Integration ── */}
            <DocSection id="cpi-integration" tag="05 · On-Chain" title="CPI Integration">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                Gate your Solana program on AgentID credentials using Anchor CPI.
                Call <code className="font-mono text-xs text-green bg-secondary/40 px-1.5 py-0.5">verify_agent</code> to
                read the credential PDA and assert reputation thresholds before any instruction.
              </p>
              <CodeBlock label="verify_agent.rs" code={CPI_RUST_CODE} lang="rust" />
            </DocSection>

            {/* ── 06 ELIZA Plugin ── */}
            <DocSection id="eliza-plugin" tag="06 · Framework" title="ELIZA Plugin">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                Drop <code className="font-mono text-xs text-green bg-secondary/40 px-1.5 py-0.5">agentIdPlugin</code> into
                your ELIZA character config. It automatically verifies counterparty agents
                before any action handler is invoked.
              </p>
              <CodeBlock label="character.ts" code={ELIZA_CODE} lang="ts" />
              <p className="text-xs text-muted-foreground/50 mt-6 mb-2 font-mono uppercase tracking-widest">Inside action handlers</p>
              <CodeBlock label="transfer-action.ts" code={ELIZA_HOOK_CODE} lang="ts" />
            </DocSection>

            {/* ── 07 TypeScript SDK ── */}
            <DocSection id="typescript-sdk" tag="07 · SDK Reference" title="TypeScript SDK">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                Full API surface of <code className="font-mono text-xs text-green bg-secondary/40 px-1.5 py-0.5">@agentid/sdk</code>.
                All methods are fully typed and return typed result objects.
              </p>
              <CodeBlock label="sdk-reference.ts" code={SDK_FULL_CODE} lang="ts" />
              <div className="mt-8 space-y-0">
                {[
                  { method: "verifyAgent(address)",        returns: "AgentVerifyResult",  desc: "Fetch credential + reputation" },
                  { method: "registerAgent(opts)",         returns: "RegisterTxResult",   desc: "Mint credential NFT on-chain" },
                  { method: "updateMetadata(wallet, meta)", returns: "TransactionId",     desc: "Update agent metadata PDA" },
                  { method: "pauseAgent(wallet)",          returns: "TransactionId",      desc: "Pause agent activity" },
                  { method: "getScoreHistory(addr, opts)", returns: "ScoreHistory[]",     desc: "Fetch historical reputation" },
                ].map((row) => (
                  <div key={row.method} className="grid grid-cols-[220px_160px_1fr] gap-4 items-baseline py-3 border-b border-border/40 last:border-0">
                    <span className="font-mono text-[11px] text-foreground/80">{row.method}</span>
                    <span className="font-mono text-[11px] text-amber">{row.returns}</span>
                    <span className="text-xs text-muted-foreground">{row.desc}</span>
                  </div>
                ))}
              </div>
            </DocSection>

            {/* ── 08 India Compliance ── */}
            <DocSection id="india-compliance" tag="08 · Compliance" title="India Compliance">
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-2">
                The <code className="font-mono text-xs text-green bg-secondary/40 px-1.5 py-0.5">IndiaComplianceModule</code> enforces
                DPDP Act 2023, RBI AI guidelines, and CERT-In reporting out of the box.
                Required for any agent operating in Indian jurisdiction.
              </p>
              <CodeBlock label="india-compliance.ts" code={INDIA_CODE} lang="ts" />
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
                {[
                  { label: "DPDP Act 2023", desc: "Consent management and data principal rights" },
                  { label: "RBI Guidelines", desc: "Spending caps and transaction reporting" },
                  { label: "CERT-In", desc: "Automated incident reporting within 6 hours" },
                ].map((c) => (
                  <div key={c.label} className="bg-background px-5 py-4">
                    <p className="font-mono text-xs text-green mb-1.5">{c.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            </DocSection>

          </main>
        </div>
      </div>
    </div>
  );
}
