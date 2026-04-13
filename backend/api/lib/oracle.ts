import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program, Wallet } from "@coral-xyz/anchor";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const idl = require("../idl/agentid_program.json") as Idl;

type OracleRuntime = {
  program: Program;
  programId: PublicKey;
  oracleWallet: Wallet;
  configPda: PublicKey;
};

type AgentAccount = {
  name: string;
  totalTransactions: { toNumber(): number };
  successfulTransactions: { toNumber(): number };
  humanRatingX10: number;
  ratingCount: number;
  registeredAt: { toNumber(): number };
  verifiedLevel: number;
  reputationScore: number;
};

type WebhookTransaction = {
  signature?: string;
  transactionError?: unknown;
  meta?: {
    err?: unknown;
    logMessages?: string[];
  };
  accountData?: Array<{ account: string }>;
  transaction?: {
    message?: {
      accountKeys?: string[];
    };
  };
};

const RPC_URL =
  process.env.SOLANA_RPC_URL?.trim() || "https://api.devnet.solana.com";
const CONFIG_SEED = Buffer.from("program-config");
const TREASURY_SEED = Buffer.from("agent-treasury");

function createOracleRuntime(): OracleRuntime {
  const privateKeyString = process.env.ORACLE_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error("Missing ORACLE_PRIVATE_KEY");
  }

  let secretKey: Uint8Array;
  try {
    secretKey = Uint8Array.from(JSON.parse(privateKeyString));
  } catch {
    throw new Error("Invalid ORACLE_PRIVATE_KEY format");
  }

  const oracleWallet = new Wallet(Keypair.fromSecretKey(secretKey));
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, oracleWallet, {
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
  const program = new Program(idl, provider);
  const programId = program.programId;
  const [configPda] = PublicKey.findProgramAddressSync(
    [CONFIG_SEED],
    programId
  );

  return {
    program,
    programId,
    oracleWallet,
    configPda,
  };
}

async function computeVolumeScore(
  runtime: OracleRuntime,
  identity: PublicKey
): Promise<number> {
  try {
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [TREASURY_SEED, identity.toBytes()],
      runtime.programId
    );
    const treasury = await (runtime.program.account as any).agentTreasury.fetch(
      treasuryPda
    );
    const totalEarnedUsdc = Number(treasury.totalEarned) / 1_000_000;
    return Math.min(totalEarnedUsdc / 100_000, 1) * 150;
  } catch {
    return 0;
  }
}

async function computeReputationScore(
  runtime: OracleRuntime,
  identity: PublicKey,
  agentData: AgentAccount
): Promise<number> {
  const totalTx = agentData.totalTransactions.toNumber();
  const successTx = agentData.successfulTransactions.toNumber();
  const ratingX10 = agentData.humanRatingX10;
  const ratingCount = agentData.ratingCount;
  const regAt = agentData.registeredAt.toNumber();
  const verLevel = agentData.verifiedLevel;

  const successRate = totalTx === 0 ? 0 : successTx / totalTx;
  const scoreSuccess = successRate * 400;

  const actualRating = ratingCount === 0 ? 3 : ratingX10 / 10;
  const scoreRating = Math.max(0, ((actualRating - 1) / 4) * 200);

  const daysSinceReg = (Date.now() / 1000 - regAt) / (60 * 60 * 24);
  const scoreLongevity = Math.min(Math.max(daysSinceReg, 0) / 365, 1) * 150;
  const scoreVolume = await computeVolumeScore(runtime, identity);

  let scoreVerification = 0;
  if (verLevel === 1) scoreVerification = 50;
  if (verLevel === 2) scoreVerification = 100;
  if (verLevel === 3) scoreVerification = 200;

  const totalScore = Math.floor(
    scoreSuccess +
      scoreRating +
      scoreLongevity +
      scoreVolume +
      scoreVerification
  );

  return Math.min(Math.max(totalScore, 0), 1000);
}

async function updateReputation(
  runtime: OracleRuntime,
  identity: PublicKey,
  score: number
) {
  return (runtime.program.methods as any)
    .updateReputation(score)
    .accountsStrict({
      identity,
      oracle: runtime.oracleWallet.publicKey,
      config: runtime.configPda,
    })
    .rpc();
}

async function findAgentIdentityFromKeys(
  runtime: OracleRuntime,
  accountKeys: string[]
): Promise<{ identity: PublicKey; agentData: AgentAccount } | null> {
  for (const key of accountKeys) {
    try {
      const pk = new PublicKey(key);
      if (
        pk.equals(runtime.programId) ||
        pk.equals(runtime.oracleWallet.publicKey)
      ) {
        continue;
      }

      const data = (await (runtime.program.account as any).agentIdentity.fetch(
        pk
      )) as AgentAccount;
      return { identity: pk, agentData: data };
    } catch {
      continue;
    }
  }

  return null;
}

export async function processWebhookTransactions(
  transactions: WebhookTransaction[]
) {
  const runtime = createOracleRuntime();
  const accepted: Array<{
    signature: string;
    identity: string;
    score: number;
  }> = [];

  for (const tx of transactions) {
    const hasTxError = tx.meta?.err !== null && tx.meta?.err !== undefined;
    if (hasTxError || tx.transactionError) {
      continue;
    }

    const logs = tx.meta?.logMessages || [];
    const isOurs = logs.some((line) =>
      line.includes(runtime.programId.toBase58())
    );
    if (!isOurs) continue;

    const logStr = logs.join(" ");
    const isRelevantInstruction =
      logStr.includes("Instruction: LogAction") ||
      logStr.includes("Instruction: RateAgent") ||
      logStr.includes("Instruction: Rate");
    if (!isRelevantInstruction) continue;

    const accountKeys =
      tx.accountData?.map((entry) => entry.account) ||
      tx.transaction?.message?.accountKeys ||
      [];

    const located = await findAgentIdentityFromKeys(runtime, accountKeys);
    if (!located) {
      continue;
    }

    const score = await computeReputationScore(
      runtime,
      located.identity,
      located.agentData
    );
    await updateReputation(runtime, located.identity, score);

    accepted.push({
      signature: tx.signature ?? "unknown",
      identity: located.identity.toBase58(),
      score,
    });
  }

  return accepted;
}
