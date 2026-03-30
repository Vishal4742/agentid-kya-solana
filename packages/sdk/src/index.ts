import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

import IDL from "./idl/agentid_program.json";

export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

export const PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF";
export const DEVNET_RPC = "https://api.devnet.solana.com";

// ── Well-known Metaplex / SPL program addresses ───────────────────────────────
export const BUBBLEGUM_PROGRAM_ID = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY";
export const SPL_NOOP_PROGRAM_ID = "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV";
export const SPL_ACCOUNT_COMPRESSION_ID = "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK";

const PROGRAM_KEY = new PublicKey(PROGRAM_ID);
const BUBBLEGUM_KEY = new PublicKey(BUBBLEGUM_PROGRAM_ID);
const SPL_NOOP_KEY = new PublicKey(SPL_NOOP_PROGRAM_ID);
const SPL_COMPRESSION_KEY = new PublicKey(SPL_ACCOUNT_COMPRESSION_ID);
const FRAMEWORKS = ["ELIZA", "AutoGen", "CrewAI", "LangGraph", "Custom"] as const;
const VERIFIED_LEVELS = ["Unverified", "EmailVerified", "KYBVerified", "Audited"] as const;
const SERVICE_CATEGORIES = [
  "Information Technology Services",
  "Financial Services",
  "Consulting Services",
  "Marketing & Advertising",
  "Research & Development",
] as const;

export type AgentFramework = (typeof FRAMEWORKS)[number];
export type VerifiedLevel = (typeof VERIFIED_LEVELS)[number];
export type ActionType = "defi_trade" | "payment" | "content" | "other";
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface RegisterAgentParams {
  name: string;
  framework: AgentFramework;
  model: string;
  agentWallet: string;
  capabilities: {
    defiTrading: boolean;
    paymentSending: boolean;
    contentPublishing: boolean;
    dataAnalysis: boolean;
    maxUsdcTx: number;
  };
  gstin?: string;
  panHash?: string;
  serviceCategory?: ServiceCategory;
  /** URI for the off-chain cNFT metadata JSON (required for Bubblegum mint) */
  metadataUri: string;
  /**
   * The SPL Account Compression Merkle tree that will hold the cNFT leaf.
   * On devnet use the shared AgentID Merkle tree unless you have a dedicated one.
   */
  merkleTree: string;
  /**
   * The tree authority PDA — derived as PDA([merkleTree], bubblegumProgramId).
   * Pass explicitly so callers can pre-derive it off-screen.
   */
  treeAuthority: string;
}

export interface AgentIdentity {
  owner: string;
  agentWallet: string;
  name: string;
  framework: AgentFramework;
  llmModel: string;
  reputationScore: number;
  verifiedLevel: VerifiedLevel;
  registeredAt: number;
  lastActive: number;
  totalTransactions: number;
  successfulTransactions: number;
  humanRatingX10: number;
  ratingCount: number;
  maxTxSizeUsdc: number;
  credentialNft: string;
  capabilities: {
    defiTrading: boolean;
    paymentSending: boolean;
    contentPublishing: boolean;
    dataAnalysis: boolean;
  };
  indiaCompliance: {
    gstin: string;
    panHash: string;
    serviceCategory: ServiceCategory;
  };
}

export interface VerificationResult {
  isRegistered: boolean;
  verifiedLevel: VerifiedLevel;
  reputationScore: number;
  isAuthorized: boolean;
}

export interface LogActionParams {
  actionType: ActionType;
  programCalled: string;
  outcome: boolean;
  usdcTransferred: number;
  memo?: string;
}

const AUTH_THRESHOLDS: Record<ActionType, number> = {
  defi_trade: 600,
  payment: 400,
  content: 200,
  other: 100,
};

function deriveIdentityPda(ownerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-identity"), ownerPubkey.toBytes()],
    PROGRAM_KEY,
  );
}

function deriveProgramConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("program-config")],
    PROGRAM_KEY,
  );
}

