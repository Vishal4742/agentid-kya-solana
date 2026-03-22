import type { IncomingMessage, ServerResponse } from "http";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, utils } from "@coral-xyz/anchor";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const idl = require("../idl/agentid_program.json") as Idl;

type VercelRequest = IncomingMessage & { query: Record<string, string | string[]> };
type VercelResponse = ServerResponse & {
    status(code: number): VercelResponse;
    json(body: unknown): void;
    setHeader(name: string, value: string): VercelResponse;
};

// ── Constants ──────────────────────────────────────────────────────────────
// PROGRAM_ID is embedded in the IDL address field
const PROGRAM_ID = (idl as unknown as { address: string }).address;
const RPC_URL = process.env.SOLANA_RPC_URL;
if (!RPC_URL) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("SOLANA_RPC_URL must be defined in production");
    }
}
const ACTIVE_RPC_URL = RPC_URL ?? "https://api.devnet.solana.com";

const FRAMEWORKS = ["ELIZA", "AutoGen", "CrewAI", "LangGraph", "Custom"];
const VERIFIED_LEVELS = ["Unverified", "EmailVerified", "KYBVerified", "Audited"];
const CATEGORIES = [
    "Information Technology Services",
    "Financial Services",
    "Consulting Services",
    "Marketing & Advertising",
    "Research & Development",
];

// ── Helpers ────────────────────────────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

function buildReadonlyProvider(connection: Connection): AnchorProvider {
    // Vercel serverless — no real wallet needed for read-only fetches
    const wallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx: unknown) => tx,
        signAllTransactions: async (txs: unknown[]) => txs,
    };
    return new AnchorProvider(connection, wallet as never, {
        commitment: "confirmed",
    });
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only GET
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { agentId } = req.query;

    if (typeof agentId !== "string" || !/^[0-9a-f]{64}$/i.test(agentId)) {
        return res.status(400).json({
            error: "agentId must be a 64-character hex string (32 bytes)",
        });
    }

    try {
        const agentIdBytes = hexToBytes(agentId);

        const connection = new Connection(ACTIVE_RPC_URL, "confirmed");
        const provider = buildReadonlyProvider(connection);
        // Anchor 0.30: Program ID is already in idl.address — pass only (idl, provider)
        const program = new Program(idl, provider);

        const agentIdBs58 = utils.bytes.bs58.encode(Buffer.from(agentIdBytes));

        // ── Fetch specific AgentIdentity account by agent_id field ───────────
        // Use memcmp to filter on the RPC side instead of fetching all accounts
        // offset 8 is where agent_id: [u8; 32] starts after the 8-byte discriminator.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchedAccounts = await (program.account as any).agentIdentity.all([
            { memcmp: { offset: 8, bytes: agentIdBs58 } }
        ]);

        if (matchedAccounts.length === 0) {
            return res.status(404).json({ error: "Agent not found for this agentId" });
        }

        const match = matchedAccounts[0];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const acc: any = match.account;
        const ownerPubkey: string = acc.owner.toBase58();
        const framework: string = FRAMEWORKS[acc.framework] ?? "Custom";
        const verifiedLevel: string =
            VERIFIED_LEVELS[acc.verifiedLevel] ?? "Unverified";
        const reputationScore: number = acc.reputationScore;
        const registeredDate: string = new Date(
            acc.registeredAt.toNumber() * 1000
        )
            .toISOString()
            .split("T")[0];
        const serviceCategory: string =
            CATEGORIES[acc.serviceCategory] ?? "Information Technology Services";

        // ── Build Metaplex-compatible JSON ────────────────────────────────────
        const metadata = {
            name: `AgentID: ${acc.name}`,
            description:
                "On-chain identity credential for an AI agent on Solana. " +
                "This soul-bound NFT cannot be transferred and represents the agent's " +
                "verified identity, reputation, and authorised capabilities.",
            image: `https://agentid.xyz/nft/${agentId}.png`,
            animation_url: null,
            external_url: `https://agentid.xyz/agent/${agentId}`,
            attributes: [
                { trait_type: "Agent Name", value: acc.name },
                { trait_type: "Framework", value: framework },
                { trait_type: "LLM Model", value: acc.model || "Unknown" },
                { trait_type: "Verified Level", value: verifiedLevel },
                { trait_type: "Reputation Score", value: reputationScore },
                { trait_type: "Can Trade DeFi", value: acc.canTradeDefi ? "Yes" : "No" },
                { trait_type: "Can Send Payments", value: acc.canSendPayments ? "Yes" : "No" },
                { trait_type: "Service Category", value: serviceCategory },
                { trait_type: "Registration Date", value: registeredDate },
                {
                    trait_type: "Max USDC per Tx",
                    value: `$${(acc.maxTxSizeUsdc.toNumber() / 1_000_000).toLocaleString("en-US")}`,
                },
                {
                    trait_type: "Total Transactions",
                    value: acc.totalTransactions.toNumber(),
                },
                {
                    trait_type: "Success Rate",
                    value:
                        acc.totalTransactions.toNumber() > 0
                            ? `${Math.round(
                                (acc.successfulTransactions.toNumber() /
                                    acc.totalTransactions.toNumber()) *
                                100
                            )}%`
                            : "N/A",
                },
            ],
            properties: {
                category: "identity",
                non_transferable: true,
                soul_bound: true,
                owner_wallet: ownerPubkey,
                program_id: PROGRAM_ID,
                agent_id_hex: agentId,
            },
        };

        // Cache for 5 minutes (reputation changes hourly)
        res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(200).json(metadata);
    } catch (err: unknown) {
        console.error("[metadata-api] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
