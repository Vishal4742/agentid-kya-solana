import dotenv from "dotenv";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, Wallet } from "@coral-xyz/anchor";
// @ts-ignore
import idl from "./idl/agentid_program.json";

dotenv.config();

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

type OracleRuntime = {
  program: Program;
  programId: PublicKey;
  oracleWallet: Wallet;
  configPda: PublicKey;
};

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const CONFIG_SEED = Buffer.from("program-config");
const TREASURY_SEED = Buffer.from("agent-treasury");

export function createOracleRuntime(): OracleRuntime {
  const privateKeyString = process.env.ORACLE_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error("Missing ORACLE_PRIVATE_KEY in environment");
  }

  let secretKey: Uint8Array;
  try {
    secretKey = Uint8Array.from(JSON.parse(privateKeyString));
  } catch {
    throw new Error("Invalid ORACLE_PRIVATE_KEY format. Must be a JSON array.");
  }

  const oracleWallet = new Wallet(Keypair.fromSecretKey(secretKey));
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, oracleWallet, {
    preflightCommitment: "confirmed",
    commitment: "confirmed",
  });
  const program = new Program(idl as Idl, provider);
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

export async function syncAllAgents(runtime: OracleRuntime) {
  const allAgents = await (runtime.program.account as any).agentIdentity.all();
  const updated: Array<{
    identity: string;
    name: string;
    previous: number;
    next: number;
  }> = [];

  for (const agent of allAgents) {
    const identity = agent.publicKey as PublicKey;
    const agentData = agent.account as AgentAccount;
    const newScore = await computeReputationScore(runtime, identity, agentData);

    if (agentData.reputationScore === newScore) {
      continue;
    }

    await updateReputation(runtime, identity, newScore);
    updated.push({
      identity: identity.toBase58(),
      name: agentData.name,
      previous: agentData.reputationScore,
      next: newScore,
    });
  }

  return {
    scanned: allAgents.length,
    updated,
  };
}
