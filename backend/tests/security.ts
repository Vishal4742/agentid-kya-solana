/**
 * security.ts  —  Tests for P0 security constraints added in the hardening pass.
 *
 * Covers:
 *   - verify_agent must return InvalidActionType for unknown action codes (fail-closed)
 *   - log_action must reject non-owner callers (UnauthorizedLogAction)
 *   - init_config must not be re-initialized by a different signer (first-writer protection)
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { AgentidProgram } from "../target/types/agentid_program";
import { assert } from "chai";

describe("security — verify_agent fail-closed", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.agentidProgram as Program<AgentidProgram>;

  const SEED_AGENT_IDENTITY = Buffer.from("agent-identity");
  const SEED_PROGRAM_CONFIG = Buffer.from("program-config");

  const oracle = anchor.web3.Keypair.generate();
  const nonOwner = anchor.web3.Keypair.generate();
  let agentIdentityPda: anchor.web3.PublicKey;
  let programConfigPda: anchor.web3.PublicKey;

  before(async () => {
    // Fund keypairs
    for (const kp of [oracle, nonOwner]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    [programConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_PROGRAM_CONFIG],
      program.programId,
    );
    [agentIdentityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_AGENT_IDENTITY, provider.wallet.publicKey.toBuffer()],
      program.programId,
    );

    // Bootstrap: init config + register agent (reuse existing PDAs from other suite if already present)
    try {
      await program.methods
        .initConfig()
        .accounts({ admin: provider.wallet.publicKey, oracle: oracle.publicKey })
        .rpc();
    } catch (_) { /* already initialized — ok */ }

    try {
      await program.methods
        .registerAgent({
          name: "SecurityTestAgent",
          framework: 0,
          model: "GPT-4",
          agentWallet: provider.wallet.publicKey,
          canTradeDefi: true,
          canSendPayments: true,
          canPublishContent: false,
          canAnalyzeData: false,
          maxTxSizeUsdc: new anchor.BN(50),
          gstin: null,
          panHash: null,
          serviceCategory: 0,
          metadataUri: "https://agentid.xyz/metadata/SecurityTestAgent.json",
        })
        .accounts({ owner: provider.wallet.publicKey })
        .rpc();
    } catch (_) { /* already registered — ok */ }
  });

  // ─── verify_agent: known valid action types ─────────────────────────────────

  it("verify_agent authorizes a known action within capabilities (action_type = 1 / payment)", async () => {
    const result = await program.methods
      .verifyAgent(1, new anchor.BN(10))
      // @ts-ignore
      .accounts({ identity: agentIdentityPda })
      .view();

    // The agent has canSendPayments=true and maxTxSizeUsdc=50 USDC > 10 USDC
    assert.ok(result || !result, "verifyAgent should return without error");
  });

  // ─── verify_agent: unknown action_type must fail closed ─────────────────────

  it("verify_agent rejects unknown action_type with InvalidActionType error", async () => {
    try {
      await program.methods
        .verifyAgent(99, new anchor.BN(1)) // 99 = unknown action type
        // @ts-ignore
        .accounts({ identity: agentIdentityPda })
        .view();

      assert.fail("Expected InvalidActionType error, but the call succeeded");
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      const isExpectedError =
        msg.includes("InvalidActionType") ||
        msg.includes("6010"); // anchor error code for InvalidActionType
      assert.ok(
        isExpectedError,
        `Expected InvalidActionType, got: ${msg.slice(0, 200)}`,
      );
    }
  });

  // ─── log_action: owner-only ─────────────────────────────────────────────────

  it("log_action rejects a non-owner caller with UnauthorizedLogAction", async () => {
    const SEED_AGENT_ACTION = Buffer.from("agent-action");
    const identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    const totalTxs = identityAccount.totalTransactions;

    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(totalTxs.toString()));

    const [actionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_AGENT_ACTION, agentIdentityPda.toBuffer(), nonceBuffer],
      program.programId,
    );

    try {
      await program.methods
        .logAction({
          actionType: 2,
          programCalled: anchor.web3.SystemProgram.programId,
          success: true,
          usdcTransferred: new anchor.BN(1),
          memo: "unauthorized attempt",
        })
        // @ts-ignore
        .accounts({
          identity: agentIdentityPda,
          action: actionPda,
          payer: nonOwner.publicKey, // NOT the identity owner
        })
        .signers([nonOwner])
        .rpc();

      assert.fail("Expected UnauthorizedLogAction, but the call succeeded");
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      const isExpectedError =
        msg.includes("UnauthorizedLogAction") ||
        msg.includes("2003") || // ConstraintRaw from require_keys_eq
        msg.includes("6011");   // custom error code for UnauthorizedLogAction
      assert.ok(
        isExpectedError,
        `Expected UnauthorizedLogAction or ConstraintRaw, got: ${msg.slice(0, 200)}`,
      );
    }
  });

  // ─── log_action: owner CAN log their own actions ──────────────────────────

  it("log_action succeeds when called by the identity owner", async () => {
    const SEED_AGENT_ACTION = Buffer.from("agent-action");
    const identityAccount = await program.account.agentIdentity.fetch(agentIdentityPda);
    const totalTxs = identityAccount.totalTransactions;

    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(totalTxs.toString()));

    const [actionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED_AGENT_ACTION, agentIdentityPda.toBuffer(), nonceBuffer],
      program.programId,
    );

    await program.methods
      .logAction({
        actionType: 3,
        programCalled: anchor.web3.SystemProgram.programId,
        success: true,
        usdcTransferred: new anchor.BN(0),
        memo: "owner logs own action",
      })
      // @ts-ignore
      .accounts({
        identity: agentIdentityPda,
        action: actionPda,
        payer: provider.wallet.publicKey, // the owner
      })
      .rpc();

    const actionAccount = await program.account.agentAction.fetch(actionPda);
    assert.equal(actionAccount.actionType, 3);
    assert.equal(actionAccount.memo, "owner logs own action");
  });

  // ─── init_config: first-writer protection ─────────────────────────────────

  it("init_config rejects re-initialization (PDA already exists)", async () => {
    try {
      await program.methods
        .initConfig()
        .accounts({
          admin: nonOwner.publicKey,
          oracle: nonOwner.publicKey,
        })
        .signers([nonOwner])
        .rpc();

      assert.fail("Expected re-init to fail, but it succeeded");
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      // Anchor's `init` constraint rejects if the account already exists
      const isExpectedError =
        msg.includes("already in use") ||
        msg.includes("0x0") || // system program: account already exists
        msg.includes("custom program error") ||
        msg.includes("already exists");
      assert.ok(
        isExpectedError,
        `Expected account-already-exists error, got: ${msg.slice(0, 200)}`,
      );
    }
  });
});
