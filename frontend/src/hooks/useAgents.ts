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
const VERIFIED_LEVELS = ["Unverified", "EmailVerified", "KYBVerified", "Audited"] as const;
const SERVICE_CATEGORIES = [
    "Information Technology Services",
    "Financial Services",
    "Consulting Services",
    "Marketing & Advertising",
    "Research & Development",
] as const;

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return String(error);
}

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

type RawTreasury = {
    totalEarned: { toNumber(): number };
    totalSpent: { toNumber(): number };
    emergencyPause: boolean;
};

function formatUsdcDisplay(totalMicroUsdc: number): string {
    return totalMicroUsdc.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });
}

async function fetchTreasuryState(
    program: ReturnType<typeof useProgram>,
    identityPubkey: PublicKey,
): Promise<RawTreasury | null> {
    if (!program) return null;

    const [treasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent-treasury"), identityPubkey.toBytes()],
        program.programId,
    );

    try {
        const treasury = await program.account.agentTreasury.fetch(treasuryPda);
        return treasury as unknown as RawTreasury;
    } catch {
        return null;
    }
}

/** Shared normaliser — converts on-chain account to the Agent shape used by UI */
function normalize(raw: RawIdentity, treasury: RawTreasury | null = null) {
    const a = raw.account;
    const regTs = a.registeredAt.toNumber() * 1000;
    const lastTs = a.lastActive.toNumber() * 1000;
    const maxUsdc = a.maxTxSizeUsdc.toNumber() / 1_000_000;
    const framework = FRAMEWORK_NAMES[a.framework] ?? "Custom";
    // map stored model string back to known label
    const llmModel = MODEL_NAMES.find((m) => m === a.model) ?? (a.model as typeof MODEL_NAMES[number]);
    const verifiedLevel = VERIFIED_LEVELS[Math.min(a.verifiedLevel, 3)];
    const totalTxUsd = treasury
        ? formatUsdcDisplay(treasury.totalEarned.toNumber() / 1_000_000)
        : formatUsdcDisplay(a.totalTransactions.toNumber() * maxUsdc * 0.5);
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
            serviceCategory: SERVICE_CATEGORIES[a.serviceCategory] ?? SERVICE_CATEGORIES[0],
            tdsRate: a.serviceCategory === 1 ? 2 : 10,
        } : undefined,
        registeredAt: new Date(regTs).toISOString(),
        lastActive: new Date(lastTs || Date.now()).toISOString(),
        totalTxValue: totalTxUsd,
        activity: [],
        paused: treasury?.emergencyPause ?? false,
        avatarSeed: a.name,
    };
}

export function useAllAgents() {
    const program = useProgram();
    const [agents, setAgents] = useState<ReturnType<typeof normalize>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetry] = useState(0);

    const refetch = () => setRetry(rc => rc + 1);

    useEffect(() => {
        if (!program) return;
        let active = true;
        setLoading(true);
        setError(null);

        program.account.agentIdentity
            .all()
            .then(async (all) => {
                const hydrated = await Promise.all(
                    all.map(async (record) => {
                        const normalizedRecord = record as unknown as RawIdentity;
                        const treasury = await fetchTreasuryState(program, normalizedRecord.publicKey);
                        return normalize(normalizedRecord, treasury);
                    }),
                );

                if (active) setAgents(hydrated);
            })
            .catch((e) => {
                if (active) setError(formatErrorMessage(e));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [program, retryCount]);

    return { agents, loading, error, refetch };
}

export function useMyAgent(ownerPubkey: string | null) {
    const program = useProgram();
    const [agent, setAgent] = useState<ReturnType<typeof normalize> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetry] = useState(0);

    const refetch = () => setRetry(rc => rc + 1);

    useEffect(() => {
        if (!program || !ownerPubkey) {
            setLoading(false);
            setError(null);
            setAgent(null);
            return;
        }
        let active = true;
        setLoading(true);
        setError(null);

        const owner = new PublicKey(ownerPubkey);
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent-identity"), owner.toBytes()],
            program.programId
        );
        program.account.agentIdentity
            .fetch(pda)
            .then(async (acc) => {
                const treasury = await fetchTreasuryState(program, pda);
                if (active) setAgent(normalize({ publicKey: pda, account: acc } as unknown as RawIdentity, treasury));
            })
            .catch((e) => {
                if (active) {
                    setAgent(null); // not registered yet
                    if (!String(e).includes("Account does not exist") && !String(e).includes("AccountNotFound")) {
                        setError(formatErrorMessage(e));
                    }
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [program, ownerPubkey, retryCount]);

    return { agent, loading, error, refetch };
}
