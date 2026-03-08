import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AgentidProgram } from "../target/types/agentid_program";
import { assert } from "chai";

describe("agentid-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.agentidProgram as Program<AgentidProgram>;

  const oracle = anchor.web3.Keypair.generate();
  const rater = anchor.web3.Keypair.generate();
  let agentIdentityPda: anchor.web3.PublicKey;
  let programConfigPda: anchor.web3.PublicKey;

  const SEED_AGENT_IDENTITY = Buffer.from("agent-identity");
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

    [agentIdentityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_AGENT_IDENTITY, provider.wallet.publicKey.toBuffer()],
      program.programId
    );
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
    const params = {
      name: "Test Agent",
      framework: 1,
      model: "GPT-4",
      agentWallet: provider.wallet.publicKey,
      canTradeDefi: true,
      canSendPayments: true,
      canPublishContent: true,
      canAnalyzeData: true,
      maxTxSizeUsdc: new anchor.BN(100),
      gstin: "27ABCDE1234F1Z5",
      panHash: Array.from(Buffer.alloc(32, 1)),
      serviceCategory: 1,
    };

    await program.methods
      .registerAgent(params)
      .accounts({
        owner: provider.wallet.publicKey,
      })
      .rpc();

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
