"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentIdClient = exports.DEVNET_RPC = exports.PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const agentid_program_json_1 = __importDefault(require("./idl/agentid_program.json"));
// ── Constants ────────────────────────────────────────────────────────────────
exports.PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF";
exports.DEVNET_RPC = "https://api.devnet.solana.com";
// ── Authorization thresholds ──────────────────────────────────────────────────
const AUTH_THRESHOLDS = {
    defi_trade: 600,
    payment: 400,
    content: 100,
    other: 100,
};
// ── Helpers ───────────────────────────────────────────────────────────────────
function derivePDA(ownerPubkey) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent-identity"), ownerPubkey.toBytes()], new web3_js_1.PublicKey(exports.PROGRAM_ID));
}
function parseVerifiedLevel(raw) {
    if (raw && typeof raw === "object") {
        if ("audited" in raw)
            return "Audited";
        if ("kyb" in raw)
            return "KYB";
    }
    return "Unverified";
}
function parseFramework(raw) {
    if (raw && typeof raw === "object") {
        if ("eliza" in raw)
            return "ELIZA";
        if ("autoGen" in raw)
            return "AutoGen";
        if ("crewAi" in raw)
            return "CrewAI";
        if ("langGraph" in raw)
            return "LangGraph";
    }
    return "Custom";
}
function mapRawToIdentity(raw) {
    const india = raw.indiaCompliance;
    return {
        owner: raw.owner.toBase58(),
        agentWallet: raw.agentWallet.toBase58(),
        name: raw.name,
        framework: parseFramework(raw.framework),
        llmModel: raw.llmModel,
        reputationScore: raw.reputationScore.toNumber(),
        verifiedLevel: parseVerifiedLevel(raw.verifiedLevel),
        registeredAt: raw.registeredAt.toNumber() * 1000,
        lastActive: raw.lastActive.toNumber() * 1000,
        totalTransactions: raw.totalTransactions.toNumber(),
        successfulTransactions: raw.successfulTransactions.toNumber(),
        paused: raw.paused,
        indiaCompliance: india
            ? {
                gstin: india.gstin,
                panHash: india.panHash,
                tdsRate: india.tdsRate.toNumber(),
                serviceCategory: india.serviceCategory,
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
class AgentIdClient {
    constructor(connection, wallet) {
        this.provider = new anchor_1.AnchorProvider(connection, wallet, {
            commitment: "confirmed",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.program = new anchor_1.Program(agentid_program_json_1.default, new web3_js_1.PublicKey(exports.PROGRAM_ID), this.provider);
    }
    /**
     * Register a new agent identity on-chain.
     * Returns the transaction signature.
     */
    async registerAgent(params) {
        const ownerPubkey = this.provider.wallet.publicKey;
        const [identityPDA] = derivePDA(ownerPubkey);
        const agentWalletPubkey = new web3_js_1.PublicKey(params.agentWallet);
        const caps = {
            defiTrading: params.capabilities.defiTrading,
            paymentSending: params.capabilities.paymentSending,
            contentPublishing: params.capabilities.contentPublishing,
            dataAnalysis: params.capabilities.dataAnalysis,
            maxUsdcTx: new anchor_1.BN(params.capabilities.maxUsdcTx),
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
        const tx = await this.program.methods
            .registerAgent(params.name, { [params.framework.toLowerCase().replace(" ", "")]: {} }, params.model, caps, indiaArgs)
            .accounts({
            identity: identityPDA,
            agentWallet: agentWalletPubkey,
            owner: ownerPubkey,
            systemProgram: anchor_1.web3.SystemProgram.programId,
        })
            .rpc();
        return tx;
    }
    /**
     * Fetch an agent's identity by owner wallet address.
     * Derives the PDA and fetches the on-chain account.
     */
    async getAgentIdentity(ownerPubkey) {
        try {
            const owner = new web3_js_1.PublicKey(ownerPubkey);
            const [pda] = derivePDA(owner);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = await this.program.account.agentIdentity.fetch(pda);
            return mapRawToIdentity(raw);
        }
        catch {
            return null;
        }
    }
    /**
     * Verify an agent is registered, check their level and reputation,
     * and determine if they are authorized for the requested action type.
     */
    async verifyAgent(ownerPubkey, actionType) {
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
    async rateAgent(agentPDA, rating) {
        const rater = this.provider.wallet.publicKey;
        const identityPDA = new web3_js_1.PublicKey(agentPDA);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await this.program.methods
            .rateAgent(rating)
            .accounts({
            identity: identityPDA,
            rater,
        })
            .rpc();
        return tx;
    }
    /**
     * Log an on-chain action for reputation tracking.
     * Returns the transaction signature.
     */
    async logAction(params) {
        const owner = this.provider.wallet.publicKey;
        const [identityPDA] = derivePDA(owner);
        const actionTypeArg = { [params.actionType]: {} };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = await this.program.methods
            .logAction(actionTypeArg, new web3_js_1.PublicKey(params.programCalled), params.outcome, new anchor_1.BN(Math.round(params.usdcTransferred * 1000000)))
            .accounts({
            identity: identityPDA,
            owner,
        })
            .rpc();
        return tx;
    }
    /**
     * Fetch all registered AgentIdentity accounts on-chain.
     */
    async getAllAgents() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accounts = await this.program.account.agentIdentity.all();
        return accounts.map((a) => mapRawToIdentity(a.account));
    }
}
exports.AgentIdClient = AgentIdClient;
//# sourceMappingURL=index.js.map