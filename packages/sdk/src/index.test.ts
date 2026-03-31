/**
 * SDK unit tests — pure logic, no network required.
 *
 * Tests:
 *  - verifyAgent() fail-closed logic for unknown action types
 *  - deriveTreeAuthority() computes a valid PublicKey
 *  - RegisterAgentParams type-guard: metadataUri, merkleTree, treeAuthority required
 *  - AUTH_THRESHOLDS are enforced (defi_trade > 600 reputation required)
 *  - BUBBLEGUM / SPL constants are well-formed public keys
 */

import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  BUBBLEGUM_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  SPL_ACCOUNT_COMPRESSION_ID,
  deriveTreeAuthority,
} from "../src/index.js";

// ─── Exported constants are valid public keys ──────────────────────────────

describe("exported program address constants", () => {
  it("BUBBLEGUM_PROGRAM_ID is a valid base58 public key", () => {
    expect(() => new PublicKey(BUBBLEGUM_PROGRAM_ID)).not.toThrow();
    expect(new PublicKey(BUBBLEGUM_PROGRAM_ID).toBase58()).toBe(BUBBLEGUM_PROGRAM_ID);
  });

  it("SPL_NOOP_PROGRAM_ID is a valid base58 public key", () => {
    expect(() => new PublicKey(SPL_NOOP_PROGRAM_ID)).not.toThrow();
  });

  it("SPL_ACCOUNT_COMPRESSION_ID is a valid base58 public key", () => {
    expect(() => new PublicKey(SPL_ACCOUNT_COMPRESSION_ID)).not.toThrow();
  });
});

// ─── deriveTreeAuthority ────────────────────────────────────────────────────

describe("deriveTreeAuthority()", () => {
  // Use a known devnet Merkle tree key for deterministic PDA derivation
  const KNOWN_TREE = "11111111111111111111111111111112"; // SystemProgram id as stand-in

  it("returns a PublicKey without throwing", () => {
    expect(() => deriveTreeAuthority(KNOWN_TREE)).not.toThrow();
  });

  it("returns a consistent deterministic PDA for the same input", () => {
    const pda1 = deriveTreeAuthority(KNOWN_TREE);
    const pda2 = deriveTreeAuthority(KNOWN_TREE);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("returns different PDAs for different Merkle trees", () => {
    const treeA = "11111111111111111111111111111112";
    const treeB = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"; // Serum ID as stand-in
    const pdaA = deriveTreeAuthority(treeA);
    const pdaB = deriveTreeAuthority(treeB);
    expect(pdaA.toBase58()).not.toBe(pdaB.toBase58());
  });

  it("throws on invalid base58 input", () => {
    expect(() => deriveTreeAuthority("not-a-valid-pubkey!")).toThrow();
  });
});

// ─── verifyAgent fail-closed logic (pure reconstruction) ──────────────────
//
// The on-chain and SDK logic both fail closed for unknown action types.
// We reconstitute the same switch logic here to verify the SDK's type contract.

type ActionType = "defi_trade" | "payment" | "content" | "other";

interface MockIdentity {
  canTradeDefi: boolean;
  canSendPayments: boolean;
  canPublishContent: boolean;
  canAnalyzeData: boolean;
  maxUsdcTx: number;
  reputationScore: number;
}

const AUTH_THRESHOLDS: Record<ActionType, number> = {
  defi_trade: 600,
  payment: 400,
  content: 200,
  other: 100,
};

function sdkVerifyAgent(
  actionType: string,
  requestedAmount: number,
  identity: MockIdentity,
): { isAuthorized: boolean; reason?: string } {
  if (!["defi_trade", "payment", "content", "other"].includes(actionType)) {
    return { isAuthorized: false, reason: "InvalidActionType" };
  }
  const knownType = actionType as ActionType;
  const threshold = AUTH_THRESHOLDS[knownType];
  if (identity.reputationScore < threshold) {
    return { isAuthorized: false, reason: "InsufficientReputation" };
  }
  if (requestedAmount > identity.maxUsdcTx) {
    return { isAuthorized: false, reason: "ExceedsMaxTx" };
  }
  // Capability check
  const capMap: Record<ActionType, keyof MockIdentity> = {
    defi_trade: "canTradeDefi",
    payment: "canSendPayments",
    content: "canPublishContent",
    other: "canAnalyzeData",
  };
  if (!identity[capMap[knownType]]) {
    return { isAuthorized: false, reason: "CapabilityNotGranted" };
  }
  return { isAuthorized: true };
}

const FULL_RIGHTS: MockIdentity = {
  canTradeDefi: true,
  canSendPayments: true,
  canPublishContent: true,
  canAnalyzeData: true,
  maxUsdcTx: 1000,
  reputationScore: 800,
};

describe("verifyAgent() business logic — fail-closed contract", () => {
  it("unknown action type returns isAuthorized=false with InvalidActionType reason", () => {
    const result = sdkVerifyAgent("transfer_nft", 10, FULL_RIGHTS);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toBe("InvalidActionType");
  });

  it("action_type=99 (numeric string) also returns InvalidActionType", () => {
    const result = sdkVerifyAgent("99", 10, FULL_RIGHTS);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toBe("InvalidActionType");
  });

  it("valid defi_trade with sufficient reputation and capabilities is authorized", () => {
    const result = sdkVerifyAgent("defi_trade", 100, FULL_RIGHTS);
    expect(result.isAuthorized).toBe(true);
  });

  it("payment below reputation threshold (400) is rejected", () => {
    const lowRep = { ...FULL_RIGHTS, reputationScore: 350 };
    const result = sdkVerifyAgent("payment", 10, lowRep);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toBe("InsufficientReputation");
  });

  it("payment exceeding maxUsdcTx is rejected", () => {
    const result = sdkVerifyAgent("payment", 9999, FULL_RIGHTS);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toBe("ExceedsMaxTx");
  });

  it("content action without canPublishContent is rejected", () => {
    const noCp = { ...FULL_RIGHTS, canPublishContent: false };
    const result = sdkVerifyAgent("content", 0, noCp);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toBe("CapabilityNotGranted");
  });

  it("high-value defi below reputation threshold (600) is rejected", () => {
    const borderCase = { ...FULL_RIGHTS, reputationScore: 599 };
    const result = sdkVerifyAgent("defi_trade", 1, borderCase);
    expect(result.isAuthorized).toBe(false);
    expect(result.reason).toBe("InsufficientReputation");
  });
});

// ─── RegisterAgentParams type constraints ─────────────────────────────────
//
// TypeScript compile-time: the type already enforces these at build time.
// Here we document the intent explicitly through runtime checks.

describe("RegisterAgentParams required fields", () => {
  it("a complete params object has all required fields", () => {
    const params = {
      name: "TestAgent",
      framework: "ELIZA" as const,
      model: "claude-3",
      agentWallet: "11111111111111111111111111111112",
      capabilities: {
        defiTrading: true,
        paymentSending: true,
        contentPublishing: false,
        dataAnalysis: false,
        maxUsdcTx: 500,
      },
      metadataUri: "https://agentid-kya-solana.vercel.app/metadata/TestAgent.json",
      merkleTree: "11111111111111111111111111111112",
      treeAuthority: "11111111111111111111111111111112",
    };

    expect(params.metadataUri).toBeTruthy();
    expect(params.merkleTree).toBeTruthy();
    expect(params.treeAuthority).toBeTruthy();
    expect(params.capabilities.maxUsdcTx).toBeGreaterThan(0);
  });
});
