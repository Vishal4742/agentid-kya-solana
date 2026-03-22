import { Connection, PublicKey } from "@solana/web3.js";
export interface AnchorWallet {
    publicKey: PublicKey;
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
export declare const PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF";
export declare const DEVNET_RPC = "https://api.devnet.solana.com";
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
export declare class AgentIdClient {
    private program;
    private provider;
    constructor(connection: Connection, wallet: AnchorWallet);
    /**
     * Register a new agent identity on-chain.
     * Returns the transaction signature.
     */
    registerAgent(params: RegisterAgentParams): Promise<string>;
    /**
     * Fetch an agent's identity by owner wallet address.
     * Derives the PDA and fetches the on-chain account.
     */
    getAgentIdentity(ownerPubkey: string): Promise<AgentIdentity | null>;
    /**
     * Verify an agent is registered, check their level and reputation,
     * and determine if they are authorized for the requested action type.
     */
    verifyAgent(ownerPubkey: string, actionType: ActionType): Promise<VerificationResult>;
    /**
     * Submit a human rating (1-5 stars) for an agent.
     * Returns the transaction signature.
     */
    rateAgent(agentPDA: string, rating: 1 | 2 | 3 | 4 | 5): Promise<string>;
    /**
     * Log an on-chain action for reputation tracking.
     * Returns the transaction signature.
     */
    logAction(params: LogActionParams): Promise<string>;
    /**
     * Fetch all registered AgentIdentity accounts on-chain.
     */
    getAllAgents(): Promise<AgentIdentity[]>;
}
//# sourceMappingURL=index.d.ts.map