#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const backendPackageRequire = createRequire(
  path.resolve("backend/package.json"),
);

const anchor = backendPackageRequire("@coral-xyz/anchor");
const splToken = backendPackageRequire("@solana/spl-token");
const idl = backendPackageRequire("./idl/agentid_program.json");

const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} = anchor.web3;

const {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} = splToken;

const RPC_URL = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(idl.address);
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
const ONE_USDC = 1_000_000;

function loadDefaultWallet() {
  const walletPath =
    process.env.SOLANA_KEYPAIR ??
    path.join(os.homedir(), ".config", "solana", "id.json");
  const secret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function confirm(connection, signature, label) {
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed",
  );
  console.log(`  ${label}: ${signature}`);
}

async function airdrop(connection, pubkey, sol) {
  const sig = await connection.requestAirdrop(
    pubkey,
    Math.round(sol * LAMPORTS_PER_SOL),
  );
  await confirm(connection, sig, `airdrop ${sol} SOL`);
}

async function transferSol(connection, from, to, sol) {
  const tx = new anchor.web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: Math.round(sol * LAMPORTS_PER_SOL),
    }),
  );
  const sig = await connection.sendTransaction(tx, [from], {
    preflightCommitment: "confirmed",
  });
  await confirm(connection, sig, `transfer ${sol} SOL`);
  return sig;
}

function deriveIdentityPda(owner) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-identity"), owner.toBuffer()],
    PROGRAM_ID,
  );
}

function deriveProgramConfigPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("program-config")],
    PROGRAM_ID,
  );
}

function deriveTreasuryPda(identity) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-treasury"), identity.toBuffer()],
    PROGRAM_ID,
  );
}

function deriveTreeAuthority(merkleTree) {
  return PublicKey.findProgramAddressSync(
    [merkleTree.toBytes()],
    BUBBLEGUM_PROGRAM_ID,
  );
}

async function expectFailure(run, expectedFragments, label) {
  try {
    await run();
    throw new Error(`${label} unexpectedly succeeded`);
  } catch (error) {
    const message = error?.message ?? String(error);
    if (!expectedFragments.some((fragment) => message.includes(fragment))) {
      throw new Error(
        `${label} failed with unexpected error: ${message.slice(0, 400)}`,
      );
    }
    console.log(`  ${label}: observed expected failure`);
    return message;
  }
}

