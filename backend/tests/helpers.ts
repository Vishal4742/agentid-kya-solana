import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AgentidProgram } from "../target/types/agentid_program";

export const BUBBLEGUM_PROGRAM_ID = new anchor.web3.PublicKey(
  "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY",
);
export const SPL_NOOP_PROGRAM_ID = new anchor.web3.PublicKey(
  "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
);
export const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new anchor.web3.PublicKey(
  "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK",
);
export const SHARED_MERKLE_TREE = new anchor.web3.PublicKey(
  "2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx",
);
export const ZERO_PAN_HASH = Array.from(Buffer.alloc(32));

type RegisterOverrides = Partial<{
  name: string;
  framework: number;
  model: string;
  agentWallet: anchor.web3.PublicKey;
  canTradeDefi: boolean;
  canSendPayments: boolean;
  canPublishContent: boolean;
  canAnalyzeData: boolean;
  maxTxSizeUsdc: anchor.BN;
  gstin: string;
  panHash: number[];
  serviceCategory: number;
  metadataUri: string;
}>;

export function deriveIdentityPda(
  owner: anchor.web3.PublicKey,
  programId: anchor.web3.PublicKey,
): anchor.web3.PublicKey {
  const [identityPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("agent-identity"), owner.toBuffer()],
    programId,
  );
  return identityPda;
}

export function deriveProgramConfigPda(
  programId: anchor.web3.PublicKey,
): anchor.web3.PublicKey {
  const [programConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("program-config")],
    programId,
  );
  return programConfigPda;
}

export function getRegisterAccounts(programId: anchor.web3.PublicKey) {
  const [treeAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
    [SHARED_MERKLE_TREE.toBytes()],
    BUBBLEGUM_PROGRAM_ID,
  );

  return {
    treeAuthority,
    merkleTree: SHARED_MERKLE_TREE,
    treeDelegate: deriveProgramConfigPda(programId),
    logWrapper: SPL_NOOP_PROGRAM_ID,
    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
  };
}

export function buildRegisterParams(
  owner: anchor.web3.PublicKey,
  params?: RegisterOverrides,
) {
  return {
    name: params?.name ?? "Test Agent",
    framework: params?.framework ?? 1,
    model: params?.model ?? "GPT-4",
    agentWallet: params?.agentWallet ?? owner,
    canTradeDefi: params?.canTradeDefi ?? true,
    canSendPayments: params?.canSendPayments ?? true,
    canPublishContent: params?.canPublishContent ?? true,
    canAnalyzeData: params?.canAnalyzeData ?? true,
    maxTxSizeUsdc: params?.maxTxSizeUsdc ?? new anchor.BN(100),
    gstin: params?.gstin ?? "27ABCDE1234F1Z5",
    panHash: params?.panHash ?? ZERO_PAN_HASH,
    serviceCategory: params?.serviceCategory ?? 1,
    metadataUri:
      params?.metadataUri ??
      "https://agentid-kya-solana.vercel.app/metadata/Test%20Agent.json",
  };
}

export async function registerAgentForOwner(
  program: Program<AgentidProgram>,
  owner: anchor.web3.Keypair,
  params?: RegisterOverrides,
): Promise<anchor.web3.PublicKey> {
  const identityPda = deriveIdentityPda(owner.publicKey, program.programId);

  await program.methods
    .registerAgent(buildRegisterParams(owner.publicKey, params))
    .accounts({
      owner: owner.publicKey,
      ...getRegisterAccounts(program.programId),
    })
    .signers([owner])
    .rpc();

  return identityPda;
}

export async function ensureAgentRegistered(
  program: Program<AgentidProgram>,
  provider: anchor.AnchorProvider,
  params?: RegisterOverrides,
): Promise<anchor.web3.PublicKey> {
  const owner = provider.wallet.publicKey;
  const identityPda = deriveIdentityPda(owner, program.programId);

  try {
    await program.methods
      .registerAgent(buildRegisterParams(owner, params))
      .accounts({
        owner,
        ...getRegisterAccounts(program.programId),
      })
      .rpc();
  } catch (error) {
    await program.account.agentIdentity.fetch(identityPda).catch(() => {
      throw error;
    });
  }

  return identityPda;
}
