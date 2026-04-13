import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAllAgents } from "@/hooks/useAgents";
import type { Agent } from "@/data/mockAgents";
import { formatRelativeTime } from "@/data/mockAgents";
import { useTextScramble } from "@/hooks/useTextScramble";
import { Search, ChevronDown, X, RefreshCw } from "lucide-react";
import { Sk } from "@/components/Skeleton";

/* ── Skeleton: agent row list ── */
function AgentsSkeleton() {
  return (
    <div className="w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid items-center py-5 border-b border-border"
          style={{ gridTemplateColumns: "110px 1fr 260px" }}
        >
          <Sk className="h-3 w-20" />
          <Sk className="h-7" style={{ width: `${48 + (i % 3) * 14}%` } as React.CSSProperties} />
          <Sk className="h-3 w-40 ml-auto" />
        </div>
      ))}
    </div>
  );
}

/* ── Journal row ── */
function JournalRow({ agent }: { agent: Agent }) {
  const previewRef = useRef<HTMLSpanElement>(null);
  const scramble = useTextScramble();
  const previewText = `${agent.framework} · ${agent.llmModel} · Rep ${agent.reputationScore}/1000 · ${agent.totalTxValue} attested`;

  return (
    <Link to={`/agent/${agent.id}`} className="group block"
      onMouseEnter={() => { if (previewRef.current) scramble(previewRef.current, previewText); }}>
      <div
        className="grid items-baseline py-5 border-b transition-colors duration-300"
        style={{ gridTemplateColumns: "110px 1fr 260px", borderColor: "hsl(var(--border))" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--foreground)/0.4)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))"; }}
      >
        <span className="font-mono text-xs text-muted-foreground/60 select-none">
          {new Date(agent.registeredAt).toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".")}
        </span>
        <span className="font-serif italic text-2xl sm:text-3xl tracking-tight text-foreground transition-transform duration-300 ease-out group-hover:translate-x-2.5 inline-block" style={{ fontFamily: "Georgia, serif" }}>
          {agent.name}
          {agent.verifiedLevel !== "Unverified" && (
            <span className={`ml-3 text-sm not-italic font-sans font-medium ${agent.verifiedLevel === "Audited" ? "text-green/70" : "text-blue-accent/70"}`}>
              · {agent.verifiedLevel}
            </span>
          )}
        </span>
        <span ref={previewRef} className="font-mono text-[11px] text-muted-foreground/50 text-right leading-relaxed opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {previewText}
        </span>
      </div>
    </Link>
  );
}

/* ── Sort / filter types ── */
type SortKey = "rep-desc" | "rep-asc" | "recently-active" | "recently-registered";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rep-desc", label: "Reputation (High→Low)" },
  { value: "rep-asc", label: "Reputation (Low→High)" },
  { value: "recently-active", label: "Recently Active" },
  { value: "recently-registered", label: "Recently Registered" },
];
const FRAMEWORKS = ["All", "ELIZA", "AutoGen", "CrewAI", "LangGraph", "Custom"] as const;
type Framework = typeof FRAMEWORKS[number];

export default function Agents() {
  const { agents, loading, error, refetch } = useAllAgents();
  const [time, setTime] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState<Framework>("All");
  const [sort, setSort] = useState<SortKey>("rep-desc");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB", { hour12: false }) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const filtered = useMemo(() => {
    let list = [...agents];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    if (framework !== "All") list = list.filter((a) => a.framework === framework);
    list.sort((a, b) => {
      if (sort === "rep-desc") return b.reputationScore - a.reputationScore;
      if (sort === "rep-asc") return a.reputationScore - b.reputationScore;
      if (sort === "recently-active") return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      if (sort === "recently-registered") return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      return 0;
    });
    return list;
  }, [agents, query, framework, sort]);

  const activeSort = SORT_OPTIONS.find((o) => o.value === sort)!;
  const hasFilters = query.trim() !== "" || framework !== "All";

  return (
    <div className="min-h-screen bg-background px-6 sm:px-10 pb-16">
      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="flex justify-between items-baseline border-b border-border pb-3 mb-10 pt-10">
          <span className="label-meta">Index / Registered Agents</span>
          <span className="font-mono text-[11px] text-muted-foreground/50">{time}</span>
        </div>

        <div className="mb-8">
          <h1 className="font-serif italic text-4xl sm:text-5xl tracking-[-0.02em] text-foreground">
            Registered Agents
          </h1>
        </div>

        {/* Toolbar */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents by name..."
              className="input-editorial pl-6 pr-8 text-sm w-full" />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {FRAMEWORKS.map((f) => (
                <button key={f} onClick={() => setFramework(f)}
                  className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${framework === f
                    ? "border-green/60 text-green bg-green/5"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="relative" ref={sortRef}>
              <button onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors">
                {activeSort.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 border border-border bg-background z-20 shadow-2xl">
                  {SORT_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => { setSort(o.value); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${sort === o.value ? "text-green bg-green/5" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {hasFilters && !loading && (
            <div className="flex items-center gap-3">
              <span className="label-meta text-muted-foreground/50">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
              <button onClick={() => { setQuery(""); setFramework("All"); }}
                className="label-meta text-green hover:text-foreground transition-colors link-underline">
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Agent list / skeleton / empty */}
        {loading ? (
          <AgentsSkeleton />
        ) : error ? (
          <div className="border border-destructive/20 py-12 flex flex-col items-center gap-3">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <p className="label-meta text-destructive">Failed to fetch on-chain agents</p>
            <p className="font-mono text-[10px] text-muted-foreground/50">{error.slice(0, 80)}</p>
            <button onClick={refetch} className="btn-outline text-xs mt-2 flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <ul className="w-full">
            {filtered.map((agent) => (
              <li key={agent.id}><JournalRow agent={agent} /></li>
            ))}
          </ul>
        ) : (
          <div className="border border-border py-20 flex flex-col items-center justify-center text-center">
            <p className="font-serif italic text-3xl text-foreground/20 mb-3">No agents found.</p>
            <p className="label-meta mb-6 text-muted-foreground/40">
              {query ? `No results for "${query}"` : `No agents in framework "${framework}"`}
            </p>
            <button onClick={() => { setQuery(""); setFramework("All"); }} className="btn-outline text-xs">
              Clear filters
            </button>
          </div>
        )}

        {/* Footer telemetry */}
        <div className="flex justify-between items-end pt-12 pb-4">
          <span className="text-xs text-muted-foreground/40">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} registered · Solana devnet
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/30 text-right">
            X: {mousePos.x} Y: {mousePos.y}
          </span>
        </div>
      </div>
    </div>
  );
}
