import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useProgram } from "@/hooks/useProgram";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Wallet, Zap, CheckCircle2, ExternalLink, Copy, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";

// Bubblegum program & shared devnet Merkle tree
const MPL_BUBBLEGUM_PROGRAM = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
const SPL_NOOP_PROGRAM = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");
const SPL_ACCOUNT_COMPRESSION_PROGRAM = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
// Project-owned devnet tree created for AgentID registration
const SHARED_MERKLE_TREE = new PublicKey("2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx");
// Tree authority PDA = PDA(tree_address, bubblegum_program)
const [TREE_AUTHORITY] = PublicKey.findProgramAddressSync(
  [SHARED_MERKLE_TREE.toBytes()],
  MPL_BUBBLEGUM_PROGRAM
);
const PROGRAM_CONFIG_SEED = new TextEncoder().encode("program-config");

const STEPS = ["Basic Info", "Capabilities", "India Compliance", "Register Agent"];
const FRAMEWORKS = ["ELIZA", "AutoGen", "CrewAI", "LangGraph", "Custom"];
const MODELS = ["Claude 3.5 Sonnet", "GPT-4o", "Llama 3.1", "Gemini Pro"];
const METADATA_API_BASE = "https://agentid-metadata-api.vercel.app";
const SERVICE_CATEGORIES = [
  "Information Technology Services",
  "Financial Services",
  "Consulting Services",
  "Marketing & Advertising",
  "Research & Development",
];


