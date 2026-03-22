"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVNET_RPC = exports.PROGRAM_ID = exports.agentIdPlugin = void 0;
const web3_js_1 = require("@solana/web3.js");
const sdk_1 = require("@agentid/sdk");
// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Build an AgentIdClient from a runtime context.
 * Reads RPC URL and wallet key from runtime settings.
 */
function buildClient(runtime) {
    const rpc = runtime.getSetting("SOLANA_RPC_URL") ?? sdk_1.DEVNET_RPC;
    const connection = new web3_js_1.Connection(rpc, "confirmed");
    // In production the wallet would come from the runtime's key manager.
    // Here we use a stub that satisfies the AnchorWallet interface.
    const walletKey = runtime.getSetting("ORACLE_PRIVATE_KEY");
    if (!walletKey) {
        throw new Error("ORACLE_PRIVATE_KEY not set in agent runtime settings");
    }
    // Decode keypair from base64 (matches oracle setup)
    const { Keypair } = require("@solana/web3.js"); // eslint-disable-line @typescript-eslint/no-var-requires
    const keypair = Keypair.fromSecretKey(Buffer.from(walletKey, "base64"));
    const wallet = {
        publicKey: keypair.publicKey,
        signTransaction: async (tx) => {
            if (!("version" in tx))
                tx.partialSign(keypair);
            return tx;
        },
        signAllTransactions: async (txs) => {
            txs.forEach((tx) => {
                if (!("version" in tx))
                    tx.partialSign(keypair);
            });
            return txs;
        },
    };
    return new sdk_1.AgentIdClient(connection, wallet);
}
/**
 * Map an ELIZA action name to an AgentID ActionType for reputation logging.
 */
function mapActionType(actionName) {
    const name = actionName.toLowerCase();
    if (name.includes("trade") || name.includes("defi") || name.includes("swap"))
        return "defi_trade";
    if (name.includes("pay") || name.includes("send") || name.includes("transfer"))
        return "payment";
    if (name.includes("post") || name.includes("publish") || name.includes("content"))
        return "content";
    return "other";
}
/**
 * Extract a Solana wallet address from a natural-language message.
 */
function extractWallet(text) {
    const match = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    return match ? match[0] : null;
}
// ── Plugin ────────────────────────────────────────────────────────────────────
exports.agentIdPlugin = {
    name: "agentid",
    description: "AgentID KYA — on-chain identity and reputation for ELIZA agents",
    actions: [
        {
            name: "GET_MY_REPUTATION",
            description: "Returns this agent's AgentID credential and reputation score",
            handler: async (runtime) => {
                if (!runtime.agentWallet) {
                    return "No agent wallet configured. Set agentWallet in your runtime config.";
                }
                let client;
                try {
                    client = buildClient(runtime);
                }
                catch (e) {
                    return `Configuration error: ${e.message}`;
                }
                const identity = await client.getAgentIdentity(runtime.agentWallet);
                if (!identity) {
                    return ("This agent has no AgentID credential. " +
                        "Register at https://agentid.xyz/register");
                }
                return [
                    "AgentID Credential:",
                    `  Name:       ${identity.name}`,
                    `  Framework:  ${identity.framework}`,
                    `  Model:      ${identity.llmModel}`,
                    `  Reputation: ${identity.reputationScore}/1000`,
                    `  Verified:   ${identity.verifiedLevel}`,
                    `  Registered: ${new Date(identity.registeredAt).toISOString()}`,
                    `  Transactions: ${identity.totalTransactions} (${identity.successfulTransactions} successful)`,
                ].join("\n");
            },
        },
        {
            name: "VERIFY_COUNTERPARTY_AGENT",
            description: "Verify another agent's credentials before transacting with them",
            handler: async (runtime, message) => {
                const text = message?.content?.text ?? "";
                const targetWallet = extractWallet(text);
                if (!targetWallet) {
                    return "Please provide the agent's wallet address to verify. Example: VERIFY_COUNTERPARTY_AGENT 2Hk9q...";
                }
                let client;
                try {
                    client = buildClient(runtime);
                }
                catch (e) {
                    return `Configuration error: ${e.message}`;
                }
                const result = await client.verifyAgent(targetWallet, "payment");
                if (!result.isRegistered) {
                    return `⛔ Agent ${targetWallet.slice(0, 8)}... is NOT registered on AgentID KYA. Do not transact.`;
                }
                if (!result.isAuthorized) {
                    return (`⚠️  Agent ${targetWallet.slice(0, 8)}... is registered but NOT authorized for payment. ` +
                        `Score: ${result.reputationScore}/1000 (minimum 400 required). ` +
                        `Level: ${result.verifiedLevel}`);
                }
                return (`✅ Agent verified and authorized.\n` +
                    `  Wallet:     ${targetWallet.slice(0, 8)}...\n` +
                    `  Score:      ${result.reputationScore}/1000\n` +
                    `  Level:      ${result.verifiedLevel}\n` +
                    `  Authorized: Yes (payment threshold met)`);
            },
        },
    ],
    // Hook into ELIZA's action:executed event to auto-log actions on-chain
    onActionExecuted: async (runtime, action, result) => {
        let client;
        try {
            client = buildClient(runtime);
        }
        catch {
            // If client can't be built (no key), skip logging silently
            return;
        }
        try {
            await client.logAction({
                actionType: mapActionType(action.name),
                programCalled: sdk_1.PROGRAM_ID,
                outcome: result.success,
                usdcTransferred: result.amount ?? 0,
            });
        }
        catch {
            // Non-fatal — reputation logging should never block agent execution
        }
    },
};
var sdk_2 = require("@agentid/sdk");
Object.defineProperty(exports, "PROGRAM_ID", { enumerable: true, get: function () { return sdk_2.PROGRAM_ID; } });
Object.defineProperty(exports, "DEVNET_RPC", { enumerable: true, get: function () { return sdk_2.DEVNET_RPC; } });
//# sourceMappingURL=index.js.map