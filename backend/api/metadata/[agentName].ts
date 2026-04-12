import type { IncomingMessage, ServerResponse } from "http";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const idl = require("../idl/agentid_program.json") as Idl;

type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
};
type VercelResponse = ServerResponse & {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): VercelResponse;
};

const ACTIVE_RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID = (idl as unknown as { address: string }).address;
const SEED_PREFIX = Buffer.from("agent-identity");

// Frontend base URL — no custom domain needed.
// Set FRONTEND_BASE in Vercel env vars once you know your deployment URL.
const FRONTEND_BASE =
  process.env.FRONTEND_BASE ?? "https://agentid-kya-solana.vercel.app";

const FRAMEWORKS = ["ELIZA", "AutoGen", "CrewAI", "LangGraph", "Custom"];
const VERIFIED_LEVELS = [
  "Unverified",
  "EmailVerified",
  "KYBVerified",
  "Audited",
];
const CATEGORIES = [
  "Information Technology Services",
  "Financial Services",
  "Consulting Services",
  "Marketing & Advertising",
  "Research & Development",
];

function buildReadonlyProvider(connection: Connection): AnchorProvider {
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: unknown) => tx,
    signAllTransactions: async (txs: unknown[]) => txs,
  };
  return new AnchorProvider(connection, wallet as never, {
    commitment: "confirmed",
  });
}

/**
 * GET /api/metadata/[agentName]
 * Returns Metaplex-compatible JSON for the named agent.
 * The agent name is the same string stored in AgentIdentity.name.
 * This allows the Register wizard to set metadataUri = `${FRONTEND_BASE}/metadata/${name}.json`
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const rawName = req.query["agentName"];
  if (
    typeof rawName !== "string" ||
    rawName.length < 3 ||
    rawName.length > 68
  ) {
    return res
      .status(400)
      .json({ error: "Agent name must be 3–64 characters" });
  }

  // Strip the .json extension if present
  const agentName = rawName.replace(/\.json$/, "");

  try {
    const connection = new Connection(ACTIVE_RPC_URL, "confirmed");
    const provider = buildReadonlyProvider(connection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(idl, provider);
    const programPubkey = new PublicKey(PROGRAM_ID);

    // ── Find AgentIdentity accounts by name (memcmp on name field) ─────────
    // Layout: discriminator(8) + agent_id(32) + owner(32) + agent_wallet(32)
    // + name: starts at byte 8+32+32+32 = 104 as a borsh string
    // Borsh string = 4-byte little-endian length prefix + UTF-8 bytes
    // Use RPC filter: search all AgentIdentity accounts where name starts with the target
    // For simplicity, fetch all and filter in-process (<=1000 agents on devnet is fine)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (program.account as any).agentIdentity.all();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = all.find((a: any) => a.account.name === agentName);

    if (!match) {
      // Return a static placeholder so Bubblegum doesn't fail during mint
      const placeholder = {
        name: `AgentID: ${agentName}`,
        symbol: "AGID",
        description:
          "Soul-bound AI agent credential on AgentID Protocol (Solana).",
        image: `${FRONTEND_BASE}/nft/placeholder.png`,
        external_url: `${FRONTEND_BASE}/agent/${encodeURIComponent(agentName)}`,
        attributes: [
          { trait_type: "Agent Name", value: agentName },
          { trait_type: "Status", value: "Pending on-chain verification" },
        ],
        properties: {
          category: "identity",
          non_transferable: true,
          soul_bound: true,
        },
      };
      res.setHeader("Cache-Control", "public, s-maxage=30");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json(placeholder);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acc: any = match.account;
    const ownerPubkey: string = acc.owner.toBase58();

    // Derive agentId hex for image URL
    const [pda] = PublicKey.findProgramAddressSync(
      [SEED_PREFIX, acc.owner.toBytes()],
      programPubkey,
    );
    const pdaHex = Buffer.from(pda.toBytes()).toString("hex");

    const framework = FRAMEWORKS[acc.framework] ?? "Custom";
    const verifiedLevel = VERIFIED_LEVELS[acc.verifiedLevel] ?? "Unverified";
    const serviceCategory =
      CATEGORIES[acc.serviceCategory] ?? "Information Technology Services";
    const registeredDate = new Date(acc.registeredAt.toNumber() * 1000)
      .toISOString()
      .split("T")[0];

    const metadata = {
      name: `AgentID: ${acc.name}`,
      symbol: "AGID",
      description:
        "Soul-bound AI agent identity credential on the AgentID Protocol (Solana). " +
        "Non-transferable. Represents verified identity, reputation, and capabilities.",
      image: `${FRONTEND_BASE}/nft/${pdaHex}.png`,
      external_url: `${FRONTEND_BASE}/agent/${pda.toBase58()}`,
      attributes: [
        { trait_type: "Agent Name", value: acc.name },
        { trait_type: "Framework", value: framework },
        { trait_type: "LLM Model", value: acc.model || "Unknown" },
        { trait_type: "Verified Level", value: verifiedLevel },
        { trait_type: "Reputation Score", value: acc.reputationScore },
        {
          trait_type: "Can Trade DeFi",
          value: acc.canTradeDefi ? "Yes" : "No",
        },
        {
          trait_type: "Can Send Payments",
          value: acc.canSendPayments ? "Yes" : "No",
        },
        { trait_type: "Service Category", value: serviceCategory },
        { trait_type: "Registration Date", value: registeredDate },
        {
          trait_type: "Max USDC per Tx",
          value: `$${(acc.maxTxSizeUsdc.toNumber() / 1_000_000).toFixed(0)}`,
        },
        {
          trait_type: "Total Transactions",
          value: acc.totalTransactions.toNumber(),
        },
      ],
      properties: {
        category: "identity",
        non_transferable: true,
        soul_bound: true,
        owner_wallet: ownerPubkey,
        program_id: PROGRAM_ID,
      },
    };

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=60",
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(metadata);
  } catch (err) {
    console.error("[metadata/name] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