/**
 * Derive the Bubblegum tree authority PDA for a given Merkle tree.
 * Pass the result as `treeAuthority` in RegisterAgentParams.
 */
export function deriveTreeAuthority(merkleTree: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new PublicKey(merkleTree).toBytes()],
    BUBBLEGUM_KEY,
  );
  return pda;
}

function deriveActionPda(identityPda: PublicKey, totalTransactions: bigint): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(totalTransactions);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-action"), identityPda.toBuffer(), nonceBuffer],
    PROGRAM_KEY,
  );
}

function toNumber(value: unknown): number {
  const maybeBn = value as BN | undefined;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (maybeBn instanceof BN) return maybeBn.toNumber();
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber(): number }).toNumber === "function") {
    return (value as { toNumber(): number }).toNumber();
  }
  throw new TypeError(`Unsupported numeric value: ${String(value)}`);
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (value && typeof value === "object" && "toString" in value && typeof (value as { toString(): string }).toString === "function") {
    return BigInt((value as { toString(): string }).toString());
  }
  throw new TypeError(`Unsupported bigint value: ${String(value)}`);
}

function toPublicKeyString(value: unknown): string {
  if (value instanceof PublicKey) return value.toBase58();
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toBase58" in value && typeof (value as { toBase58(): string }).toBase58 === "function") {
    return (value as { toBase58(): string }).toBase58();
  }
  return PublicKey.default.toBase58();
}

function bytesToHex(value: unknown): string {
  if (Array.isArray(value)) return Buffer.from(value).toString("hex");
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  return "";
}

function parsePanHash(panHash?: string): number[] {
  if (!panHash) return Array.from(Buffer.alloc(32));
  const normalized = panHash.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("panHash must be a 32-byte hex string");
  }
  return Array.from(Buffer.from(normalized, "hex"));
}

function frameworkToIndex(framework: AgentFramework): number {
  const index = FRAMEWORKS.indexOf(framework);
  return index >= 0 ? index : FRAMEWORKS.length - 1;
}

function serviceCategoryToIndex(category?: ServiceCategory): number {
  if (!category) return 0;
  const index = SERVICE_CATEGORIES.indexOf(category);
  return index >= 0 ? index : 0;
}

function actionTypeToCode(actionType: ActionType): number {
  switch (actionType) {
    case "defi_trade":
      return 0;
    case "payment":
      return 1;
    case "content":
      return 2;
    case "other":
    default:
      return 3;
  }
}

type RawIdentity = Record<string, unknown> & {
  owner: unknown;
  agentWallet: unknown;
  name: string;
  framework: number;
  model: string;
  credentialNft: unknown;
  verifiedLevel: number;
  registeredAt: unknown;
  lastActive: unknown;
  canTradeDefi: boolean;
  canSendPayments: boolean;
  canPublishContent: boolean;
  canAnalyzeData: boolean;
  maxTxSizeUsdc: unknown;
  reputationScore: unknown;
  totalTransactions: unknown;
  successfulTransactions: unknown;
  humanRatingX10: unknown;
  ratingCount: unknown;
  gstin: string;
  panHash: unknown;
  serviceCategory: number;
};

