/**
 * useAgents.ts — On-chain AgentIdentity account fetchers
 *
 * Provides:
 *  - useAllAgents()   → all AgentIdentity PDAs on devnet (for Agents listing + Verify)
 *  - useMyAgent()     → the PDA owned by the connected wallet (for Dashboard)
 *
 * The on-chain AgentIdentity struct is mapped to the existing `Agent` interface
 * from mockAgents.ts so existing UI components need zero changes.
 */
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "@/hooks/useProgram";

const FRAMEWORK_NAMES = ["ELIZA", "AutoGen", "CrewAI", "LangGraph", "Custom"] as const;
const MODEL_NAMES = ["Claude 3.5 Sonnet", "GPT-4o", "Llama 3.1", "Gemini Pro"] as const;
const VERIFIED_LEVELS = ["Unverified", "KYB", "Audited"] as const;

/** Shape returned by program.account.agentIdentity.all() */
type RawIdentity = {
    publicKey: PublicKey;
    account: {
        name: string;
        owner: PublicKey;
        agentWallet: PublicKey;
        framework: number;
        model: string;
        verifiedLevel: number;
        registeredAt: { toNumber(): number };
        lastActive: { toNumber(): number };
        canTradeDefi: boolean;
        canSendPayments: boolean;
        canPublishContent: boolean;
        canAnalyzeData: boolean;
        maxTxSizeUsdc: { toNumber(): number };
        reputationScore: number;
        totalTransactions: { toNumber(): number };
        gstin: string;
        serviceCategory: number;
    };
};

/** Shared normaliser — converts on-chain account to the Agent shape used by UI */
function normalize(raw: RawIdentity) {
    const a = raw.account;
    const regTs = a.registeredAt.toNumber() * 1000;
    const lastTs = a.lastActive.toNumber() * 1000;
    const maxUsdc = a.maxTxSizeUsdc.toNumber() / 1_000_000;
    const framework = FRAMEWORK_NAMES[a.framework] ?? "Custom";
    // map stored model string back to known label
    const llmModel = MODEL_NAMES.find((m) => m === a.model) ?? (a.model as typeof MODEL_NAMES[number]);
    const verifiedLevel = VERIFIED_LEVELS[Math.min(a.verifiedLevel, 2)];
    const totalTxUsd = (a.totalTransactions.toNumber() * maxUsdc * 0.5).toLocaleString("en-US", {
        style: "currency", currency: "USD", maximumFractionDigits: 0,
    });
    const ownerWallet = a.owner.toBase58();
    // deterministic "id" — base58 of the PDA pubkey (first 16 chars)
    const id = raw.publicKey.toBase58();

    return {
        id,
        name: a.name,
        framework,
        llmModel,
        ownerWallet,
        verifiedLevel,
        reputationScore: a.reputationScore,
        reputationBreakdown: { transactions: a.reputationScore / 3, uptime: a.reputationScore / 3, ratings: a.reputationScore / 3 },
        capabilities: {
            defiTrading: a.canTradeDefi,
            paymentSending: a.canSendPayments,
            contentPublishing: a.canPublishContent,
            dataAnalysis: a.canAnalyzeData,
            maxUsdcTx: maxUsdc,
        },
        indiaCompliance: a.gstin?.length === 15 ? {
            gstin: a.gstin,
            serviceCategory: ["Information Technology Services", "Financial Services", "Consulting Services", "Marketing & Advertising", "Research & Development"][a.serviceCategory] ?? "IT",
            tdsRate: a.serviceCategory === 1 ? 2 : 10,
        } : undefined,
        registeredAt: new Date(regTs).toISOString(),
        lastActive: new Date(lastTs || Date.now()).toISOString(),
        totalTxValue: totalTxUsd,
        activity: [],
        paused: false,
        avatarSeed: a.name,
    };
}

/** Fetch ALL registered agents (for /agents listing and /verify search) */
export function useAllAgents() {
    const program = useProgram();
    const [agents, setAgents] = useState<ReturnType<typeof normalize>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!program) return;
        setLoading(true);
        program.account.agentIdentity
            .all()
            .then((all) => setAgents(all.map((r) => normalize(r as unknown as RawIdentity))))
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false));
    }, [program]);

    return { agents, loading, error };
}

/** Fetch the AgentIdentity PDA owned by `ownerPubkey` (for /dashboard) */
export function useMyAgent(ownerPubkey: string | null) {
    const program = useProgram();
    const [agent, setAgent] = useState<ReturnType<typeof normalize> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!program || !ownerPubkey) { setLoading(false); return; }
        const owner = new PublicKey(ownerPubkey);
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent-identity"), owner.toBytes()],
            program.programId
        );
        program.account.agentIdentity
            .fetch(pda)
            .then((acc) => setAgent(normalize({ publicKey: pda, account: acc } as unknown as RawIdentity)))
            .catch(() => setAgent(null))  // not registered yet
            .finally(() => setLoading(false));
    }, [program, ownerPubkey]);

    return { agent, loading, error };
}
