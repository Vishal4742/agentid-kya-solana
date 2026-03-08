import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Globe, Code2, Layers, Activity,
  Star, Shield, Zap, ArrowRight, ChevronRight, Clock, AlertTriangle, FileX
} from "lucide-react";
import { MOCK_AGENTS } from "@/data/mockAgents";
import AsciiCanvas from "@/components/AsciiCanvas";
import ScrambleText from "@/components/ScrambleText";
import CornerTelemetry from "@/components/CornerTelemetry";
import OnboardingModal from "@/components/OnboardingModal";
import { useEffect, useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.55, ease: [0.19, 1, 0.22, 1] } }),
};

function useClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB", { hour12: false }) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const JOURNAL_ROWS = [
  {
    date: "KYA·L1",
    title: "Soul-bound Identity",
    preview: "Compressed cNFT credential on Solana. Non-transferable. Contains agent name, framework, capabilities and owner wallet.",
    href: "/register",
  },
  {
    date: "KYA·L2",
    title: "On-chain Reputation",
    preview: "Aggregated score 0–1000 from tx history, uptime pings and peer ratings. ZK-attested. Decays without activity.",
    href: "/agents",
  },
  {
    date: "KYA·L3",
    title: "Spending Guards",
    preview: "Programmable USDC limits enforced by a Solana program. Per-tx cap, daily limit, emergency pause by owner.",
    href: "/dashboard",
  },
  {
    date: "KYA·L4",
    title: "Verify Any Agent",
    preview: "One-call SDK lookup returns credential + reputation + spending limits. ELIZA / AutoGen / CrewAI plugins.",
    href: "/verify",
  },
];

