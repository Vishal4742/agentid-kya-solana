import {
  Connection,
  PublicKey,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN, web3 } from "@coral-xyz/anchor";

// AnchorWallet minimal interface (matches what AnchorProvider expects)
export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

// re-import web3 types needed only for AnchorWallet signature
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

import IDL from "./idl/agentid_program.json";

// ── Constants ────────────────────────────────────────────────────────────────

export const PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF";
export const DEVNET_RPC = "https://api.devnet.solana.com";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentFramework = "ELIZA" | "AutoGen" | "CrewAI" | "LangGraph" | "Custom";
export type VerifiedLevel = "Unverified" | "KYB" | "Audited";
export type ActionType = "defi_trade" | "payment" | "content" | "other";

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
  paused: boolean;
  indiaCompliance?: {
    gstin: string;
    panHash: string;
    tdsRate: number;
    serviceCategory: string;
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
}

// ── Authorization thresholds ──────────────────────────────────────────────────

const AUTH_THRESHOLDS: Record<ActionType, number> = {
  defi_trade: 600,
  payment:    400,
  content:    100,
  other:      100,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function derivePDA(ownerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent-identity"), ownerPubkey.toBytes()],
    new PublicKey(PROGRAM_ID)
  );
}

function parseVerifiedLevel(raw: unknown): VerifiedLevel {
  if (raw && typeof raw === "object") {
    if ("audited" in raw) return "Audited";
    if ("kyb" in raw) return "KYB";
  }
  return "Unverified";
}

function parseFramework(raw: unknown): AgentFramework {
  if (raw && typeof raw === "object") {
    if ("eliza" in raw) return "ELIZA";
    if ("autoGen" in raw) return "AutoGen";
    if ("crewAi" in raw) return "CrewAI";
    if ("langGraph" in raw) return "LangGraph";
  }
  return "Custom";
}

function mapRawToIdentity(raw: Record<string, unknown>): AgentIdentity {
  const india = raw.indiaCompliance as Record<string, unknown> | null | undefined;
  return {
    owner: (raw.owner as PublicKey).toBase58(),
    agentWallet: (raw.agentWallet as PublicKey).toBase58(),
    name: raw.name as string,
    framework: parseFramework(raw.framework),
    llmModel: raw.llmModel as string,
    reputationScore: (raw.reputationScore as BN).toNumber(),
    verifiedLevel: parseVerifiedLevel(raw.verifiedLevel),
    registeredAt: (raw.registeredAt as BN).toNumber() * 1000,
    lastActive: (raw.lastActive as BN).toNumber() * 1000,
    totalTransactions: (raw.totalTransactions as BN).toNumber(),
    successfulTransactions: (raw.successfulTransactions as BN).toNumber(),
    paused: raw.paused as boolean,
    indiaCompliance: india
      ? {
          gstin: india.gstin as string,
          panHash: india.panHash as string,
          tdsRate: (india.tdsRate as BN).toNumber(),
          serviceCategory: india.serviceCategory as string,
        }
      : undefined,
  };
}

// ── Client ────────────────────────────────────────────────────────────────────

/**
 * AgentIdClient — main entry point for interacting with the AgentID program.
 *
 * @example
 * ```ts
 * import { AgentIdClient, DEVNET_RPC } from "@agentid/sdk";
 * import { Connection } from "@solana/web3.js";
 *
 * const connection = new Connection(DEVNET_RPC);
 * const client = new AgentIdClient(connection, wallet);
 *
 * const identity = await client.getAgentIdentity("YOUR_WALLET_ADDRESS");
 * ```
 */
export class AgentIdClient {
  private program: Program;
  private provider: AnchorProvider;

  constructor(connection: Connection, wallet: AnchorWallet) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.program = new Program(IDL as any, new PublicKey(PROGRAM_ID), this.provider);
  }

  /**
   * Register a new agent identity on-chain.
   * Returns the transaction signature.
   */
  async registerAgent(params: RegisterAgentParams): Promise<string> {
    const ownerPubkey = this.provider.wallet.publicKey;
    const [identityPDA] = derivePDA(ownerPubkey);
    const agentWalletPubkey = new PublicKey(params.agentWallet);

    const caps = {
      defiTrading: params.capabilities.defiTrading,
      paymentSending: params.capabilities.paymentSending,
      contentPublishing: params.capabilities.contentPublishing,
      dataAnalysis: params.capabilities.dataAnalysis,
      maxUsdcTx: new BN(params.capabilities.maxUsdcTx),
    };

    const indiaArgs = params.gstin
      ? {
          gstin: params.gstin,
          panHash: params.panHash ?? "",
          tdsRate: 10,
          serviceCategory: "Information Technology Services",
        }
      : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (this.program.methods as any)
      .registerAgent(
        params.name,
        { [params.framework.toLowerCase().replace(" ", "")]: {} },
        params.model,
        caps,
        indiaArgs
      )
      .accounts({
        identity: identityPDA,
        agentWallet: agentWalletPubkey,
        owner: ownerPubkey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return tx as string;
  }

  /**
   * Fetch an agent's identity by owner wallet address.
   * Derives the PDA and fetches the on-chain account.
   */
  async getAgentIdentity(ownerPubkey: string): Promise<AgentIdentity | null> {
    try {
      const owner = new PublicKey(ownerPubkey);
      const [pda] = derivePDA(owner);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await (this.program.account as any).agentIdentity.fetch(pda);
      return mapRawToIdentity(raw as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  /**
   * Verify an agent is registered, check their level and reputation,
   * and determine if they are authorized for the requested action type.
   */
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
    const isAuthorized = identity.reputationScore >= threshold;

    return {
      isRegistered: true,
      verifiedLevel: identity.verifiedLevel,
      reputationScore: identity.reputationScore,
      isAuthorized,
    };
  }

  /**
   * Submit a human rating (1-5 stars) for an agent.
   * Returns the transaction signature.
   */
  async rateAgent(agentPDA: string, rating: 1 | 2 | 3 | 4 | 5): Promise<string> {
    const rater = this.provider.wallet.publicKey;
    const identityPDA = new PublicKey(agentPDA);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (this.program.methods as any)
      .rateAgent(rating)
      .accounts({
        identity: identityPDA,
        rater,
      })
      .rpc();

    return tx as string;
  }

  /**
   * Log an on-chain action for reputation tracking.
   * Returns the transaction signature.
   */
  async logAction(params: LogActionParams): Promise<string> {
    const owner = this.provider.wallet.publicKey;
    const [identityPDA] = derivePDA(owner);

    const actionTypeArg = { [params.actionType]: {} };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (this.program.methods as any)
      .logAction(
        actionTypeArg,
        new PublicKey(params.programCalled),
        params.outcome,
        new BN(Math.round(params.usdcTransferred * 1_000_000))
      )
      .accounts({
        identity: identityPDA,
        owner,
      })
      .rpc();

    return tx as string;
  }

  /**
   * Fetch all registered AgentIdentity accounts on-chain.
   */
  async getAllAgents(): Promise<AgentIdentity[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.program.account as any).agentIdentity.all();
    return accounts.map((a: { account: Record<string, unknown> }) =>
      mapRawToIdentity(a.account)
    );
  }
}
