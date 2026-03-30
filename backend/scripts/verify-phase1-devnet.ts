import * as anchor from "@coral-xyz/anchor";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const idl = require("../target/idl/agentid_program.json") as anchor.Idl & {
  address: string;
};

const DEVNET_RPC = "https://api.devnet.solana.com";
const METADATA_API_BASE = "https://agentid-metadata-api.vercel.app";
const PROGRAM_ID = new PublicKey(idl.address);
const DEFAULT_WALLET_PATH = "~/.config/solana/id.json";
const BUBBLEGUM_PROGRAM_ID = new PublicKey(
  "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY",
);
const SPL_NOOP_PROGRAM_ID = new PublicKey(
  "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
);
const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey(
  "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK",
);
const SHARED_MERKLE_TREE = new PublicKey(
  "2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx",
);
const ZERO_PAN_HASH = Array.from(Buffer.alloc(32));

const connection = new Connection(DEVNET_RPC, "confirmed");

function expandHome(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

async function loadKeypair(filePath: string): Promise<Keypair> {
  const raw = await fs.readFile(expandHome(filePath), "utf8");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function getProvider(keypair: Keypair): anchor.AnchorProvider {
  return new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(keypair),
    { commitment: "confirmed" },
  );
}

function getProgram(provider: anchor.AnchorProvider): anchor.Program {
  return new anchor.Program(idl, provider);
}

function deriveIdentityPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-identity"), owner.toBuffer()],
    PROGRAM_ID,
  )[0];
}

function deriveProgramConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("program-config")],
    PROGRAM_ID,
  )[0];
}

function deriveActionPda(identity: PublicKey, actionId: anchor.BN): PublicKey {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(actionId.toString()));

  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-action"), identity.toBuffer(), nonceBuffer],
    PROGRAM_ID,
  )[0];
}

function getRegisterAccounts() {
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [SHARED_MERKLE_TREE.toBytes()],
    BUBBLEGUM_PROGRAM_ID,
  );

  return {
    treeAuthority,
    merkleTree: SHARED_MERKLE_TREE,
    treeDelegate: deriveProgramConfigPda(),
    logWrapper: SPL_NOOP_PROGRAM_ID,
    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
  };
}

async function fundKeypair(
  provider: anchor.AnchorProvider,
  recipient: PublicKey,
  sol: number,
): Promise<string> {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: recipient,
      lamports: Math.round(sol * LAMPORTS_PER_SOL),
    }),
  );

  return provider.sendAndConfirm(tx, []);
}

async function main(): Promise<void> {
  const walletPath = process.env.SOLANA_WALLET_PATH ?? DEFAULT_WALLET_PATH;
  const adminKeypair = await loadKeypair(walletPath);
  const adminProvider = getProvider(adminKeypair);
  const adminProgram = getProgram(adminProvider);
  const configPda = deriveProgramConfigPda();
  const config = await (adminProgram.account as any).programConfig.fetch(configPda);

  if (!adminKeypair.publicKey.equals(config.oracleAuthority)) {
    throw new Error(
      `Wallet ${adminKeypair.publicKey.toBase58()} is not the configured oracle authority ${config.oracleAuthority.toBase58()}`,
    );
  }

  const owner = Keypair.generate();
  const rater = Keypair.generate();
  const ownerProvider = getProvider(owner);
  const raterProvider = getProvider(rater);
  const ownerProgram = getProgram(ownerProvider);
  const raterProgram = getProgram(raterProvider);

  const fundingOwnerSig = await fundKeypair(
    adminProvider,
    owner.publicKey,
    0.5,
  );
  const fundingRaterSig = await fundKeypair(
    adminProvider,
    rater.publicKey,
    0.5,
  );

  const uniqueName = `Phase1-${Date.now()}`;
  const metadataUri = `${METADATA_API_BASE}/metadata/${encodeURIComponent(uniqueName)}.json`;
  const identityPda = deriveIdentityPda(owner.publicKey);

  const registerSig = await (ownerProgram.methods as any)
    .registerAgent({
      name: uniqueName,
      framework: 0,
      model: "GPT-4",
      agentWallet: owner.publicKey,
      canTradeDefi: false,
      canSendPayments: true,
      canPublishContent: true,
      canAnalyzeData: true,
      maxTxSizeUsdc: new anchor.BN(50 * 1_000_000),
      gstin: "",
      panHash: ZERO_PAN_HASH,
      serviceCategory: 0,
      metadataUri,
    })
    .accounts({
      owner: owner.publicKey,
      ...getRegisterAccounts(),
    })
    .signers([owner])
    .rpc();

  const initialIdentity = await (ownerProgram.account as any).agentIdentity.fetch(
    identityPda,
  );

  const verification = await (ownerProgram.methods as any)
    .verifyAgent(1)
    .accounts({ identity: identityPda })
    .view();

  const actionPda = deriveActionPda(
    identityPda,
    initialIdentity.totalTransactions,
  );
  const logActionSig = await (ownerProgram.methods as any)
    .logAction({
      actionType: 1,
      programCalled: SystemProgram.programId,
      success: true,
      usdcTransferred: new anchor.BN(1_000_000),
      memo: "phase1 devnet verification",
    })
    .accounts({
      identity: identityPda,
      action: actionPda,
      payer: owner.publicKey,
    })
    .signers([owner])
    .rpc();

  const rateSig = await (raterProgram.methods as any)
    .rateAgent(5)
    .accounts({
      identity: identityPda,
      rater: rater.publicKey,
    })
    .signers([rater])
    .rpc();

  const reputationSig = await (adminProgram.methods as any)
    .updateReputation(875)
    .accounts({
      identity: identityPda,
      config: configPda,
      oracle: adminKeypair.publicKey,
    })
    .rpc();

  const finalIdentity = await (ownerProgram.account as any).agentIdentity.fetch(identityPda);

  console.log(
    JSON.stringify(
      {
        rpcUrl: DEVNET_RPC,
        adminWallet: adminKeypair.publicKey.toBase58(),
        configPda: configPda.toBase58(),
        oracleAuthority: config.oracleAuthority.toBase58(),
        ownerWallet: owner.publicKey.toBase58(),
        raterWallet: rater.publicKey.toBase58(),
        identityPda: identityPda.toBase58(),
        metadataUri,
        fundingOwnerSig,
        fundingRaterSig,
        registerSig,
        logActionSig,
        rateSig,
        reputationSig,
        verification,
        finalIdentity: {
          owner: finalIdentity.owner.toBase58(),
          name: finalIdentity.name,
          ratingCount: finalIdentity.ratingCount,
          humanRatingX10: finalIdentity.humanRatingX10,
          reputationScore: finalIdentity.reputationScore,
          totalTransactions: finalIdentity.totalTransactions.toString(),
          credentialNft: finalIdentity.credentialNft.toBase58(),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Phase 1 devnet verification failed:", error);
  process.exit(1);
});
