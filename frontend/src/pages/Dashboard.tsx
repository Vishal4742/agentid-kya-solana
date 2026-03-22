import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useMyAgent } from "@/hooks/useAgents";
import { truncateWallet, formatRelativeTime } from "@/data/mockAgents";
import type { Agent } from "@/data/mockAgents";
import { toast } from "sonner";
import { Shield, Activity, AlertTriangle, Wallet, ExternalLink, Play, Pause, Plus, FileText, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Sk } from "@/components/Skeleton";
import { calculateTDS, generateInvoice, getSectionLabel } from "@/lib/indiaCompliance";
import { useProgram } from "@/hooks/useProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

/* ── Mini gauge ── */
function MiniGauge({ score }: { score: number }) {
  const pct = (score / 1000) * 100;
  const color = score > 700 ? "hsl(var(--green))" : score > 400 ? "hsl(var(--amber))" : "hsl(var(--destructive))";
  const r = 14; const circ = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="3.5" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" />
    </svg>
  );
}

/* ── Skeleton: stats row ── */
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-b border-border mb-0">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`py-6 ${i > 0 ? "border-l border-border pl-6" : ""}`}>
          <Sk className="h-2.5 w-20 mb-3" />
          <Sk className="h-7 w-16 mb-2" />
          <Sk className="h-2 w-28" />
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton: charts ── */
function ChartsSkeleton() {
  return (
    <div className="border-b border-border py-8">
      <Sk className="h-2.5 w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-border divide-y lg:divide-y-0 lg:divide-x divide-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-5">
            <Sk className="h-2.5 w-36 mb-2" />
            <Sk className="h-2 w-24 mb-4" />
            <Sk className="h-[200px] w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Skeleton: agent list ── */
function AgentListSkeleton() {
  return (
    <ul>
      {[0, 1, 2].map((i) => (
        <li key={i} className="group">
          <div className="grid items-center py-5 border-b border-border" style={{ gridTemplateColumns: "96px 1fr auto" }}>
            <Sk className="h-3 w-16" />
            <Sk className={`h-6`} style={{ width: `${40 + i * 12}%` } as React.CSSProperties} />
            <div className="flex items-center gap-2 ml-4">
              <Sk className="w-9 h-9 rounded-full" />
              <Sk className="w-12 h-8" />
              <Sk className="w-8 h-8" />
              <Sk className="w-8 h-8" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Skeleton: treasury ── */
function TreasurySkeleton() {
  return (
    <div className="border-b border-border pb-8 mb-8">
      <Sk className="h-2.5 w-16 mb-6" />
      <Sk className="h-2 w-24 mb-2" />
      <Sk className="h-9 w-32 mb-1" />
      <Sk className="h-2 w-20 mb-6" />
      <div className="space-y-6">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="flex justify-between mb-3">
              <Sk className="h-2.5 w-28" />
              <Sk className="h-2.5 w-16" />
            </div>
            <Sk className="h-2 w-full" />
          </div>
        ))}
      </div>
      <Sk className="h-9 w-full mt-6" />
    </div>
  );
}

/* ── Mock chart data ── */
function generateDays(n: number) {
  const base = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  });
}

const REPUTATION_DATA = generateDays(30).map((date, i) => ({
  date, score: Math.round(720 + Math.sin(i * 0.4) * 40 + i * 1.8 + Math.random() * 15),
}));
const TRANSACTIONS_DATA = generateDays(14).map((date, i) => ({
  date, txns: Math.round(8 + Math.random() * 22 + Math.sin(i * 0.7) * 6),
}));
const VOLUME_DATA = generateDays(30).map((date, i) => ({
  date, usdc: Math.round(1200 + Math.sin(i * 0.5) * 600 + i * 80 + Math.random() * 400),
}));

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(220 18% 6%)",
    border: "1px solid hsl(220 15% 13%)",
    borderRadius: 0,
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
    color: "hsl(210 15% 92%)",
    padding: "6px 10px",
  },
  cursor: { stroke: "hsl(220 15% 20%)", strokeWidth: 1 },
};

