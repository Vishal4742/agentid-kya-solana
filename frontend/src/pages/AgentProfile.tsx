import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { getAgentById, truncateWallet, formatRelativeTime, MOCK_AGENTS } from "@/data/mockAgents";
import { toast } from "sonner";
import { Copy, Shield, Activity, Zap, CheckCircle2, ExternalLink, Clock, TrendingUp, Wallet } from "lucide-react";
import { Sk } from "@/components/Skeleton";

/* ── Reputation gauge ── */
function ReputationGauge({ score }: { score: number }) {
  const size = 140, sw = 10;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const angle = 220;
  const total = (angle / 360) * circ;
  const filled = (score / 1000) * total;
  const startAngle = 160;
  const color = score > 700 ? "hsl(var(--green))" : score > 400 ? "hsl(var(--amber))" : "hsl(var(--destructive))";
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={sw}
          strokeDasharray={`${total} ${circ - total}`} strokeDashoffset={-((startAngle / 360) * circ)} strokeLinecap="round" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-((startAngle / 360) * circ)} strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }} animate={{ strokeDasharray: `${filled} ${circ - filled}` }}
          transition={{ duration: 1.5, ease: "easeOut" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold font-mono" style={{ color }}>{score}</div>
        <div className="label-meta mt-1">/ 1000</div>
      </div>
    </div>
  );
}