async function main() {
  console.log("AgentID devnet backend smoke");
  console.log(`  RPC: ${RPC_URL}`);
  console.log(`  Program: ${PROGRAM_ID.toBase58()}`);

  const connection = new Connection(RPC_URL, "confirmed");
  const feePayer = loadDefaultWallet();
  const owner = Keypair.generate();
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(owner),
    { commitment: "confirmed" },
  );
  const program = new anchor.Program(idl, provider);

  const txs = {};
  const failures = {};

  console.log("\n1. Funding test owner");
  txs.ownerFunding = await transferSol(connection, feePayer, owner.publicKey, 1);

  console.log("\n2. Registration");
  const [identityPda] = deriveIdentityPda(owner.publicKey);
  const [treeAuthority] = deriveTreeAuthority(SHARED_MERKLE_TREE);
  const [treeDelegate] = deriveProgramConfigPda();
  const uniqueName = `Devnet Smoke ${Date.now()}`;

  txs.register = await program.methods
    .registerAgent({
      name: uniqueName,
      framework: 1,
      model: "GPT-4",
      agentWallet: owner.publicKey,
      canTradeDefi: true,
      canSendPayments: true,
      canPublishContent: true,
      canAnalyzeData: true,
      maxTxSizeUsdc: new anchor.BN(500 * ONE_USDC),
      gstin: "27ABCDE1234F1Z5",
      panHash: Array.from(Buffer.alloc(32)),
      serviceCategory: 1,
      metadataUri: `https://agentid.netlify.app/metadata/${encodeURIComponent(uniqueName)}`,
    })
    .accounts({
      identity: identityPda,
      owner: owner.publicKey,
      treeAuthority,
      merkleTree: SHARED_MERKLE_TREE,
      treeDelegate,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([owner])
    .rpc();
  await confirm(connection, txs.register, "register_agent");

  const identity = await program.account.agentIdentity.fetch(identityPda);
  console.log(`  identity PDA: ${identityPda.toBase58()}`);
  console.log(`  registered name: ${identity.name}`);

  console.log("\n3. Treasury initialization");
  const [treasuryPda] = deriveTreasuryPda(identityPda);
  const usdcMint = await createMint(
    connection,
    feePayer,
    owner.publicKey,
    null,
    6,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID,
  );
  console.log(`  mint: ${usdcMint.toBase58()}`);

  txs.initializeTreasury = await program.methods
    .initializeTreasury(
      new anchor.BN(500 * ONE_USDC),
      new anchor.BN(2_000 * ONE_USDC),
      new anchor.BN(1_000 * ONE_USDC),
    )
    .accounts({
      treasury: treasuryPda,
      agentIdentity: identityPda,
      owner: owner.publicKey,
      usdcMint,
      systemProgram: SystemProgram.programId,
    })
    .signers([owner])
    .rpc();
  await confirm(connection, txs.initializeTreasury, "initialize_treasury");

  console.log("\n4. Deposit");
  const ownerAta = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    usdcMint,
    owner.publicKey,
  );
  const treasuryAta = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    usdcMint,
    treasuryPda,
    true,
  );

  txs.mintToOwner = await mintTo(
    connection,
    feePayer,
    usdcMint,
    ownerAta.address,
    owner,
    1_000 * ONE_USDC,
  );
  await confirm(connection, txs.mintToOwner, "mint_to owner");

  txs.deposit = await program.methods
    .deposit(new anchor.BN(125 * ONE_USDC))
    .accounts({
      treasury: treasuryPda,
      depositor: owner.publicKey,
      depositorUsdc: ownerAta.address,
      treasuryUsdc: treasuryAta.address,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([owner])
    .rpc();
  await confirm(connection, txs.deposit, "deposit");

  console.log("\n5. Spending limit update");
  txs.updateSpendingLimits = await program.methods
    .updateSpendingLimits(
      new anchor.BN(250 * ONE_USDC),
      new anchor.BN(1_000 * ONE_USDC),
      new anchor.BN(800 * ONE_USDC),
    )
    .accounts({
      treasury: treasuryPda,
      owner: owner.publicKey,
    })
    .signers([owner])
    .rpc();
  await confirm(connection, txs.updateSpendingLimits, "update_spending_limits");

  console.log("\n6. Pause and paused-payment failure");
  txs.pause = await program.methods
    .emergencyPause(true)
    .accounts({
      treasury: treasuryPda,
      owner: owner.publicKey,
    })
    .signers([owner])
    .rpc();
  await confirm(connection, txs.pause, "emergency_pause(true)");

  const pausedRecipient = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    usdcMint,
    Keypair.generate().publicKey,
  );

  failures.pausedPayment = await expectFailure(
    () =>
      program.methods
        .autonomousPayment(
          new anchor.BN(1 * ONE_USDC),
          pausedRecipient.owner,
          "paused payment check",
        )
        .accounts({
          treasury: treasuryPda,
          agentIdentity: identityPda,
          agentWallet: owner.publicKey,
          owner: owner.publicKey,
          treasuryUsdc: treasuryAta.address,
          recipientUsdc: pausedRecipient.address,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc(),
    ["TreasuryPaused", "6009", "treasury is paused"],
    "autonomous_payment while paused",
  );

  console.log("\n7. Unpause and successful payment");
  txs.unpause = await program.methods
    .emergencyPause(false)
    .accounts({
      treasury: treasuryPda,
      owner: owner.publicKey,
    })
    .signers([owner])
    .rpc();
  await confirm(connection, txs.unpause, "emergency_pause(false)");

  const recipientOwner = Keypair.generate();
  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayer,
    usdcMint,
    recipientOwner.publicKey,
  );

  txs.autonomousPaymentSuccess = await program.methods
    .autonomousPayment(
      new anchor.BN(10 * ONE_USDC),
      recipientOwner.publicKey,
      "devnet smoke payment",
    )
    .accounts({
      treasury: treasuryPda,
      agentIdentity: identityPda,
      agentWallet: owner.publicKey,
      owner: owner.publicKey,
      treasuryUsdc: treasuryAta.address,
      recipientUsdc: recipientAta.address,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([owner])
    .rpc();
  await confirm(connection, txs.autonomousPaymentSuccess, "autonomous_payment success");

  console.log("\n8. Post-unpause failure behavior");
  failures.perTxLimit = await expectFailure(
    () =>
      program.methods
        .autonomousPayment(
          new anchor.BN(300 * ONE_USDC),
          recipientOwner.publicKey,
          "should exceed per-tx limit",
        )
        .accounts({
          treasury: treasuryPda,
          agentIdentity: identityPda,
          agentWallet: owner.publicKey,
          owner: owner.publicKey,
          treasuryUsdc: treasuryAta.address,
          recipientUsdc: recipientAta.address,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc(),
    ["ExceedsPerTxLimit", "6004", "per-tx"],
    "autonomous_payment over per-tx limit",
  );

  console.log("\n9. On-chain state verification");
  const treasury = await program.account.agentTreasury.fetch(treasuryPda);
  const treasuryAtaAccount = await getAccount(connection, treasuryAta.address);
  const recipientAtaAccount = await getAccount(connection, recipientAta.address);

  console.log(
    JSON.stringify(
      {
        identityPda: identityPda.toBase58(),
        treasuryPda: treasuryPda.toBase58(),
        mint: usdcMint.toBase58(),
        treasuryBalanceRaw: treasury.usdcBalance.toString(),
        totalEarnedRaw: treasury.totalEarned.toString(),
        totalSpentRaw: treasury.totalSpent.toString(),
        spendingLimitPerTxRaw: treasury.spendingLimitPerTx.toString(),
        spendingLimitPerDayRaw: treasury.spendingLimitPerDay.toString(),
        emergencyPause: treasury.emergencyPause,
        treasuryAtaAmountRaw: treasuryAtaAccount.amount.toString(),
        recipientAtaAmountRaw: recipientAtaAccount.amount.toString(),
        txs,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("\nSmoke failed:");
  console.error(error);
  process.exit(1);
});