function mapRawToIdentity(raw: RawIdentity): AgentIdentity {
  return {
    owner: toPublicKeyString(raw.owner),
    agentWallet: toPublicKeyString(raw.agentWallet),
    name: raw.name,
    framework: FRAMEWORKS[raw.framework] ?? "Custom",
    llmModel: raw.model,
    reputationScore: toNumber(raw.reputationScore),
    verifiedLevel: VERIFIED_LEVELS[raw.verifiedLevel] ?? "Unverified",
    registeredAt: toNumber(raw.registeredAt) * 1000,
    lastActive: toNumber(raw.lastActive) * 1000,
    totalTransactions: toNumber(raw.totalTransactions),
    successfulTransactions: toNumber(raw.successfulTransactions),
    humanRatingX10: toNumber(raw.humanRatingX10),
    ratingCount: toNumber(raw.ratingCount),
    maxTxSizeUsdc: toNumber(raw.maxTxSizeUsdc) / 1_000_000,
    credentialNft: toPublicKeyString(raw.credentialNft),
    capabilities: {
      defiTrading: Boolean(raw.canTradeDefi),
      paymentSending: Boolean(raw.canSendPayments),
      contentPublishing: Boolean(raw.canPublishContent),
      dataAnalysis: Boolean(raw.canAnalyzeData),
    },
    indiaCompliance: {
      gstin: raw.gstin,
      panHash: bytesToHex(raw.panHash),
      serviceCategory: SERVICE_CATEGORIES[raw.serviceCategory] ?? SERVICE_CATEGORIES[0],
    },
  };
}

export class AgentIdClient {
  private program: Program;
  private provider: AnchorProvider;

