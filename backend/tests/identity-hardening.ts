import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { AgentidProgram } from "../target/types/agentid_program";
import {
  buildRegisterParams,
  getRegisterAccounts,
  registerAgentForOwner,
} from "./helpers";

function deriveActionPda(
  identityPda: anchor.web3.PublicKey,
  totalTransactions: anchor.BN,
  programId: anchor.web3.PublicKey,
) {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(totalTransactions.toString()));

  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("agent-action"), identityPda.toBuffer(), nonceBuffer],
    programId,
  )[0];
}

function expectNamedError(error: unknown, names: string[]) {
  const message = error instanceof Error ? error.message : String(error);
  assert.ok(
    names.some((name) => message.includes(name)),
    `Expected one of ${names.join(", ")}, got: ${message.slice(0, 240)}`,
  );
}

describe("identity hardening", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.agentidProgram as Program<AgentidProgram>;

  const invalidWalletOwner = anchor.web3.Keypair.generate();
  const emptyMetadataOwner = anchor.web3.Keypair.generate();
  const noCapabilitiesOwner = anchor.web3.Keypair.generate();
  const badCategoryOwner = anchor.web3.Keypair.generate();
  const hardenedOwner = anchor.web3.Keypair.generate();

  let hardenedIdentityPda: anchor.web3.PublicKey;

  before(async () => {
    for (const signer of [
      invalidWalletOwner,
      emptyMetadataOwner,
      noCapabilitiesOwner,
      badCategoryOwner,
      hardenedOwner,
    ]) {
      const sig = await provider.connection.requestAirdrop(
        signer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    hardenedIdentityPda = await registerAgentForOwner(program, hardenedOwner, {
      name: "Hardened Agent",
      framework: 0,
      model: "GPT-4",
      canTradeDefi: false,
      canSendPayments: true,
      canPublishContent: true,
      canAnalyzeData: true,
      maxTxSizeUsdc: new anchor.BN(50),
      metadataUri: "https://agentid-kya-solana.vercel.app/metadata/hardened-agent.json",
    });
  });

  it("register_agent rejects the default pubkey as agent_wallet", async () => {
    try {
      await program.methods
        .registerAgent(
          buildRegisterParams(invalidWalletOwner.publicKey, {
            agentWallet: anchor.web3.PublicKey.default,
          }),
        )
        .accounts({
          owner: invalidWalletOwner.publicKey,
          ...getRegisterAccounts(program.programId),
        })
        .signers([invalidWalletOwner])
        .rpc();

      assert.fail("Expected InvalidAgentWallet");
    } catch (error) {
      expectNamedError(error, ["InvalidAgentWallet"]);
    }
  });

  it("register_agent rejects an empty metadata URI", async () => {
    try {
      await program.methods
        .registerAgent(
          buildRegisterParams(emptyMetadataOwner.publicKey, {
            metadataUri: "   ",
          }),
        )
        .accounts({
          owner: emptyMetadataOwner.publicKey,
          ...getRegisterAccounts(program.programId),
        })
        .signers([emptyMetadataOwner])
        .rpc();

      assert.fail("Expected EmptyMetadataUri");
    } catch (error) {
      expectNamedError(error, ["EmptyMetadataUri"]);
    }
  });

  it("register_agent rejects registrations with no capabilities enabled", async () => {
    try {
      await program.methods
        .registerAgent(
          buildRegisterParams(noCapabilitiesOwner.publicKey, {
            canTradeDefi: false,
            canSendPayments: false,
            canPublishContent: false,
            canAnalyzeData: false,
          }),
        )
        .accounts({
          owner: noCapabilitiesOwner.publicKey,
          ...getRegisterAccounts(program.programId),
        })
        .signers([noCapabilitiesOwner])
        .rpc();

      assert.fail("Expected NoCapabilitiesEnabled");
    } catch (error) {
      expectNamedError(error, ["NoCapabilitiesEnabled"]);
    }
  });

  it("register_agent rejects out-of-range service categories", async () => {
    try {
      await program.methods
        .registerAgent(
          buildRegisterParams(badCategoryOwner.publicKey, {
            serviceCategory: 9,
          }),
        )
        .accounts({
          owner: badCategoryOwner.publicKey,
          ...getRegisterAccounts(program.programId),
        })
        .signers([badCategoryOwner])
        .rpc();

      assert.fail("Expected InvalidServiceCategory");
    } catch (error) {
      expectNamedError(error, ["InvalidServiceCategory"]);
    }
  });

  it("update_capabilities rejects disabling every capability", async () => {
    try {
      await program.methods
        .updateCapabilities({
          canTradeDefi: false,
          canSendPayments: false,
          canPublishContent: false,
          canAnalyzeData: false,
          maxTxSizeUsdc: new anchor.BN(0),
        })
        .accounts({
          owner: hardenedOwner.publicKey,
        })
        .signers([hardenedOwner])
        .rpc();

      assert.fail("Expected NoCapabilitiesEnabled");
    } catch (error) {
      expectNamedError(error, ["NoCapabilitiesEnabled"]);
    }
  });

  it("log_action rejects unknown action types", async () => {
    const identity = await program.account.agentIdentity.fetch(hardenedIdentityPda);
    const actionPda = deriveActionPda(
      hardenedIdentityPda,
      identity.totalTransactions,
      program.programId,
    );

    try {
      await program.methods
        .logAction({
          actionType: 99,
          programCalled: anchor.web3.SystemProgram.programId,
          success: true,
          usdcTransferred: new anchor.BN(1),
          memo: "invalid action type",
        })
        .accounts({
          identity: hardenedIdentityPda,
          action: actionPda,
          payer: hardenedOwner.publicKey,
        })
        .signers([hardenedOwner])
        .rpc();

      assert.fail("Expected InvalidActionType");
    } catch (error) {
      expectNamedError(error, ["InvalidActionType"]);
    }
  });

  it("log_action rejects oversized memos", async () => {
    const identity = await program.account.agentIdentity.fetch(hardenedIdentityPda);
    const actionPda = deriveActionPda(
      hardenedIdentityPda,
      identity.totalTransactions,
      program.programId,
    );

    try {
      await program.methods
        .logAction({
          actionType: 1,
          programCalled: anchor.web3.SystemProgram.programId,
          success: true,
          usdcTransferred: new anchor.BN(1),
          memo: "x".repeat(65),
        })
        .accounts({
          identity: hardenedIdentityPda,
          action: actionPda,
          payer: hardenedOwner.publicKey,
        })
        .signers([hardenedOwner])
        .rpc();

      assert.fail("Expected InvalidMemoLength");
    } catch (error) {
      expectNamedError(error, ["InvalidMemoLength"]);
    }
  });

  it("hardened registration persists the expected identity state", async () => {
    const identity = await program.account.agentIdentity.fetch(hardenedIdentityPda);
    assert.equal(identity.name, "Hardened Agent");
    assert.equal(identity.model, "GPT-4");
    assert.ok(identity.owner.equals(hardenedOwner.publicKey));
    assert.equal(identity.gstin, "27ABCDE1234F1Z5");
  });
});