export default function Index() {
  const time = useClock();

  return (
    <div className="bg-background text-foreground">
      <OnboardingModal />

      {/* ═══════════════════════════════════════════
          HERO — full viewport, reference layout
      ═══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden" style={{ height: "100vh" }}>

        {/* ASCII canvas — full bleed background */}
        <div className="absolute inset-0 z-0">
          <AsciiCanvas />
        </div>

        {/* Gradient vignette from bottom */}
        <div className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)/0.55) 45%, transparent 100%)" }} />

        {/* ── Corner labels (reference: S / K / 0 / 8) → A / I / 0 / 8 ── */}
        <div className="absolute top-[var(--nav-h,4rem)] left-6 z-30 pointer-events-none hidden lg:block">
          <span className="font-sans font-semibold text-4xl leading-none text-foreground/60 select-none">A</span>
        </div>
        <div className="absolute top-[var(--nav-h,4rem)] right-6 z-30 pointer-events-none hidden lg:block">
          <span className="font-sans font-semibold text-4xl leading-none text-foreground/60 select-none">I</span>
        </div>
        <div className="absolute bottom-6 left-6 z-30 pointer-events-none hidden lg:block">
          <span className="font-sans font-semibold text-4xl leading-none text-foreground/20 select-none">0</span>
        </div>
        <div className="absolute bottom-6 right-6 z-30 pointer-events-none hidden lg:block">
          <span className="font-sans font-semibold text-4xl leading-none text-foreground/20 select-none">8</span>
        </div>

        {/* ── Header meta bar ── */}
        <div className="absolute top-[var(--nav-h,4rem)] left-0 right-0 z-20 px-16 hidden lg:flex items-baseline justify-between border-b border-border/30 py-3 pointer-events-none">
          <span className="label-meta">Index / AgentID Protocol</span>
          <span className="font-mono text-[11px] text-muted-foreground/60">{time}</span>
        </div>

        {/* ── Main content: journal list ── */}
        <div className="relative z-20 flex flex-col h-full pt-[calc(var(--nav-h,4rem)+3.5rem)] pb-16 px-6 lg:px-16">

          <div className="mb-8 lg:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-green/25 text-green text-[11px] font-mono uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-green animate-pulse" />
              KYA Protocol · v0.1 devnet
            </div>
          </div>

          {/* Hero headline */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.6 }}
            className="mb-10 lg:mb-12 max-w-3xl">
            <ScrambleText
              as="h1"
              text="Every AI agent needs an identity."
              className="font-serif italic text-5xl sm:text-6xl lg:text-7xl leading-[1.0] tracking-[-0.02em] text-foreground"
              autoPlay
              autoPlayDelay={500}
            />
            <p className="mt-4 font-mono text-xs text-muted-foreground/60 tracking-wide">
              Soul-bound cNFT · On-chain reputation · Spending guards · Solana devnet
            </p>
          </motion.div>

          {/* Journal rows — the reference pattern */}
          <div className="flex-1 flex flex-col justify-start max-w-4xl w-full">
            {JOURNAL_ROWS.map((row, i) => (
              <motion.div
                key={row.title}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i}
              >
                <Link
                  to={row.href}
                  className="group grid grid-cols-[90px_1fr] lg:grid-cols-[110px_1fr_280px] items-baseline py-4 border-b border-border/40 hover:border-foreground/30 transition-colors duration-300"
                >
                  {/* Date / layer label */}
                  <span className="font-mono text-[11px] text-muted-foreground/50 uppercase tracking-widest">{row.date}</span>

                  {/* Serif italic title */}
                  <span className="font-serif italic text-2xl lg:text-3xl leading-tight text-foreground tracking-[-0.01em]
                    transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
                    group-hover:translate-x-2.5">
                    {row.title}
                  </span>

                  {/* Monospace preview — fades in on hover */}
                  <span className="hidden lg:block font-mono text-[11px] text-muted-foreground/50 leading-relaxed text-right
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300 pl-6">
                    {row.preview}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.5 }}
            className="flex flex-wrap items-center gap-4 mt-8">
            <Link to="/register" className="btn-primary">
              <Zap className="w-4 h-4" /> Register Agent
            </Link>
            <Link to="/agent/agent-001" className="btn-outline">
              View Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-5 ml-auto hidden lg:flex">
              {[
                { value: "1,247", label: "agents" },
                { value: "764", label: "avg rep" },
                { value: "$14M", label: "tx value" },
              ].map(s => (
                <div key={s.label} className="text-right">
                  <div className="font-mono text-sm text-green leading-none">{s.value}</div>
                  <div className="label-meta mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PROBLEM — hairline editorial rows
      ═══════════════════════════════════════════ */}
      <section className="py-24 border-t border-border max-w-5xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="mb-14">
          <span className="label-meta">The Problem</span>
          <h2 className="font-serif italic text-4xl sm:text-5xl mt-3 leading-tight tracking-[-0.02em]">
            The AI Agent Trust Gap
          </h2>
          <p className="text-muted-foreground text-sm mt-4 max-w-xl leading-relaxed">
            As AI agents gain the power to trade, pay, and publish autonomously — we have no way to verify who they are.
          </p>
        </motion.div>

        <div className="divide-y divide-border">
          {[
            {
              icon: FileX, tag: "No Identity",
              desc: "Any script can call itself an AI agent. No verifiable credential, no accountability, no way to distinguish a trusted agent from a malicious one.",
              stat: "0% of AI agents have on-chain identity",
              color: "text-destructive",
            },
            {
              icon: AlertTriangle, tag: "No Reputation",
              desc: "There's no score, no history, no track record. DeFi protocols, DAOs and employers cannot assess agent reliability before granting access.",
              stat: "$2.1B lost to rogue automation in 2024",
              color: "text-amber",
            },
            {
              icon: Clock, tag: "No Audit Trail",
              desc: "When an AI agent causes a financial loss or publishes harmful content, there's no immutable log to reconstruct what happened or who authorised it.",
              stat: "72% of AI incidents lack traceable logs",
              color: "text-blue-accent",
            },
          ].map((p, i) => (
            <motion.div key={p.tag} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="group grid grid-cols-[1fr_auto] gap-6 py-7 hover:border-foreground/20 transition-colors">
              <div>
                <div className={`label-meta mb-2 ${p.color}`}>{p.tag}</div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{p.desc}</p>
              </div>
              <div className={`font-mono text-xs ${p.color} self-start text-right shrink-0 max-w-[200px] leading-relaxed`}>
                {p.stat}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PROTOCOL STACK — numbered journal rows
      ═══════════════════════════════════════════ */}
      <section className="py-24 border-t border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="mb-14">
            <span className="label-meta">Protocol</span>
            <h2 className="font-serif italic text-4xl sm:text-5xl mt-3 leading-tight tracking-[-0.02em]">
              The AgentID Stack
            </h2>
          </motion.div>

          <div className="divide-y divide-border">
            {[
              { layer: "L1", label: "Identity Layer", color: "text-green", tags: ["cNFT", "Metaplex Bubblegum"], desc: "Soul-bound compressed NFT credential minted on Solana. Contains agent name, framework, capabilities and owner wallet. Non-transferable." },
              { layer: "L2", label: "Reputation Layer", color: "text-blue-accent", tags: ["Reputation Oracle", "ZK Attestation"], desc: "Aggregated on-chain score 0–1000 based on transaction history, uptime pings, and peer ratings. Decays over time without activity." },
              { layer: "L3", label: "Payment Rails", color: "text-purple-accent", tags: ["USDC", "SPL Token", "Spending Guard"], desc: "Programmable USDC spending limits enforced by a Solana program. Per-transaction cap, daily limit, and emergency pause by owner." },
              { layer: "L4", label: "SDK & Plugins", color: "text-amber", tags: ["TypeScript SDK", "ELIZA Plugin"], desc: "Drop-in plugins for ELIZA, AutoGen, CrewAI, LangGraph. One-line credential verification before any action. Open-source Apache 2.0." },
            ].map((item, i) => (
              <motion.div key={item.layer} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="group grid grid-cols-[60px_1fr_auto] gap-4 py-6 items-baseline hover:opacity-80 transition-opacity">
                <span className={`font-mono text-[11px] uppercase tracking-widest ${item.color}`}>{item.layer}</span>
                <div>
                  <span className="font-serif italic text-2xl tracking-[-0.01em] group-hover:translate-x-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]">{item.label}</span>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xl">{item.desc}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {item.tags.map(t => (
                    <span key={t} className="font-mono text-[10px] border border-border px-1.5 py-0.5 text-muted-foreground">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          LIVE AGENTS — journal card grid
      ═══════════════════════════════════════════ */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="flex items-baseline justify-between mb-12 border-b border-border pb-4">
          <div>
            <span className="label-meta">Registry</span>
            <h2 className="font-serif italic text-4xl mt-2 tracking-[-0.02em]">Live Registered Agents</h2>
          </div>
          <Link to="/agents" className="link-underline text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </motion.div>

        <div className="divide-y divide-border">
          {MOCK_AGENTS.slice(0, 4).map((agent, i) => (
            <motion.div key={agent.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
              <Link to={`/agent/${agent.id}`}
                className="group grid grid-cols-[1fr_auto] items-center py-5 hover:border-foreground/20 transition-colors">
                <div className="flex items-baseline gap-5">
                  <span className="font-mono text-[11px] text-muted-foreground/50 w-20 shrink-0 hidden sm:block">
                    {agent.id.replace("agent-", "").padStart(3, "0")}
                  </span>
                  <div>
                    <span className="font-serif italic text-xl group-hover:translate-x-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]">
                      {agent.name}
                    </span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground/50">{agent.framework}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-px border ${
                        agent.verifiedLevel === "Audited" ? "border-green/30 text-green" :
                        agent.verifiedLevel === "KYB" ? "border-blue-accent/30 text-blue-accent" :
                        "border-border text-muted-foreground"
                      }`}>{agent.verifiedLevel}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl text-green">{agent.reputationScore}</div>
                  <div className="label-meta">rep score</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          COMPARISON TABLE — minimal
      ═══════════════════════════════════════════ */}
      <section className="py-24 border-t border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="mb-14">
            <span className="label-meta">Comparison</span>
            <h2 className="font-serif italic text-4xl sm:text-5xl mt-3 leading-tight tracking-[-0.02em]">
              How AgentID Compares
            </h2>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-6 font-mono text-[11px] text-muted-foreground uppercase tracking-widest w-48">Feature</th>
                  {["AgentID", "Trulioo DAP", "Visa TAP", "ERC-8004", "AgentFacts"].map((col, ci) => (
                    <th key={col} className={`text-center py-3 px-3 font-mono text-[11px] uppercase tracking-widest ${ci === 0 ? "text-green" : "text-muted-foreground/50"}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { feature: "On-chain credential", vals: [true, false, false, true, false] },
                  { feature: "Soul-bound cNFT", vals: [true, false, false, false, false] },
                  { feature: "Reputation score", vals: [true, false, false, false, true] },
                  { feature: "Spending limits", vals: [true, true, true, false, false] },
                  { feature: "India TDS compliance", vals: [true, false, false, false, false] },
                  { feature: "Open-source SDK", vals: [true, false, false, true, true] },
                  { feature: "Permissionless mint", vals: [true, false, false, true, false] },
                  { feature: "Solana-native", vals: [true, false, false, false, false] },
                ].map((row) => (
                  <tr key={row.feature} className="group hover:bg-secondary/20 transition-colors">
                    <td className="py-3 pr-6 text-muted-foreground text-xs font-mono">{row.feature}</td>
                    {row.vals.map((v, vi) => (
                      <td key={vi} className="text-center py-3 px-3">
                        {v
                          ? <span className={`font-mono text-xs ${vi === 0 ? "text-green" : "text-muted-foreground/40"}`}>✓</span>
                          : <span className="font-mono text-xs text-border/50">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          INDIA SPOTLIGHT
      ═══════════════════════════════════════════ */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <span className="label-meta text-amber">India Use Case</span>
            <h2 className="font-serif italic text-4xl mt-3 leading-tight tracking-[-0.02em]">
              TDS Compliance for<br />AI-Powered Businesses
            </h2>
            <p className="text-sm text-muted-foreground mt-5 mb-8 leading-relaxed">
              Indian businesses using AI agents for payments and invoicing face a compliance gap:
              TDS deduction at source is legally required, but no existing AI agent framework supports it natively.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "GSTIN verified on-chain via CA partner nodes",
                "Auto TDS rate calculation (2% / 10%) by service category",
                "Immutable deduction receipt minted as cNFT",
                "Quarterly ITD portal export in JSON + PDF",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="text-amber mt-0.5 shrink-0 font-mono text-xs">→</span>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Link to="/register" className="btn-outline border-amber/40 text-amber hover:border-amber hover:text-amber">
              Register Indian Business Agent <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="border border-amber/20 p-6">
            <div className="flex items-center gap-2 mb-5 border-b border-border/40 pb-4">
              <div className="w-1.5 h-1.5 bg-amber animate-pulse" />
              <span className="label-meta text-amber">Live TDS Calculation</span>
            </div>
            <div className="space-y-0 font-mono text-xs divide-y divide-border/40">
              {[
                { k: "Service Category", v: "IT Services", vc: "" },
                { k: "Invoice Amount", v: "₹1,00,000", vc: "" },
                { k: "TDS Rate (Sec 194J)", v: "10%", vc: "text-amber" },
                { k: "TDS Deducted", v: "₹10,000", vc: "text-amber" },
                { k: "Net Payable", v: "₹90,000", vc: "text-green" },
              ].map(r => (
                <div key={r.k} className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">{r.k}</span>
                  <span className={r.vc || "text-foreground"}>{r.v}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border/40 font-mono text-[10px] text-green">
              ✓ TDS receipt minted · tx: 5vKj2...nT1r
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          MILESTONES — vertical journal list
      ═══════════════════════════════════════════ */}
      <section className="py-24 border-t border-b border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="mb-14">
            <span className="label-meta">Roadmap</span>
            <h2 className="font-serif italic text-4xl sm:text-5xl mt-3 leading-tight tracking-[-0.02em]">
              Roadmap
            </h2>
            <p className="text-muted-foreground text-sm mt-2">5-week build plan</p>
          </motion.div>

          <div className="divide-y divide-border">
            {[
              { week: "W1", title: "Identity Layer", desc: "Anchor program for cNFT minting via Metaplex Bubblegum. ELIZA plugin v0.1. DevNet deployment.", status: "complete" },
              { week: "W2", title: "Reputation Oracle", desc: "On-chain scoring program. Transaction crawler for Solana mainnet. Decay mechanism.", status: "complete" },
              { week: "W3", title: "Payment Guard Program", desc: "Spending limits enforced on-chain. Emergency pause instruction. USDC integration tests.", status: "active" },
              { week: "W4", title: "India Compliance Module", desc: "GSTIN verification oracle. TDS auto-calculation. CA partner node contracts.", status: "upcoming" },
              { week: "W5", title: "SDK & Mainnet Launch", desc: "TypeScript SDK v1.0. AutoGen / CrewAI / LangGraph plugins. Mainnet deployment + audit.", status: "upcoming" },
            ].map((m, i) => (
              <motion.div key={m.week} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="group grid grid-cols-[60px_1fr_80px] items-baseline gap-4 py-5 hover:bg-secondary/10 transition-colors px-2 -mx-2">
                <span className={`font-mono text-[11px] uppercase tracking-widest ${
                  m.status === "complete" ? "text-green" : m.status === "active" ? "text-amber" : "text-muted-foreground/40"
                }`}>{m.week}</span>
                <div>
                  <span className="font-serif italic text-xl group-hover:translate-x-1.5 inline-block transition-transform duration-300">{m.title}</span>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                </div>
                <span className={`font-mono text-[10px] text-right uppercase tracking-wider ${
                  m.status === "complete" ? "text-green" : m.status === "active" ? "text-amber" : "text-muted-foreground/30"
                }`}>
                  {m.status === "complete" ? "Done" : m.status === "active" ? "Active" : "Soon"}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA
      ═══════════════════════════════════════════ */}
      <section className="py-32 max-w-5xl mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <span className="label-meta">Get Started</span>
          <h2 className="font-serif italic text-5xl sm:text-6xl mt-4 mb-6 leading-tight tracking-[-0.02em]">
            Give your agents<br />an identity.
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mb-10 leading-relaxed">
            AgentID is open-source and permissionless. No whitelisting, no KYC for developers.
            Connect a Solana wallet and mint your first credential in under 2 minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary">
              <Zap className="w-4 h-4" /> Get Started — It's Free
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-outline">
              <Activity className="w-4 h-4" /> View on GitHub
            </a>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════ */}
      <footer className="border-t border-border py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-mono text-xs text-muted-foreground/40 uppercase tracking-widest">AgentID · KYA Protocol · Solana</span>
          <div className="flex items-center gap-6">
            {[
              { label: "Verify", href: "/verify" },
              { label: "Register", href: "/register" },
              { label: "Dashboard", href: "/dashboard" },
              { label: "GitHub", href: "https://github.com" },
            ].map(({ label, href }) => (
              <Link key={label} to={href} className="link-underline text-xs text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/30">© 2025 Apache 2.0</span>
        </div>
      </footer>
    </div>
  );
}