  constructor(connection: Connection, wallet: AnchorWallet) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    // Anchor v0.30+ requires the provider to be set via AnchorProvider.setProvider
    // before constructing the Program from IDL alone.
    AnchorProvider.prototype; // type-narrowing hint
    this.program = new Program(IDL as any, this.provider);
  }

  async registerAgent(params: RegisterAgentParams): Promise<string> {
    const ownerPubkey = this.provider.wallet.publicKey;
    const [identityPDA] = deriveIdentityPda(ownerPubkey);

    const registerParams = {
      name: params.name,
      framework: frameworkToIndex(params.framework),
      model: params.model.slice(0, 32),
      agentWallet: new PublicKey(params.agentWallet),
      canTradeDefi: params.capabilities.defiTrading,
      canSendPayments: params.capabilities.paymentSending,
      canPublishContent: params.capabilities.contentPublishing,
      canAnalyzeData: params.capabilities.dataAnalysis,
      maxTxSizeUsdc: new BN(Math.round(params.capabilities.maxUsdcTx * 1_000_000)),
      gstin: params.gstin ?? "",
      panHash: parsePanHash(params.panHash),
      serviceCategory: serviceCategoryToIndex(params.serviceCategory),
      metadataUri: params.metadataUri,
    };

    const merkleTreeKey = new PublicKey(params.merkleTree);
    const treeAuthorityKey = new PublicKey(params.treeAuthority);
    const [treeDelegatePda] = deriveProgramConfigPda();

    const tx = await (this.program.methods as any)
      .registerAgent(registerParams)
      .accountsStrict({
        identity: identityPDA,
        owner: ownerPubkey,
        treeAuthority: treeAuthorityKey,
        merkleTree: merkleTreeKey,
        treeDelegate: treeDelegatePda,
        logWrapper: SPL_NOOP_KEY,
        compressionProgram: SPL_COMPRESSION_KEY,
        bubblegumProgram: BUBBLEGUM_KEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx as string;
  }

  async getAgentIdentity(ownerPubkey: string): Promise<AgentIdentity | null> {
    try {
      const owner = new PublicKey(ownerPubkey);
      const [pda] = deriveIdentityPda(owner);
      const raw = await (this.program.account as any).agentIdentity.fetch(pda);
      return mapRawToIdentity(raw as RawIdentity);
    } catch {
      return null;
    }
  }

  async verifyAgent(ownerPubkey: string, actionType: ActionType): Promise<VerificationResult> {
    const identity = await this.getAgentIdentity(ownerPubkey);

    if (!identity) {
      return {
        isRegistered: false,
        verifiedLevel: "Unverified",
        reputationScore: 0,
        isAuthorized: false,
      };
    }

    const threshold = AUTH_THRESHOLDS[actionType];
    // If actionType is not in the map, fail closed (mirrors on-chain InvalidActionType)
    if (threshold === undefined) {
      return {
        isRegistered: true,
        verifiedLevel: identity.verifiedLevel,
        reputationScore: identity.reputationScore,
        isAuthorized: false,
      };
    }
    const capabilityEnabled = (() => {
      switch (actionType) {
        case "defi_trade":
          return identity.capabilities.defiTrading;
        case "payment":
          return identity.capabilities.paymentSending;
        case "content":
          return identity.capabilities.contentPublishing;
        case "other":
          return identity.capabilities.dataAnalysis;
        default:
          return false; // fail closed for any unknown value
      }
    })();
    const isAuthorized = identity.reputationScore >= threshold && capabilityEnabled;

    return {
      isRegistered: true,
      verifiedLevel: identity.verifiedLevel,
      reputationScore: identity.reputationScore,
      isAuthorized,
    };
  }

  async rateAgent(agentPDA: string, rating: 1 | 2 | 3 | 4 | 5): Promise<string> {
    const rater = this.provider.wallet.publicKey;
    const identityPDA = new PublicKey(agentPDA);

    const tx = await (this.program.methods as any)
      .rateAgent(rating)
      .accountsStrict({
        identity: identityPDA,
        rater,
      })
      .rpc();

    return tx as string;
  }

  async logAction(params: LogActionParams): Promise<string> {
    const owner = this.provider.wallet.publicKey;
    const [identityPDA] = deriveIdentityPda(owner);
    const identity = await (this.program.account as any).agentIdentity.fetch(identityPDA);
    const [actionPDA] = deriveActionPda(
      identityPDA,
      toBigInt((identity as RawIdentity).totalTransactions),
    );

    const logParams = {
      actionType: actionTypeToCode(params.actionType),
      programCalled: new PublicKey(params.programCalled),
      success: params.outcome,
      usdcTransferred: new BN(Math.round(params.usdcTransferred * 1_000_000)),
      memo: params.memo ?? "",
    };

    const tx = await (this.program.methods as any)
      .logAction(logParams)
      .accountsStrict({
        identity: identityPDA,
        action: actionPDA,
        payer: owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx as string;
  }

  async getAllAgents(): Promise<AgentIdentity[]> {
    const accounts = await (this.program.account as any).agentIdentity.all();
    return accounts.map((a: { account: RawIdentity }) => mapRawToIdentity(a.account));
  }

  // ─── Treasury ────────────────────────────────────────────────────────────────

  /**
   * Executes an autonomous USDC payment from the agent's treasury.
   * The agent wallet (not owner) must sign this transaction.
   */
  async autonomousPayment(
    ownerPubkey: string,
    recipientUsdcAccount: string,
    amount: number,
    memo?: string,
  ): Promise<string> {
    const owner = new PublicKey(ownerPubkey);
    const [identityPDA] = deriveIdentityPda(owner);
    const [treasuryPDA] = deriveTreasuryPda(identityPDA);
    const agentWallet = this.provider.wallet.publicKey;

    const tx = await (this.program.methods as any)
      .autonomousPayment(
        new BN(Math.round(amount * 1_000_000)),
        owner,
        memo ?? "",
      )
      .accountsStrict({
        treasury: treasuryPDA,
        agentIdentity: identityPDA,
        agentWallet,
        owner,
        recipientUsdc: new PublicKey(recipientUsdcAccount),
      })
      .rpc();

    return tx as string;
  }

  async initializeTreasury(
    usdcMint: string,
    spendingLimitPerTx: number,
    spendingLimitPerDay: number,
    multisigRequiredAbove: number,
  ): Promise<string> {
    const owner = this.provider.wallet.publicKey;
    const [identityPDA] = deriveIdentityPda(owner);
    const [treasuryPDA] = deriveTreasuryPda(identityPDA);
    const usdcMintKey = new PublicKey(usdcMint);

    const tx = await (this.program.methods as any)
      .initializeTreasury(
        new BN(spendingLimitPerTx),
        new BN(spendingLimitPerDay),
        new BN(multisigRequiredAbove),
      )
      .accountsStrict({
        treasury: treasuryPDA,
        agentIdentity: identityPDA,
        owner,
        usdcMint: usdcMintKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx as string;
  }

  async getTreasury(ownerPubkey: string): Promise<TreasuryInfo | null> {
    try {
      const owner = new PublicKey(ownerPubkey);
      const [identityPDA] = deriveIdentityPda(owner);
      const [treasuryPDA] = deriveTreasuryPda(identityPDA);
      const raw = await (this.program.account as any).agentTreasury.fetch(treasuryPDA);
      return mapRawToTreasury(raw as RawTreasury);
    } catch {
      return null;
    }
  }

  async updateSpendingLimits(
    ownerPubkey: string,
    spendingLimitPerTx: number,
    spendingLimitPerDay: number,
    multisigRequiredAbove: number,
  ): Promise<string> {
    const owner = this.provider.wallet.publicKey;
    const [identityPDA] = deriveIdentityPda(new PublicKey(ownerPubkey));
    const [treasuryPDA] = deriveTreasuryPda(identityPDA);

    const tx = await (this.program.methods as any)
      .updateSpendingLimits(
        new BN(spendingLimitPerTx),
        new BN(spendingLimitPerDay),
        new BN(multisigRequiredAbove),
      )
      .accountsStrict({
        treasury: treasuryPDA,
        owner,
      })
      .rpc();

    return tx as string;
  }

  async emergencyPause(ownerPubkey: string, paused: boolean): Promise<string> {
    const owner = this.provider.wallet.publicKey;
    const [identityPDA] = deriveIdentityPda(new PublicKey(ownerPubkey));
    const [treasuryPDA] = deriveTreasuryPda(identityPDA);

    const tx = await (this.program.methods as any)
      .emergencyPause(paused)
      .accountsStrict({
        treasury: treasuryPDA,
        owner,
      })
      .rpc();

    return tx as string;
  }
}

// ─── Treasury helpers ─────────────────────────────────────────────────────────

function deriveTreasuryPda(identityPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-treasury"), identityPDA.toBytes()],
    PROGRAM_KEY,
  );
}

export interface TreasuryInfo {
  agentIdentity: string;
  owner: string;
  usdcMint: string;
  usdcBalance: number;
  totalEarned: number;
  totalSpent: number;
  spendingLimitPerTx: number;
  spendingLimitPerDay: number;
  spentToday: number;
  dayResetTimestamp: number;
  emergencyPause: boolean;
  multisigRequiredAbove: number;
}

type RawTreasury = Record<string, unknown> & {
  agentIdentity: unknown;
  owner: unknown;
  usdcMint: unknown;
  usdcBalance: unknown;
  totalEarned: unknown;
  totalSpent: unknown;
  spendingLimitPerTx: unknown;
  spendingLimitPerDay: unknown;
  spentToday: unknown;
  dayResetTimestamp: unknown;
  emergencyPause: boolean;
  multisigRequiredAbove: unknown;
};

function mapRawToTreasury(raw: RawTreasury): TreasuryInfo {
  return {
    agentIdentity: toPublicKeyString(raw.agentIdentity),
    owner: toPublicKeyString(raw.owner),
    usdcMint: toPublicKeyString(raw.usdcMint),
    usdcBalance: toNumber(raw.usdcBalance) / 1_000_000,
    totalEarned: toNumber(raw.totalEarned) / 1_000_000,
    totalSpent: toNumber(raw.totalSpent) / 1_000_000,
    spendingLimitPerTx: toNumber(raw.spendingLimitPerTx) / 1_000_000,
    spendingLimitPerDay: toNumber(raw.spendingLimitPerDay) / 1_000_000,
    spentToday: toNumber(raw.spentToday) / 1_000_000,
    dayResetTimestamp: toNumber(raw.dayResetTimestamp) * 1000,
    emergencyPause: raw.emergencyPause,
    multisigRequiredAbove: toNumber(raw.multisigRequiredAbove) / 1_000_000,
  };
}

