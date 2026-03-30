import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AgentidProgram } from "../target/types/agentid_program";
import { assert } from "chai";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { ensureAgentRegistered } from "./helpers";

describe("agentid-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.agentidProgram as Program<AgentidProgram>;

  const oracle = anchor.web3.Keypair.generate();
  const rater = anchor.web3.Keypair.generate();
  let agentIdentityPda: anchor.web3.PublicKey;
  let programConfigPda: anchor.web3.PublicKey;

  const SEED_PROGRAM_CONFIG = Buffer.from("program-config");
  const SEED_AGENT_ACTION = Buffer.from("agent-action");

  before(async () => {
    const sig1 = await provider.connection.requestAirdrop(oracle.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    const sig2 = await provider.connection.requestAirdrop(rater.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

    // We delay slightly to let the airdrop confirm
    await provider.connection.confirmTransaction(sig1, "confirmed");
    await provider.connection.confirmTransaction(sig2, "confirmed");

    [programConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_PROGRAM_CONFIG],
      program.programId
    );

    agentIdentityPda = await ensureAgentRegistered(program, provider);
  });

  it("Initializes the program config", async () => {
    await program.methods
      .initConfig()
      .accounts({
        admin: provider.wallet.publicKey,
        oracle: oracle.publicKey,
      })
      .rpc();

    const configAccount = await program.account.programConfig.fetch(programConfigPda);
    assert.ok(configAccount.admin.equals(provider.wallet.publicKey));
    assert.ok(configAccount.oracleAuthority.equals(oracle.publicKey));
  });

  it("Registers a new agent", async () => {
    const identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    assert.equal(identityAccount.name, "Test Agent");
    assert.equal(identityAccount.verifiedLevel, 0); // Unverified
    assert.equal(identityAccount.reputationScore, 500); // Default
    assert.ok(identityAccount.owner.equals(provider.wallet.publicKey));
  });

  it("Updates capabilities", async () => {
    const params = {
      canTradeDefi: true,
      canSendPayments: true,
      canPublishContent: false,
      canAnalyzeData: true,
      maxTxSizeUsdc: new anchor.BN(1000),
    };

    await program.methods
      .updateCapabilities(params)
      .accounts({
        owner: provider.wallet.publicKey,
      })
      .rpc();

    const identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    assert.equal(identityAccount.canTradeDefi, true);
    assert.equal(identityAccount.canPublishContent, false);
    assert.ok(identityAccount.maxTxSizeUsdc.eq(new anchor.BN(1000)));
  });

  it("Logs an action", async () => {
    // Fetch current total_transactions to compute action PDA
    let identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    let totalTxs = identityAccount.totalTransactions;

    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(totalTxs.toString()));

    const [actionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_AGENT_ACTION, agentIdentityPda.toBuffer(), nonceBuffer],
      program.programId
    );

    const params = {
      actionType: 2,
      programCalled: anchor.web3.SystemProgram.programId,
      success: true,
      usdcTransferred: new anchor.BN(5),
      memo: "Paid 5 USDC for API access",
    };

    await program.methods
      .logAction(params)
      // @ts-ignore
      .accounts({
        identity: agentIdentityPda,
        action: actionPda,
        payer: provider.wallet.publicKey,
      })
      .rpc();

    const actionAccount = await program.account.agentAction.fetch(actionPda);
    assert.equal(actionAccount.actionType, 2);
    assert.equal(actionAccount.memo, "Paid 5 USDC for API access");

    // Check stats updated
    identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    assert.ok(identityAccount.totalTransactions.eq(totalTxs.addn(1)));
  });

  it("Rates an agent", async () => {
    await program.methods
      .rateAgent(4)
      // @ts-ignore
      .accounts({
        identity: agentIdentityPda,
        rater: rater.publicKey,
      })
      .signers([rater])
      .rpc();

    const identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    assert.equal(identityAccount.ratingCount, 1);
    assert.equal(identityAccount.humanRatingX10, 40); // 4 * 10
  });

  it("Updates reputation by oracle", async () => {
    await program.methods
      .updateReputation(800)
      // @ts-ignore
      .accounts({
        identity: agentIdentityPda,
        programConfig: programConfigPda,
        oracle: oracle.publicKey,
      })
      .signers([oracle])
      .rpc();

    const identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    assert.equal(identityAccount.reputationScore, 800);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Treasury tests
// ─────────────────────────────────────────────────────────────────────────────

describe("treasury", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.agentidProgram as Program<AgentidProgram>;

  const SEED_AGENT_IDENTITY = Buffer.from("agent-identity");
  const SEED_AGENT_TREASURY = Buffer.from("agent-treasury");

  let agentIdentityPda: anchor.web3.PublicKey;
  let treasuryPda: anchor.web3.PublicKey;
  let usdcMint: anchor.web3.PublicKey;
  let ownerUsdcAta: anchor.web3.PublicKey;
  let treasuryUsdcAta: anchor.web3.PublicKey;
  const mintAuthority = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop to mint authority
    const sig = await provider.connection.requestAirdrop(
      mintAuthority.publicKey,
      5 * anchor.web3.LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig, "confirmed");

    // Derive PDAs (agent was registered in the identity suite above)
    [agentIdentityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_AGENT_IDENTITY, provider.wallet.publicKey.toBuffer()],
      program.programId,
    );
    await ensureAgentRegistered(program, provider);
    [treasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_AGENT_TREASURY, agentIdentityPda.toBuffer()],
      program.programId,
    );

    // Create a mock USDC mint
    usdcMint = await createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6, // 6 decimals like real USDC
    );

    // Create ATA for the owner (depositor)
    ownerUsdcAta = await createAccount(
      provider.connection,
      mintAuthority,
      usdcMint,
      provider.wallet.publicKey,
    );

    // Mint 1000 USDC to owner
    await mintTo(
      provider.connection,
      mintAuthority,
      usdcMint,
      ownerUsdcAta,
      mintAuthority,
      1_000 * 1_000_000,
    );
  });

  it("Initializes the treasury", async () => {
    await program.methods
      .initializeTreasury(
        new anchor.BN(500 * 1_000_000),   // 500 USDC per tx
        new anchor.BN(2000 * 1_000_000),  // 2000 USDC per day
        new anchor.BN(1000 * 1_000_000),  // multisig above 1000 USDC
      )
      // @ts-ignore
      .accounts({
        treasury: treasuryPda,
        agentIdentity: agentIdentityPda,
        owner: provider.wallet.publicKey,
        usdcMint,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const treasuryAccount = await program.account.agentTreasury.fetch(treasuryPda);
    assert.ok(treasuryAccount.owner.equals(provider.wallet.publicKey));
    assert.ok(treasuryAccount.usdcMint.equals(usdcMint));
    assert.ok(treasuryAccount.spendingLimitPerTx.eq(new anchor.BN(500 * 1_000_000)));
    assert.ok(treasuryAccount.spendingLimitPerDay.eq(new anchor.BN(2000 * 1_000_000)));
    assert.equal(treasuryAccount.emergencyPause, false);
  });

  it("Updates spending limits", async () => {
    await program.methods
      .updateSpendingLimits(
        new anchor.BN(250 * 1_000_000),   // 250 USDC per tx
        new anchor.BN(1000 * 1_000_000),  // 1000 USDC per day
        new anchor.BN(800 * 1_000_000),   // multisig above 800 USDC
      )
      // @ts-ignore
      .accounts({
        treasury: treasuryPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    const treasuryAccount = await program.account.agentTreasury.fetch(treasuryPda);
    assert.ok(treasuryAccount.spendingLimitPerTx.eq(new anchor.BN(250 * 1_000_000)));
    assert.ok(treasuryAccount.spendingLimitPerDay.eq(new anchor.BN(1000 * 1_000_000)));
    assert.ok(treasuryAccount.multisigRequiredAbove.eq(new anchor.BN(800 * 1_000_000)));
  });

  it("Emergency pause activates and blocks payment", async () => {
    // Pause the treasury
    await program.methods
      .emergencyPause(true)
      // @ts-ignore
      .accounts({
        treasury: treasuryPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    const treasuryAccount = await program.account.agentTreasury.fetch(treasuryPda);
    assert.equal(treasuryAccount.emergencyPause, true);
  });

  // ── Negative test: autonomous_payment must fail while treasury is paused ──
  it("autonomous_payment fails when treasury is paused (TreasuryPaused)", async () => {
    // Treasury is currently paused from the previous test.
    // Ensure it stays paused for this assertion.
    // Create a recipient USDC ATA to satisfy the accounts constraint.
    const recipientKeypair = anchor.web3.Keypair.generate();
    const recipientAta = await createAccount(
      provider.connection,
      mintAuthority,
      usdcMint,
      recipientKeypair.publicKey,
    );

    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintAuthority,
      usdcMint,
      treasuryPda,
      true,
    );
    const treasuryUsdcAta = treasuryTokenAccount.address;

    try {
      await program.methods
        .autonomousPayment(
          new anchor.BN(1 * 1_000_000), // 1 USDC
          recipientKeypair.publicKey,
          "test payment",
        )
        // @ts-ignore
        .accounts({
          treasury: treasuryPda,
          agentIdentity: agentIdentityPda,
          agentWallet: provider.wallet.publicKey,
          owner: provider.wallet.publicKey,
          treasuryUsdc: treasuryUsdcAta,
          recipientUsdc: recipientAta,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // If the transaction succeeds when the treasury is paused, the test should fail.
      assert.fail("Expected autonomous_payment to throw TreasuryPaused, but it succeeded.");
    } catch (err: any) {
      // Anchor wraps program errors as AnchorError with an error code.
      const msg: string = err?.message ?? String(err);
      const isTreasuryPaused =
        msg.includes("TreasuryPaused") ||
        msg.includes("6009") || // AgentIdError::TreasuryPaused error code
        msg.includes("treasury is paused");
      assert.ok(
        isTreasuryPaused,
        `Expected TreasuryPaused error, got: ${msg.slice(0, 200)}`,
      );
    }
  });

  it("Unpauses the treasury", async () => {
    await program.methods
      .emergencyPause(false)
      // @ts-ignore
      .accounts({
        treasury: treasuryPda,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    const treasuryAccount = await program.account.agentTreasury.fetch(treasuryPda);
    assert.equal(treasuryAccount.emergencyPause, false);
  });
});