/* ── Skeleton: hero section ── */
function HeroSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-0 border-b border-border mb-0">
      {/* Left hero */}
      <div className="lg:col-span-2 py-10 lg:pr-10 lg:border-r border-border">
        <div className="flex items-start gap-3 mb-6">
          <Sk className="h-6 w-20" />
          <Sk className="h-6 w-16" />
        </div>
        <Sk className="h-12 w-3/4 mb-3" />
        <Sk className="h-10 w-1/2 mb-6" />
        <div className="flex gap-4 mb-6">
          <Sk className="h-6 w-20" />
          <Sk className="h-6 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Sk className="h-2 w-16 mb-2" />
              <Sk className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
      {/* Gauge col */}
      <div className="py-10 lg:pl-10 flex flex-col items-center justify-center gap-4">
        <Sk className="h-2.5 w-28" />
        <Sk className="w-[140px] h-[140px] rounded-full" />
        <div className="grid grid-cols-3 gap-4 w-full">
          {[0, 1, 2].map((i) => (
            <div key={i} className="text-center">
              <Sk className="h-6 w-10 mx-auto mb-1" />
              <Sk className="h-2 w-14 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton: activity feed ── */
function ActivitySkeleton() {
  return (
    <div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="grid py-4 border-b border-border last:border-0" style={{ gridTemplateColumns: "28px 1fr auto" }}>
          <Sk className="w-3.5 h-3.5 mt-0.5" />
          <div>
            <Sk className={`h-3.5 mb-2`} style={{ width: `${50 + (i % 3) * 15}%` } as React.CSSProperties} />
            <div className="flex gap-3">
              <Sk className="h-2.5 w-20" />
              <Sk className="h-2.5 w-14" />
            </div>
          </div>
          <Sk className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton: right sidebar ── */
function SidebarSkeleton() {
  return (
    <div className="py-10 lg:pl-10 space-y-0">
      <div className="border-b border-border pb-8 mb-8">
        <Sk className="h-2.5 w-40 mb-5" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <Sk className="w-3.5 h-3.5 shrink-0" />
            <Sk className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div>
        <Sk className="h-2.5 w-28 mb-5" />
        <div className="flex gap-3 mb-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Sk key={i} className="w-6 h-6" />
          ))}
        </div>
        <Sk className="h-9 w-full" />
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  defi_trade: TrendingUp, payment: Zap, content: Activity, audit: Shield, registration: CheckCircle2,
};

export default function AgentProfile() {
  const { id } = useParams<{ id: string }>();
  const agent = getAgentById(id || "");
  const { connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, [id]);

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <p className="label-meta mb-4">404 — Agent not found</p>
          <p className="display-serif text-2xl text-muted-foreground mb-8">No agent with ID: <code className="font-mono not-italic text-foreground">{id}</code></p>
          <div className="flex flex-wrap gap-4 justify-center">
            {MOCK_AGENTS.slice(0, 4).map(a => (
              <Link key={a.id} to={`/agent/${a.id}`} className="link-underline text-sm text-muted-foreground hover:text-foreground">{a.name}</Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmitRating = () => {
    if (!connected) { toast.error("Connect wallet to rate agents"); return; }
    if (!rating) { toast.error("Select a star rating first"); return; }
    setRated(true);
    toast.success(`Rated ${rating} ⭐ — submitted on-chain`);
  };

  return (
    <div className="min-h-screen bg-background px-6 lg:px-10 pb-16">
      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="flex justify-between items-baseline border-b border-border pb-3 mb-12 pt-10">
          <div className="flex items-center gap-4">
            <Link to="/agents" className="label-meta link-underline">Index / Agents</Link>
            <span className="text-muted-foreground/30">·</span>
            <span className="font-mono text-[11px] text-muted-foreground/60">{agent.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
              className="label-meta link-underline hover:text-foreground">Share</button>
            <a href={`https://explorer.solana.com/address/${agent.ownerWallet}?cluster=devnet`}
              target="_blank" rel="noopener noreferrer"
              className="label-meta link-underline hover:text-foreground">Explorer</a>
          </div>
        </div>

        {/* Hero — skeleton or real */}
        {loading ? <HeroSkeleton /> : (
          <div className="grid lg:grid-cols-3 gap-0 border-b border-border mb-0">
            <div className="lg:col-span-2 py-10 lg:pr-10 lg:border-r border-border">
              <div className="flex items-start gap-4 mb-6">
                <div className={`px-2.5 py-1 text-xs font-mono border ${
                  agent.verifiedLevel === "Audited" ? "border-green/30 text-green bg-green/5" :
                  agent.verifiedLevel === "KYB" ? "border-blue-accent/30 text-blue-accent bg-blue-accent/5" :
                  "border-border text-muted-foreground"
                }`}>{agent.verifiedLevel}</div>
                {agent.paused && <div className="px-2.5 py-1 text-xs font-mono border border-destructive/30 text-destructive">PAUSED</div>}
              </div>
              <h1 className="display-serif text-4xl sm:text-5xl lg:text-6xl text-foreground mb-5 leading-tight">{agent.name}</h1>
              <div className="flex flex-wrap gap-4 mb-6">
                <span className="label-meta border border-green/20 px-2 py-1 text-green">{agent.framework}</span>
                <span className="label-meta border border-blue-accent/20 px-2 py-1 text-blue-accent">{agent.llmModel}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { label: "Owner", value: truncateWallet(agent.ownerWallet), mono: true, copy: true },
                  { label: "Registered", value: new Date(agent.registeredAt).toLocaleDateString("en-GB").replace(/\//g, ".") },
                  { label: "Last Active", value: formatRelativeTime(agent.lastActive), color: "green" as const },
                  { label: "Total Tx Value", value: agent.totalTxValue, color: "green" as const, mono: true },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="label-meta mb-1">{item.label}</p>
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm ${item.mono ? "font-mono" : ""} ${item.color === "green" ? "text-green font-semibold" : "text-foreground"}`}>{item.value}</p>
                      {item.copy && (
                        <button onClick={() => { navigator.clipboard.writeText(agent.ownerWallet); toast.success("Copied!"); }}
                          className="text-muted-foreground hover:text-foreground transition-colors">
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-10 lg:pl-10 flex flex-col items-center justify-center gap-4">
              <p className="label-meta">Reputation Score</p>
              <ReputationGauge score={agent.reputationScore} />
              <div className="grid grid-cols-3 gap-4 text-center w-full">
                {[
                  { label: "Transactions", val: agent.reputationBreakdown.transactions, color: "text-green" },
                  { label: "Uptime",       val: agent.reputationBreakdown.uptime,       color: "text-blue-accent" },
                  { label: "Ratings",      val: agent.reputationBreakdown.ratings,      color: "text-purple-accent" },
                ].map((b) => (
                  <div key={b.label}>
                    <div className={`text-lg font-bold font-mono ${b.color}`}>{b.val}</div>
                    <p className="label-meta mt-0.5">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-0">
          {/* Activity feed */}
          <div className="lg:col-span-2 lg:pr-10 lg:border-r border-border py-10">
            <div className="flex justify-between items-baseline border-b border-border pb-3 mb-0">
              <p className="label-meta">Activity Feed</p>
              {!loading && <span className="font-mono text-[11px] text-muted-foreground/40">{agent.activity.length} events</span>}
            </div>

            {loading ? <ActivitySkeleton /> : (
              <div>
                {agent.activity.map((act, i) => {
                  const Icon = ACTIVITY_ICONS[act.type] || Activity;
                  return (
                    <motion.div key={act.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                      className="group grid py-4 border-b border-border last:border-0 transition-colors hover:border-foreground/20"
                      style={{ gridTemplateColumns: "28px 1fr auto" }}>
                      <Icon className={`w-3.5 h-3.5 mt-0.5 ${act.status === "success" ? "text-green/60" : act.status === "failed" ? "text-destructive/60" : "text-amber/60"}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground mb-1">{act.description}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          {act.amount && <span className="font-mono text-xs text-foreground font-semibold">{act.amount}</span>}
                          {act.txHash && (
                            <a href={`https://explorer.solana.com/tx/${act.txHash}?cluster=devnet`}
                              target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-green link-underline">
                              {act.txHash.slice(0, 6)}...{act.txHash.slice(-6)} <ExternalLink className="inline w-2.5 h-2.5 mb-0.5" />
                            </a>
                          )}
                          <span className={`label-meta ${act.status === "success" ? "text-green" : act.status === "failed" ? "text-destructive" : "text-amber"}`}>{act.status}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1 font-mono text-[11px] text-muted-foreground/40">
                        <Clock className="w-3 h-3 mt-0.5" />
                        {formatRelativeTime(act.timestamp)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {!loading && (
              <div className="mt-10">
                <div className="flex justify-between items-baseline border-b border-border pb-3 mb-0">
                  <p className="label-meta">Other Registered Agents</p>
                  <Link to="/agents" className="label-meta link-underline hover:text-green">View all →</Link>
                </div>
                {MOCK_AGENTS.filter(a => a.id !== agent.id).slice(0, 3).map((a) => (
                  <Link key={a.id} to={`/agent/${a.id}`}
                    className="group flex items-baseline justify-between py-4 border-b border-border last:border-0 hover:border-foreground/20 transition-colors">
                    <span className="font-serif italic text-xl text-muted-foreground group-hover:text-foreground group-hover:translate-x-2 transition-all duration-300 inline-block" style={{ fontFamily: "Georgia, serif" }}>
                      {a.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground/40 group-hover:opacity-100 opacity-0 transition-opacity">{a.reputationScore} / 1000</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          {loading ? <SidebarSkeleton /> : (
            <div className="py-10 lg:pl-10 space-y-0">
              <div className="border-b border-border pb-8 mb-8">
                <p className="label-meta mb-5">Authorised Capabilities</p>
                <div className="space-y-0">
                  {[
                    { key: "defiTrading",       label: "DeFi Trading",        icon: TrendingUp },
                    { key: "paymentSending",     label: "Payment Sending",     icon: Zap },
                    { key: "contentPublishing",  label: "Content Publishing",  icon: Activity },
                    { key: "dataAnalysis",       label: "Data Analysis",       icon: Shield },
                  ].map(({ key, label, icon: Icon }) => {
                    const enabled = agent.capabilities[key as keyof typeof agent.capabilities] as boolean;
                    return (
                      <div key={key} className={`flex items-center gap-3 py-3 border-b border-border last:border-0 ${!enabled ? "opacity-30" : ""}`}>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${enabled ? "text-green" : "text-muted-foreground"}`} />
                        <span className={`text-xs ${enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>{label}</span>
                        {enabled && key === "paymentSending" && (
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">Max ${agent.capabilities.maxUsdcTx.toLocaleString()}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {agent.indiaCompliance && (
                <div className="border-b border-border pb-8 mb-8">
                  <p className="label-meta text-amber mb-4">India Compliance</p>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">GSTIN</span>
                      <span>{agent.indiaCompliance.gstin}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">TDS Rate</span>
                      <span className="text-amber">{agent.indiaCompliance.tdsRate}%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Category</span>
                      <span className="text-right max-w-[140px]">{agent.indiaCompliance.serviceCategory}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="label-meta mb-5">Rate This Agent</p>
                {rated ? (
                  <div className="py-4 text-center border border-green/20">
                    <CheckCircle2 className="w-6 h-6 text-green mx-auto mb-2" />
                    <p className="text-xs text-green font-mono">{rating}★ recorded on-chain</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3 mb-5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(s)}
                          className={`text-xl transition-all ${s <= (hovered || rating) ? "opacity-100 scale-110" : "opacity-20"}`}>⭐</button>
                      ))}
                    </div>
                    {!connected && (
                      <p className="label-meta text-amber mb-3 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Connect wallet to submit</p>
                    )}
                    <button onClick={handleSubmitRating} className="btn-outline w-full justify-center">Submit Rating</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