/* ── Invoice Modal ── */
function InvoiceModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [grossAmount, setGrossAmount] = useState("");
  const [clientPan, setClientPan] = useState("");
  const amount = parseFloat(grossAmount) || 0;
  const category = agent.indiaCompliance?.serviceCategory ?? "Information Technology Services";
  const tds = calculateTDS(category, amount);

  const handlePdf = () => window.print();
  const handleCopyJson = () => {
    if (!clientPan || amount <= 0) { toast.error("Fill in all fields first"); return; }
    
    // Validate PAN format: 5 letters, 4 digits, 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(clientPan)) {
      toast.error("Invalid PAN format (e.g., ABCDE1234F)");
      return;
    }

    const inv = generateInvoice(agent, amount, clientPan);
    navigator.clipboard.writeText(JSON.stringify(inv, null, 2));
    toast.success("Invoice JSON copied to clipboard");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="bg-card border border-amber/30 w-full max-w-md p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="label-meta text-amber">India Compliance</p>
              <h3 className="font-serif italic text-xl text-foreground mt-1">Generate Invoice — {agent.name}</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Inputs */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="label-meta mb-2 block">Gross Amount (USDC)</label>
              <input
                type="number" min="0" placeholder="0.00"
                value={grossAmount} onChange={(e) => setGrossAmount(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-amber/50 transition-colors"
              />
            </div>
            <div>
              <label className="label-meta mb-2 block">Client PAN</label>
              <input
                type="text" maxLength={10} placeholder="ABCDE1234F"
                value={clientPan} onChange={(e) => setClientPan(e.target.value.toUpperCase())}
                className="w-full bg-background border border-border px-3 py-2 font-mono text-sm text-foreground uppercase focus:outline-none focus:border-amber/50 transition-colors"
              />
            </div>
          </div>

          {/* TDS Breakdown */}
          <div className="border border-amber/20 bg-amber/5 p-4 mb-6 space-y-2">
            <p className="label-meta text-amber mb-3">{getSectionLabel(category)}</p>
            {[
              { label: "Gross Amount", value: `$${amount.toFixed(2)}`, highlight: false },
              { label: `TDS @ ${tds.tdsRate}% (§${tds.section})`, value: `-$${tds.tdsAmount.toFixed(2)}`, highlight: true },
              { label: "Net Payable", value: `$${tds.netPayable.toFixed(2)}`, highlight: false },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="font-mono text-[11px] text-muted-foreground">{row.label}</span>
                <span className={`font-mono text-sm font-bold ${row.highlight ? "text-amber" : "text-foreground"}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handlePdf} className="flex-1 btn-outline text-xs justify-center">
              <FileText className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button onClick={handleCopyJson} className="flex-1 btn-outline text-xs justify-center border-amber/40 text-amber hover:bg-amber/10">
              Copy Invoice JSON
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Dashboard() {
  const { connected, publicKey, connect, connecting } = useWallet();
  const { agent, loading, error: agentError, refetch: refetchAgent } = useMyAgent(publicKey);
  const [pausedAgents, setPausedAgents] = useState<Set<string>>(new Set());
  const [invoiceAgent, setInvoiceAgent] = useState<Agent | null>(null);
  const [spendingLimit, setSpendingLimit] = useState(5000);
  const [perTxLimit, setPerTxLimit] = useState(1000);

  const program = useProgram();
  const [treasuryData, setTreasuryData] = useState<any>(null);
  const [treasuryPda, setTreasuryPda] = useState<PublicKey | null>(null);
  const [treasuryError, setTreasuryError] = useState<string | null>(null);

  // seed per-tx limit from on-chain max_tx_size_usdc when loaded
  useEffect(() => {
    if (agent) setPerTxLimit(Math.min(agent.capabilities.maxUsdcTx, 10000));
  }, [agent]);

  const fetchTreasury = useCallback(async () => {
    if (!agent || !program) return;
    try {
      setTreasuryError(null);
      const identityPda = new PublicKey(agent.id);
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent-treasury"), identityPda.toBuffer()],
        program.programId
      );
      setTreasuryPda(pda);
      // @ts-ignore
      const data = await program.account.agentTreasury.fetch(pda);
      setTreasuryData(data);
      if (data) {
        setSpendingLimit(data.spendingLimitPerDay.toNumber() / 1_000_000);
        setPerTxLimit(data.spendingLimitPerTx.toNumber() / 1_000_000);
        if (data.emergencyPause) {
          setPausedAgents(prev => new Set(prev).add(agent.id));
        }
      }
    } catch (e) {
      setTreasuryData(null);
      setTreasuryError(e instanceof Error ? e.message : String(e));
    }
  }, [agent, program]);

  useEffect(() => {
    fetchTreasury();
  }, [fetchTreasury]);

  const handleInitTreasury = async () => {
    if (!program || !treasuryPda || !agent || !publicKey) return;
    try {
      const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // devnet USDC
      const owner = new PublicKey(publicKey);
      // @ts-ignore
      await program.methods.initializeTreasury(
        new BN(1000 * 1_000_000), // per tx
        new BN(5000 * 1_000_000), // per day
        new BN(10_000 * 1_000_000) // multisig above
      ).accountsStrict({
        treasury: treasuryPda,
        agentIdentity: new PublicKey(agent.id),
        owner,
        usdcMint,
        systemProgram: SystemProgram.programId,
      }).rpc();
      toast.success("Treasury Auto-Initialized!");
      fetchTreasury();
    } catch (e: any) {
      toast.error(`Init Failed: ${e.message}`);
    }
  };

  const handleSaveLimits = async () => {
    if (!program || !treasuryPda || !publicKey) return;
    try {
      const perTxLimitMicro = Math.round(perTxLimit * 1_000_000);
      const spendingLimitMicro = Math.round(spendingLimit * 1_000_000);
      // @ts-ignore
      await program.methods.updateSpendingLimits(
        new BN(perTxLimitMicro),
        new BN(spendingLimitMicro),
        new BN(10_000 * 1_000_000)
      ).accountsStrict({
        treasury: treasuryPda,
        owner: new PublicKey(publicKey),
      }).rpc();
      toast.success("Spending limits updated on-chain");
      fetchTreasury();
    } catch (e: any) {
      toast.error(`Tx Failed: ${e.message}`);
    }
  };

  const togglePauseReal = async (agent: Agent) => {
    if (!program || !publicKey) return toast.error("Wallet not connected");
    const isCurrentlyPaused = pausedAgents.has(agent.id);
    try {
      const identity = new PublicKey(agent.id);
      const [tPda] = PublicKey.findProgramAddressSync([Buffer.from("agent-treasury"), identity.toBuffer()], program.programId);
      // @ts-ignore
      await program.methods.emergencyPause(!isCurrentlyPaused).accountsStrict({
        treasury: tPda,
        owner: new PublicKey(publicKey),
      }).rpc();
      
      const newSet = new Set(pausedAgents);
      if (isCurrentlyPaused) { newSet.delete(agent.id); toast.success(`${agent.name} resumed on-chain`); }
      else { newSet.add(agent.id); toast(`${agent.name} paused on-chain`, { icon: "⏸️" }); }
      setPausedAgents(newSet);
    } catch (e: any) {
      toast.error(`Pause Tx Failed. Has treasury been initialized?`);
    }
  };

  const userAgents = agent ? [agent] : [];

  if (!connected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm w-full text-center">
          <p className="label-meta mb-6">Dashboard · Wallet Gated</p>
          <h2 className="display-serif text-3xl text-foreground mb-4">Connect Your Wallet.</h2>
          <p className="text-sm text-muted-foreground mb-8">Phantom or Solflare required to manage your registered agents.</p>
          <div className="flex gap-3 justify-center">
            {(["phantom", "solflare"] as const).map((p) => (
              <button key={p} onClick={() => connect(p)} disabled={connecting} className="btn-primary disabled:opacity-50">
                {connecting ? <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                {p === "phantom" ? "👻 Phantom" : "☀️ Solflare"}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const togglePause = (agentId: string, name: string) => {
    // Deprecated for the new togglePauseReal
    const newSet = new Set(pausedAgents);
    if (newSet.has(agentId)) { newSet.delete(agentId); toast.success(`${name} resumed`); }
    else { newSet.add(agentId); toast(`${name} paused`, { icon: "⏸️" }); }
    setPausedAgents(newSet);
  };

  const avgReputation = agent ? agent.reputationScore : 0;

  const reputationData = useMemo(() => REPUTATION_DATA, []);
  const transactionData = useMemo(() => TRANSACTIONS_DATA, []);
  const volumeData = useMemo(() => VOLUME_DATA, []);

  return (
    <div className="min-h-screen bg-background px-6 lg:px-10 pb-16">
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="flex justify-between items-baseline border-b border-border pb-3 mb-12 pt-10">
          <span className="label-meta">Index / Owner Dashboard</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green animate-pulse" />
            <span className="font-mono text-[11px] text-green">{truncateWallet(publicKey!)}</span>
          </div>
        </div>

        {/* Stats row */}
        {loading ? <StatsSkeleton /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-b border-border mb-0">
            {[
              { label: "Total Agents", value: `${userAgents.length}`, sub: "registered on devnet", color: "text-green" },
              { label: "Avg Reputation", value: `${avgReputation}`, sub: "out of 1,000", color: "text-blue-accent" },
              { label: "Max Tx Size", value: agent ? `$${agent.capabilities.maxUsdcTx.toLocaleString()}` : "—", sub: "per transaction", color: "text-purple-accent" },
              { label: "Framework", value: agent?.framework ?? "—", sub: agent?.llmModel ?? "not registered", color: "text-amber" },
            ].map((s, i) => (
              <div key={s.label} className={`py-6 ${i > 0 ? "border-l border-border pl-6" : ""}`}>
                <p className="label-meta mb-2">{s.label}</p>
                <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="label-meta mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Analytics charts */}
        {loading ? <ChartsSkeleton /> : (
          <div className="border-b border-border py-8">
            <p className="label-meta mb-6">Analytics · Last 30 days</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-border divide-y lg:divide-y-0 lg:divide-x divide-border">

              <div className="p-5">
                <p className="label-meta mb-1">Reputation Over Time</p>
                <p className="font-mono text-xs text-muted-foreground/50 mb-4">30-day score trend</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={reputationData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "hsl(215 12% 35%)" }} tickLine={false} axisLine={false} interval={7} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "hsl(215 12% 35%)" }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [v, "score"]} />
                    <Line type="monotone" dataKey="score" stroke="hsl(152 100% 50%)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "hsl(152 100% 50%)", strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-5">
                <p className="label-meta mb-1">Daily Transactions</p>
                <p className="font-mono text-xs text-muted-foreground/50 mb-4">14-day count</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={transactionData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={10}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "hsl(215 12% 35%)" }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "hsl(215 12% 35%)" }} tickLine={false} axisLine={false} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [v, "txns"]} />
                    <Bar dataKey="txns" fill="hsl(211 100% 60%)" radius={0} activeBar={{ fill: "hsl(211 100% 70%)" }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-5">
                <p className="label-meta mb-1">USDC Volume</p>
                <p className="font-mono text-xs text-muted-foreground/50 mb-4">30-day cumulative</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={volumeData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(265 89% 67%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(265 89% 67%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "hsl(215 12% 35%)" }} tickLine={false} axisLine={false} interval={7} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "hsl(215 12% 35%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, "USDC"]} />
                    <Area type="monotone" dataKey="usdc" stroke="hsl(265 89% 67%)" strokeWidth={1.5} fill="url(#volumeGrad)" dot={false} activeDot={{ r: 3, fill: "hsl(265 89% 67%)", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-0">
          {/* Agent list */}
          <div className="lg:col-span-2 lg:pr-10 lg:border-r border-border py-10">
            <div className="flex justify-between items-baseline border-b border-border pb-3 mb-0">
              <p className="label-meta">My Agents</p>
              <Link to="/register" className="label-meta link-underline text-green hover:text-green">
                <Plus className="w-3 h-3 inline mr-1" /> Register New
              </Link>
            </div>
            {loading ? <AgentListSkeleton /> : agentError ? (
              <div className="border border-destructive/20 py-12 flex flex-col items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="label-meta text-destructive">Failed to load your agent</p>
                <p className="font-mono text-[10px] text-muted-foreground/50">{agentError.slice(0, 80)}</p>
                <button onClick={refetchAgent} className="btn-outline text-xs mt-2">Retry</button>
              </div>
            ) : userAgents.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-serif italic text-2xl text-foreground/20 mb-3">No agent registered yet.</p>
                <Link to="/register" className="btn-outline text-xs">Register Now →</Link>
              </div>
            ) : (
              <ul>
                {userAgents.map((agent, i) => {
                  const isPaused = pausedAgents.has(agent.id);
                  const previewText = `${agent.framework} · ${agent.llmModel} · ${agent.totalTxValue} · last active ${formatRelativeTime(agent.lastActive)}`;
                  return (
                    <motion.li key={agent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }} className="group">
                      <div
                        className="grid items-center py-5 border-b transition-colors duration-300"
                        style={{ gridTemplateColumns: "96px 1fr auto", borderColor: isPaused ? "hsl(var(--destructive)/0.25)" : "hsl(var(--border))" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isPaused ? "hsl(var(--destructive)/0.5)" : "hsl(var(--foreground)/0.3)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isPaused ? "hsl(var(--destructive)/0.25)" : "hsl(var(--border))"; }}
                      >
                        <span className="font-mono text-[11px] text-muted-foreground/50 select-none">
                          {new Date(agent.registeredAt).toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".")}
                        </span>
                        <div className="min-w-0">
                          <span className={`font-serif italic text-xl transition-transform duration-300 ease-out group-hover:translate-x-2.5 inline-block ${isPaused ? "text-destructive/60" : "text-foreground"}`} style={{ fontFamily: "Georgia, serif" }}>
                            {agent.name}
                            {agent.verifiedLevel !== "Unverified" && (
                              <span className={`ml-2 text-xs not-italic font-sans ${agent.verifiedLevel === "Audited" ? "text-green/50" : "text-blue-accent/50"}`}>
                                · {agent.verifiedLevel}
                              </span>
                            )}
                            {isPaused && <span className="ml-2 text-xs not-italic font-mono text-destructive/60">PAUSED</span>}
                          </span>
                          <div className="font-mono text-[10px] text-muted-foreground/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{previewText}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MiniGauge score={agent.reputationScore} />
                          <div className="text-right mr-1">
                            <div className="font-mono text-xs font-bold text-green">{agent.reputationScore}</div>
                            <div className="label-meta">/1000</div>
                          </div>
                          <Link to={`/agent/${agent.id}`} className="p-1.5 border border-border hover:bg-secondary transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          {agent.indiaCompliance && (
                            <button
                              onClick={() => setInvoiceAgent(agent)}
                              className="p-1.5 border border-amber/40 text-amber hover:bg-amber/10 transition-colors"
                              title="Generate Invoice"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => togglePauseReal(agent)}
                            className={`p-1.5 border transition-colors ${isPaused ? "border-green/40 text-green hover:bg-green/10" : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}>
                            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Right panel */}
          <div className="py-10 lg:pl-10 space-y-0">
            {loading ? <TreasurySkeleton /> : (
              <>
                <div className="border-b border-border pb-8 mb-8">
                  <p className="label-meta mb-6 flex justify-between items-center">
                    Treasury
                    {!treasuryData && (
                      <button onClick={handleInitTreasury} className="text-green text-xs link-underline">
                        Initialize
                      </button>
                    )}
                  </p>
                  <div className="mb-6 flex gap-12">
                    <div>
                      <p className="label-meta mb-1">USDC Balance</p>
                      <p className="font-mono text-3xl font-bold text-green">
                        {treasuryData ? `$${(treasuryData.usdcBalance.toNumber() / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "$0.00"}
                      </p>
                      <p className="label-meta mt-1">Solana devnet USDC</p>
                      {!treasuryData && treasuryError && (
                        <p className="font-mono text-[10px] text-muted-foreground/50 mt-2">{treasuryError.slice(0, 120)}</p>
                      )}
                    </div>
                    {treasuryData && (
                      <div className="flex gap-8 border-l border-border pl-8 pt-1">
                        <div>
                          <p className="label-meta mb-1 text-muted-foreground/60">Total Earned</p>
                          <p className="font-mono text-sm">${(treasuryData.totalEarned.toNumber() / 1_000_000).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="label-meta mb-1 text-muted-foreground/60">Total Spent</p>
                          <p className="font-mono text-sm">${(treasuryData.totalSpent.toNumber() / 1_000_000).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="label-meta">Daily Spend Limit</label>
                        <span className="font-mono text-xs text-green font-semibold">${spendingLimit.toLocaleString()}</span>
                      </div>
                      <Slider value={[spendingLimit]} onValueChange={(v) => setSpendingLimit(v[0])} min={500} max={25000} step={500} />
                      <div className="flex justify-between label-meta mt-2"><span>$500</span><span>$25,000</span></div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="label-meta">Per-Tx Limit</label>
                        <span className="font-mono text-xs text-blue-accent font-semibold">${perTxLimit.toLocaleString()}</span>
                      </div>
                      <Slider value={[perTxLimit]} onValueChange={(v) => setPerTxLimit(v[0])} min={100} max={10000} step={100} />
                      <div className="flex justify-between label-meta mt-2"><span>$100</span><span>$10,000</span></div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveLimits} 
                    disabled={!treasuryData}
                    className="btn-outline w-full justify-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Limits On-Chain
                  </button>
                </div>

                <div className="border-b border-border pb-8 mb-8">
                  <p className="label-meta text-amber mb-4 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Active Alerts</p>
                  <p className="text-xs font-medium mb-1">
                    {treasuryData?.emergencyPause ? "🔥 Treasury is PAUSED logic blocked" : "Spending limit checks active"}
                  </p>
                  {treasuryData && treasuryData.spentToday.toNumber() > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {agent?.name} has spent ${(treasuryData.spentToday.toNumber() / 1_000_000).toLocaleString()} out of the ${spendingLimit.toLocaleString()} daily limit.
                    </p>
                  )}
                </div>

                <div>
                  <p className="label-meta mb-4">Quick Actions</p>
                  <div className="space-y-0">
                    {[
                      { label: "Verify an agent", icon: Shield, href: "/verify" },
                      { label: "Browse all agents", icon: Activity, href: "/agents" },
                      { label: "Register new agent", icon: Plus, href: "/register" },
                    ].map((a) => (
                      <Link key={a.label} to={a.href}
                        className="group flex items-center gap-3 py-3 border-b border-border last:border-0 hover:border-foreground/20 transition-colors">
                        <a.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-green transition-colors" />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{a.label}</span>
                        <span className="ml-auto label-meta opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      <AnimatePresence>
        {invoiceAgent && (
          <InvoiceModal agent={invoiceAgent} onClose={() => setInvoiceAgent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