export default function Register() {
  const { connected, publicKey, connecting, connect } = useWallet();
  const program = useProgram();
  const [step, setStep] = useState(0);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");

  const [form, setForm] = useState({
    name: "", framework: "", model: "",
    defiTrading: false, paymentSending: false, contentPublishing: false, dataAnalysis: false,
    maxUsdcTx: 1000, gstin: "", serviceCategory: "", tdsRate: 10, skipIndia: false,
  });

  const canProceedStep0 = form.name.trim().length >= 3 && form.framework && form.model;
  const canProceedStep1 = form.defiTrading || form.paymentSending || form.contentPublishing || form.dataAnalysis;
  const tdsRate = form.serviceCategory === "Financial Services" ? 2 : 10;

  const handleMint = async () => {
    if (!program || !publicKey) {
      toast.error("Wallet not connected");
      return;
    }
    setMinting(true);
    try {
      const frameworkIndex = FRAMEWORKS.indexOf(form.framework);
      if (frameworkIndex === -1) {
        toast.error("Please select a valid framework");
        setMinting(false);
        return;
      }

      // Only validate GSTIN if the user explicitly entered one (not empty and not skipped)
      if (!form.skipIndia && form.gstin.trim().length > 0 && form.gstin.trim().length !== 15) {
        toast.error("GSTIN must be exactly 15 characters — or leave it empty to skip");
        setMinting(false);
        return;
      }

      // Map model name to a max-32-char string
      const modelStr = form.model.slice(0, 32);
      // agent_wallet = owner wallet (same pubkey, can differ later)
      const agentWallet = new PublicKey(publicKey);
      // max_tx_size_usdc in USDC lamports (6 decimals) — must be BN, not BigInt
      const maxTxUsdc = new BN(form.maxUsdcTx).mul(new BN(1_000_000));
      // gstin: must be exactly 15 chars
      const gstin = form.skipIndia ? "" : form.gstin.trim();
      // pan_hash: 32 zero bytes (PAN hashing not implemented in UI yet)
      const panHash = Array.from({ length: 32 }, () => 0);
      // service_category u8 enum
      const serviceCategory = form.skipIndia ? 0 : SERVICE_CATEGORIES.indexOf(form.serviceCategory);
      const [treeDelegate] = PublicKey.findProgramAddressSync(
        [PROGRAM_CONFIG_SEED],
        program.programId,
      );

      const tx = await program.methods
        .registerAgent({
          name: form.name,
          framework: frameworkIndex,
          model: modelStr,
          agentWallet,
          canTradeDefi: form.defiTrading,
          canSendPayments: form.paymentSending,
          canPublishContent: form.contentPublishing,
          canAnalyzeData: form.dataAnalysis,
          maxTxSizeUsdc: maxTxUsdc,
          gstin,
          panHash,
          serviceCategory: serviceCategory >= 0 ? serviceCategory : 0,
          metadataUri: `${METADATA_API_BASE}/metadata/${encodeURIComponent(form.name)}.json`,
        })
        .accounts({
          treeAuthority: TREE_AUTHORITY,
          merkleTree: SHARED_MERKLE_TREE,
          treeDelegate,
          logWrapper: SPL_NOOP_PROGRAM,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM,
          bubblegumProgram: MPL_BUBBLEGUM_PROGRAM,
        } as any)
        .rpc();

      setTxHash(tx);
      setMintSuccess(true);
      toast.success("Agent registered on Solana devnet! 🎉", {
        description: `tx: ${tx.slice(0, 8)}…${tx.slice(-8)}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("registerAgent error:", err);
      toast.error("Transaction failed", { description: msg.slice(0, 120) });
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 lg:px-10 pb-16">
      <div className="max-w-2xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex justify-between items-baseline border-b border-border pb-3 mb-12 pt-10">
          <span className="label-meta">Index / Register Agent</span>
          <span className="font-mono text-[11px] text-muted-foreground/40">Solana Devnet</span>
        </div>

        {/* ── Title ── */}
        <div className="mb-10">
          <p className="label-meta text-green mb-3">On-chain identity · Devnet registration</p>
          <h1 className="display-serif text-4xl sm:text-5xl text-foreground mb-4 leading-tight">
            Mint Your<br />Agent Credential.
          </h1>
          <p className="text-sm text-muted-foreground">Takes &lt;2 minutes. Your wallet becomes the on-chain owner.</p>
        </div>

        {/* ── Wallet gate ── */}
        {!connected && (
          <div className="mb-8 py-5 border-b border-amber/20">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-4 h-4 text-amber mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber mb-1">Wallet required</p>
                <p className="text-xs text-muted-foreground">Connect Phantom or Solflare to sign the credential mint transaction.</p>
              </div>
            </div>
            <div className="flex gap-3">
              {(["phantom", "solflare"] as const).map((p) => (
                <button key={p} onClick={async () => {
                  try {
                    await connect(p);
                  } catch (err: unknown) {
                    console.error("Wallet connection failed:", err);
                    toast.error("Connection failed");
                  }
                }} disabled={connecting}
                  className="btn-primary disabled:opacity-50">
                  {connecting ? <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                  {p === "phantom" ? "👻 Phantom" : "☀️ Solflare"}
                </button>
              ))}
            </div>
          </div>
        )}

        {connected && (
          <div className="mb-8 flex items-center gap-3 py-3 border-b border-border">
            <div className="w-1.5 h-1.5 bg-green animate-pulse" />
            <span className="font-mono text-xs text-green">{publicKey}</span>
            <span className="label-meta ml-auto">Connected ✓</span>
          </div>
        )}

        {/* ── Progress ── */}
        <div className="mb-10">
          {/* Step indicator */}
          <div className="flex gap-0 mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex-1 flex flex-col items-center gap-1.5 ${i > 0 ? "border-l border-border pl-3" : ""}`}>
                <div className={`label-meta transition-colors ${i === step ? "text-green" : i < step ? "text-muted-foreground" : "text-muted-foreground/30"
                  }`}>{s}</div>
                <div className={`w-full h-px transition-colors duration-400 ${i < step ? "bg-green" : i === step ? "bg-green/50" : "bg-border"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Step content ── */}
        <AnimatePresence mode="wait">

          {/* Step 0: Basic Info */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="label-meta text-green mb-8">01 — Basic Information</p>

              <div className="space-y-8">
                <div>
                  <label className="label-meta block mb-3">Agent Name <span className="text-destructive">*</span></label>
                  <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="TradingBot-Alpha"
                    className="input-editorial" />
                  <p className="text-xs text-muted-foreground/50 mt-2 font-mono">3–32 characters · stored on-chain</p>
                </div>

                <div>
                  <label className="label-meta block mb-4">Framework <span className="text-destructive">*</span></label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {FRAMEWORKS.map((f) => (
                      <button key={f} onClick={() => setForm(fm => ({ ...fm, framework: f }))}
                        className={`py-2 px-3 border text-xs font-mono transition-all ${form.framework === f
                          ? "border-green text-green bg-green/5"
                          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                          }`}>{f}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-meta block mb-4">LLM Model <span className="text-destructive">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODELS.map((m) => (
                      <button key={m} onClick={() => setForm(fm => ({ ...fm, model: m }))}
                        className={`py-2 px-4 border text-xs transition-all text-left ${form.model === m
                          ? "border-blue-accent text-blue-accent bg-blue-accent/5"
                          : "border-border text-muted-foreground hover:text-foreground"
                          }`}>{m}</button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Capabilities */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="label-meta text-green mb-2">02 — Agent Capabilities</p>
              <p className="text-xs text-muted-foreground mb-8">Capabilities are attested on-chain and visible to every protocol that integrates AgentID.</p>

              <div className="space-y-0">
                {[
                  { key: "defiTrading" as const, label: "DeFi Trading", desc: "Execute swaps, provide liquidity, manage positions" },
                  { key: "paymentSending" as const, label: "Payment Sending", desc: "Transfer USDC / SOL to whitelisted addresses" },
                  { key: "contentPublishing" as const, label: "Content Publishing", desc: "Publish text, images, or data to IPFS / Arweave" },
                  { key: "dataAnalysis" as const, label: "Data Analysis", desc: "Read-only access to on-chain data and APIs" },
                ].map((cap) => (
                  <div key={cap.key} onClick={() => setForm(f => ({ ...f, [cap.key]: !f[cap.key] }))}
                    className="group flex items-center gap-5 py-4 border-b border-border cursor-pointer hover:border-foreground/20 transition-colors">
                    {/* Custom checkbox */}
                    <div className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-all ${form[cap.key] ? "border-green bg-green" : "border-muted-foreground/40"
                      }`}>
                      {form[cap.key] && <div className="w-2 h-2 bg-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium transition-colors ${form[cap.key] ? "text-foreground" : "text-muted-foreground"}`}>
                        {cap.label}
                      </span>
                      <p className="text-xs text-muted-foreground/50 mt-0.5 font-mono">{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {form.paymentSending && (
                <div className="mt-6 pt-5 border-t border-border">
                  <div className="flex justify-between items-center mb-4">
                    <label className="label-meta">Max USDC per transaction</label>
                    <span className="text-green font-mono text-sm font-semibold">${form.maxUsdcTx.toLocaleString()}</span>
                  </div>
                  <Slider value={[form.maxUsdcTx]} onValueChange={(v) => setForm(f => ({ ...f, maxUsdcTx: v[0] }))}
                    min={100} max={50000} step={100} />
                  <div className="flex justify-between text-xs text-muted-foreground/40 font-mono mt-2">
                    <span>$100</span><span>$50,000</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: India Compliance */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="label-meta text-amber mb-2">03 — India Compliance <span className="text-muted-foreground ml-2">Optional</span></p>
              <p className="text-xs text-muted-foreground mb-8">For Indian businesses: GSTIN enables automatic TDS deduction on USDC payments, verified by CA partner nodes on-chain.</p>

              <div className="space-y-8">
                <div>
                  <label className="label-meta block mb-3">GSTIN</label>
                  <input value={form.gstin} onChange={(e) => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                    placeholder="27AAPFU0939F1ZV" maxLength={15}
                    className="input-editorial uppercase" />
                  <p className="text-xs text-muted-foreground/40 mt-2 font-mono">15-character format</p>
                </div>

                <div>
                  <label className="label-meta block mb-3">Service Category</label>
                  <select value={form.serviceCategory} onChange={(e) => setForm(f => ({ ...f, serviceCategory: e.target.value }))}
                    className="w-full px-0 py-2 bg-transparent border-b border-border text-sm text-foreground focus:outline-none focus:border-amber/50 transition-colors appearance-none">
                    <option value="" className="bg-background">Select category…</option>
                    {SERVICE_CATEGORIES.map((c) => <option key={c} value={c} className="bg-background">{c}</option>)}
                  </select>
                </div>

                {form.serviceCategory && (
                  <div className="py-4 border-t border-amber/20">
                    <p className="label-meta text-amber mb-4">Calculated TDS Rate</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-medium">{form.serviceCategory === "Financial Services" ? "Section 194A" : "Section 194J"}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{form.serviceCategory === "Financial Services" ? "Interest / Finance" : "Professional / Technical Services"}</p>
                      </div>
                      <div className="font-serif italic text-5xl text-amber">{tdsRate}%</div>
                    </div>
                  </div>
                )}

                <button onClick={() => setForm(f => ({ ...f, skipIndia: true }))}
                  className="link-underline text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Skip — not an Indian business
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Mint */}
          {step === 3 && !mintSuccess && (
            <motion.div key="step3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <p className="label-meta text-purple-accent mb-8">04 — Mint Credential</p>

              {/* cNFT preview — editorial style */}
              <div className="border border-green/20 p-6 mb-6 glow-green">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 bg-green/10 border border-green/30 flex items-center justify-center font-mono font-bold text-green text-sm">
                    {(form.name || "AG").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p className="label-meta">AgentID Protocol</p>
                    <p className="font-mono text-[10px] text-green mt-0.5">Solana Devnet</p>
                  </div>
                </div>

                <h3 className="display-serif text-2xl text-foreground mb-3">{form.name || "Unnamed Agent"}</h3>

                <div className="flex gap-2 flex-wrap mb-4">
                  {form.framework && <span className="label-meta border border-green/20 px-2 py-1 text-green">{form.framework}</span>}
                  {form.model && <span className="label-meta border border-blue-accent/20 px-2 py-1 text-blue-accent">{form.model}</span>}
                  {form.gstin && <span className="label-meta border border-amber/20 px-2 py-1 text-amber">GSTIN Verified</span>}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {form.defiTrading && <span className="label-meta text-muted-foreground">DeFi</span>}
                  {form.paymentSending && <span className="label-meta text-muted-foreground">Payments · Max ${form.maxUsdcTx.toLocaleString()} USDC</span>}
                  {form.contentPublishing && <span className="label-meta text-muted-foreground">Content</span>}
                  {form.dataAnalysis && <span className="label-meta text-muted-foreground">Data</span>}
                </div>

                <div className="pt-3 border-t border-border font-mono text-[10px] text-muted-foreground/40">
                  Owner: {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
                </div>
              </div>

              {/* Tx details */}
              <div className="space-y-0 mb-8">
                {[
                  { label: "Network", value: "Solana Devnet", color: "green" as const },
                  { label: "Registration fee", value: "~0.003 SOL (tree + PDA)", color: null },
                  { label: "Asset type", value: "AgentIdentity PDA + cNFT", color: null },
                  { label: "Credential NFT", value: "Soul-bound Bubblegum cNFT", color: "green" as const },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-3 border-b border-border">
                    <span className="label-meta">{row.label}</span>
                    <span className={`font-mono text-xs ${row.color === "green" ? "text-green" : row.color === "amber" ? "text-amber" : "text-foreground"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={handleMint} disabled={minting || !connected}
                className="w-full btn-primary justify-center py-3.5 glow-green-sm disabled:opacity-40">
                {minting ? (
                  <><div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Registering on Solana...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Register On-Chain Identity</>
                )}
              </button>
              <p className="text-center font-mono text-[10px] text-muted-foreground/40 mt-3">
                ⚡ Live on Solana devnet
              </p>
            </motion.div>
          )}

          {/* Success */}
          {mintSuccess && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
              <div className="border border-green/30 p-8 text-center mb-8 glow-green">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                  <CheckCircle2 className="w-10 h-10 text-green mx-auto mb-5" />
                </motion.div>
                <h2 className="display-serif text-3xl text-foreground mb-2">Agent Registered.</h2>
                <p className="text-xs text-muted-foreground font-mono">Your agent identity and soul-bound cNFT are live on Solana devnet.</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="label-meta">Transaction Hash</p>
                </div>
                <div className="flex items-center gap-3 py-3 border-b border-border">
                  <code className="text-xs font-mono text-green flex-1 break-all">{txHash}</code>
                  <button onClick={() => { navigator.clipboard.writeText(txHash); toast.success("Copied!"); }}
                    className="shrink-0 p-1.5 border border-border hover:bg-secondary transition-colors">
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                  className="btn-outline w-full justify-center">
                  <ExternalLink className="w-3.5 h-3.5" /> View on Solana Explorer
                </a>
                <Link to={`/agent/${PublicKey.findProgramAddressSync([Buffer.from("agent-identity"), new PublicKey(publicKey!).toBytes()], program!.programId)[0].toBase58()}`} className="btn-primary w-full justify-center">
                  View Agent Profile <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation ── */}
        {!mintSuccess && (
          <div className="flex justify-between mt-12 pt-6 border-t border-border">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="btn-ghost disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 0 ? !canProceedStep0 : step === 1 ? !canProceedStep1 : false}
                className="btn-primary disabled:opacity-40">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
