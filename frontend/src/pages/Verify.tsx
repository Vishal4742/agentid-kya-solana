import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAllAgents } from "@/hooks/useAgents";
import { truncateWallet } from "@/data/mockAgents";
import { Search, Shield, CheckCircle2, XCircle, Activity, TrendingUp, Zap, Copy, Code2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const EMBED_SNIPPET = `<script src="https://cdn.agentid.xyz/widget.js"></script>
<div
  data-agentid-verify
  data-address="YOUR_AGENT_WALLET"
  data-theme="dark"
></div>`;

export default function Verify() {
  const { agents } = useAllAgents();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<typeof agents[0] | null | "not-found">(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    await new Promise((r) => setTimeout(r, 400));
    const q = query.trim().toLowerCase();
    const found = agents.find(
      (a) => a.id === query.trim() ||
        a.ownerWallet.toLowerCase() === q ||
        a.name.toLowerCase().includes(q)
    );
    setResult(found ?? "not-found");
    setSearching(false);
  };

  return (
    <div className="min-h-screen bg-background px-6 lg:px-10 pb-16">
      <div className="max-w-3xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex justify-between items-baseline border-b border-border pb-3 mb-12 pt-10">
          <span className="label-meta">Index / Verify Agent</span>
          <span className="label-meta flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Instant Verification
          </span>
        </div>

        {/* ── Title ── */}
        <div className="mb-10">
          <h1 className="display-serif text-4xl sm:text-5xl text-foreground mb-4 leading-tight">
            Verify Any<br />AI Agent.
          </h1>
          <p className="text-sm text-muted-foreground">Paste a wallet address, agent ID, or agent name.</p>
        </div>

        {/* ── Search ── */}
        <div className="flex items-end gap-6 mb-3 border-b border-border pb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Wallet address, agent ID, or name…"
              className="w-full pl-6 pr-4 py-2 bg-transparent border-0 text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
            />
          </div>
          <button onClick={handleSearch} disabled={searching || !query.trim()}
            className="btn-primary disabled:opacity-40 shrink-0">
            {searching ? <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Verify"}
          </button>
        </div>

        {/* Demo agents — show first 3 real on-chain agents */}
        {agents.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 mb-12">
            <span className="label-meta mr-2 self-center">Try:</span>
            {agents.slice(0, 3).map((a) => (
              <button key={a.id} onClick={() => setQuery(a.name)}
                className="link-underline font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
                {a.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Result ── */}
        <AnimatePresence mode="wait">
          {result && result !== "not-found" && (
            <motion.div key="found" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-12">
              {/* Verified header */}
              <div className="flex items-center gap-3 py-4 border-b border-green/20 mb-0">
                <CheckCircle2 className="w-4 h-4 text-green" />
                <p className="text-sm text-green font-medium">Verified AgentID Credential · Solana devnet</p>
                <div className={`ml-auto px-2.5 py-1 border text-xs font-mono ${result.verifiedLevel === "Audited" ? "border-green/30 text-green" :
                    result.verifiedLevel === "KYB" ? "border-blue-accent/30 text-blue-accent" :
                      "border-border text-muted-foreground"
                  }`}>{result.verifiedLevel}</div>
              </div>

              {/* Agent name — journal style */}
              <div className="py-6 border-b border-border">
                <h2 className="display-serif text-4xl text-foreground mb-3">{result.name}</h2>
                <div className="flex gap-3 flex-wrap">
                  <span className="label-meta border border-green/20 px-2 py-1 text-green">{result.framework}</span>
                  <span className="label-meta border border-blue-accent/20 px-2 py-1 text-blue-accent">{result.llmModel}</span>
                </div>
              </div>

              {/* Data rows */}
              <div className="space-y-0 mb-6">
                {[
                  { label: "Agent ID", value: result.id, mono: true },
                  { label: "Owner Wallet", value: truncateWallet(result.ownerWallet), mono: true },
                  { label: "Reputation Score", value: `${result.reputationScore} / 1000`, color: result.reputationScore > 700 ? "green" as const : "amber" as const },
                  { label: "Last Active", value: new Date(result.lastActive).toLocaleString() },
                  { label: "Total Tx Value", value: result.totalTxValue, color: "green" as const, mono: true },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-baseline py-3 border-b border-border last:border-0">
                    <span className="label-meta">{item.label}</span>
                    <span className={`text-sm ${item.mono ? "font-mono" : ""} ${item.color === "green" ? "text-green font-semibold" :
                        item.color === "amber" ? "text-amber font-semibold" : "text-foreground"
                      }`}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Capabilities */}
              <div className="mb-6">
                <p className="label-meta mb-3">Authorised Capabilities</p>
                <div className="flex flex-wrap gap-3">
                  {result.capabilities.defiTrading && (
                    <span className="flex items-center gap-1.5 label-meta border border-green/20 px-2.5 py-1.5 text-green">
                      <TrendingUp className="w-3 h-3" /> DeFi Trading
                    </span>
                  )}
                  {result.capabilities.paymentSending && (
                    <span className="flex items-center gap-1.5 label-meta border border-blue-accent/20 px-2.5 py-1.5 text-blue-accent">
                      <Zap className="w-3 h-3" /> Payments · Max ${result.capabilities.maxUsdcTx.toLocaleString()}
                    </span>
                  )}
                  {result.capabilities.contentPublishing && (
                    <span className="flex items-center gap-1.5 label-meta border border-purple-accent/20 px-2.5 py-1.5 text-purple-accent">
                      <Activity className="w-3 h-3" /> Content Publishing
                    </span>
                  )}
                  {result.capabilities.dataAnalysis && (
                    <span className="flex items-center gap-1.5 label-meta border border-border px-2.5 py-1.5 text-muted-foreground">
                      <Shield className="w-3 h-3" /> Data Analysis
                    </span>
                  )}
                </div>
              </div>

              {result.indiaCompliance && (
                <div className="py-4 border-t border-amber/20 mb-6">
                  <p className="label-meta text-amber mb-2">India Compliance Verified</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    GSTIN: <span className="text-foreground">{result.indiaCompliance.gstin}</span>
                    <span className="mx-3 text-border">·</span>
                    TDS: <span className="text-amber font-bold">{result.indiaCompliance.tdsRate}%</span>
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Link to={`/agent/${result.id}`} className="btn-outline">
                  <ExternalLink className="w-3.5 h-3.5" /> Full Profile
                </Link>
                <button onClick={() => { navigator.clipboard.writeText(result.ownerWallet); toast.success("Copied!"); }}
                  className="btn-ghost">
                  <Copy className="w-3.5 h-3.5" /> Copy Wallet
                </button>
              </div>
            </motion.div>
          )}

          {result === "not-found" && (
            <motion.div key="notfound" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-12 py-6 border-b border-destructive/20">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">No AgentID Credential Found</p>
              </div>
              <p className="text-xs text-muted-foreground mb-4 ml-7">This wallet / ID has no registered AgentID on Solana devnet.</p>
              <Link to="/register" className="ml-7 link-underline text-xs text-green">Mint a credential →</Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Embed Widget ── */}
        <div className="border-t border-border pt-10">
          <div className="flex justify-between items-baseline pb-3 border-b border-border mb-6">
            <p className="label-meta flex items-center gap-2"><Code2 className="w-3 h-3" /> Embed This Widget</p>
            <button onClick={() => { navigator.clipboard.writeText(EMBED_SNIPPET); toast.success("Snippet copied!"); }}
              className="link-underline label-meta hover:text-foreground">Copy snippet</button>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Drop the AgentID verification widget into any DeFi protocol, DAO front-end, or marketplace to verify agents before granting access.
          </p>
          <pre className="text-xs font-mono p-5 bg-secondary border border-border overflow-x-auto text-muted-foreground/70 whitespace-pre">
            {EMBED_SNIPPET}
          </pre>
          <div className="mt-5 flex items-center gap-6">
            {[
              { dot: "green", label: "Supports dark & light themes" },
              { dot: "blue-accent", label: "Zero-dependency embed" },
              { dot: "purple-accent", label: "Apache 2.0" },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-2 label-meta">
                <div className={`w-1 h-1 ${dot === "green" ? "bg-green" : dot === "blue-accent" ? "bg-blue-accent" : "bg-purple-accent"}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
