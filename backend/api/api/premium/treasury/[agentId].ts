import type { IncomingMessage, ServerResponse } from "http";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { ACTIVE_RPC_URL } from "../../../metadata/_shared";
import { verifyX402Payment } from "../../../lib/x402";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const idl = require("../../../idl/agentid_program.json") as Idl;

type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): VercelResponse;
};

type TreasuryAccount = {
  owner: PublicKey;
  usdcMint: PublicKey;
  usdcBalance: { toNumber(): number };
  totalEarned: { toNumber(): number };
  totalSpent: { toNumber(): number };
  spendingLimitPerTx: { toNumber(): number };
  spendingLimitPerDay: { toNumber(): number };
  spentToday: { toNumber(): number };
  dayResetTimestamp: { toNumber(): number };
  emergencyPause: boolean;
  multisigRequiredAbove: { toNumber(): number };
};

type IdentityAccount = {
  name: string;
  agentWallet: PublicKey;
  reputationScore: number;
  verifiedLevel: number;
};

const PROGRAM_ID = new PublicKey(
  (idl as unknown as { address: string }).address
);
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const VERIFIED_LEVELS = [
  "Unverified",
  "EmailVerified",
  "KYBVerified",
  "Audited",
];
const DEFAULT_PRICE_USDC = 0.05;

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

function deriveAssociatedTokenAddress(owner: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function parseRequiredPrice(): number {
  const raw = Number(
    process.env.X402_TREASURY_QUERY_PRICE_USDC ?? DEFAULT_PRICE_USDC
  );
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_PRICE_USDC;
  }
  return raw;
}

function normalizeUsdc(raw: { toNumber(): number }): number {
  return raw.toNumber() / 1_000_000;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawAgentId = req.query["agentId"];
  const agentId = Array.isArray(rawAgentId) ? rawAgentId[0] : rawAgentId;

  if (typeof agentId !== "string" || agentId.trim().length === 0) {
    return res.status(400).json({ error: "agentId is required" });
  }

  let identityPubkey: PublicKey;
  try {
    identityPubkey = new PublicKey(agentId);
  } catch {
    return res
      .status(400)
      .json({ error: "agentId must be a valid base58 public key" });
  }

  try {
    const connection = new Connection(ACTIVE_RPC_URL, "confirmed");
    const provider = buildReadonlyProvider(connection);
    const program = new Program(idl, provider);

    let identity: IdentityAccount;
    try {
      identity = (await (program.account as any).agentIdentity.fetch(
        identityPubkey
      )) as IdentityAccount;
    } catch {
      return res.status(404).json({ error: "Agent identity not found" });
    }

    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent-treasury"), identityPubkey.toBytes()],
      PROGRAM_ID
    );
    let treasury: TreasuryAccount;
    try {
      treasury = (await (program.account as any).agentTreasury.fetch(
        treasuryPda
      )) as TreasuryAccount;
    } catch {
      return res.status(404).json({
        error: "Treasury not initialized for this agent",
      });
    }
    const treasuryTokenAccount = deriveAssociatedTokenAddress(
      treasuryPda,
      treasury.usdcMint
    );

    const paymentGate = await verifyX402Payment(
      req.headers,
      parseRequiredPrice(),
      treasuryPda.toBase58(),
      treasuryTokenAccount.toBase58(),
      treasury.usdcMint.toBase58()
    );

    if (!paymentGate.ok) {
      return res.status(paymentGate.status).json(paymentGate.body);
    }

    const response = {
      agent: {
        identity: identityPubkey.toBase58(),
        name: identity.name,
        agent_wallet: identity.agentWallet.toBase58(),
        reputation_score: identity.reputationScore,
        verified_level:
          VERIFIED_LEVELS[identity.verifiedLevel] ?? VERIFIED_LEVELS[0],
      },
      treasury: {
        address: treasuryPda.toBase58(),
        usdc_mint: treasury.usdcMint.toBase58(),
        treasury_token_account: treasuryTokenAccount.toBase58(),
        usdc_balance: normalizeUsdc(treasury.usdcBalance),
        total_earned: normalizeUsdc(treasury.totalEarned),
        total_spent: normalizeUsdc(treasury.totalSpent),
        spending_limit_per_tx: normalizeUsdc(treasury.spendingLimitPerTx),
        spending_limit_per_day: normalizeUsdc(treasury.spendingLimitPerDay),
        spent_today: normalizeUsdc(treasury.spentToday),
        day_reset_timestamp: treasury.dayResetTimestamp.toNumber() * 1000,
        emergency_pause: treasury.emergencyPause,
        multisig_required_above: normalizeUsdc(treasury.multisigRequiredAbove),
        owner: treasury.owner.toBase58(),
      },
      payment: paymentGate.payment,
    };

    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(response);
  } catch (error) {
    console.error("[premium/treasury] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
