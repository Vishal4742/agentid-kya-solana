import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bs58 from "bs58";
import fs from "fs";
import path from "path";
import cron from "node-cron";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, Wallet } from "@coral-xyz/anchor";
import { calculateReputationScore } from "./reputation";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const idlPath = path.resolve(__dirname, "../../../src/idl/agentid_program.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8")) as Idl;

const app = express();
app.use(cors());
app.use(express.json({ limit: "500kb" }));

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Load Oracle Authority Keypair
// Expected in .env as ORACLE_PRIVATE_KEY=[12,34,56...]
const privateKeyString = process.env.ORACLE_PRIVATE_KEY;
if (!privateKeyString) {
    console.error("❌ Missing ORACLE_PRIVATE_KEY in backend/.env — see backend/.env.example");
    process.exit(1);
}

let secretKey: Uint8Array;
try {
    secretKey = Uint8Array.from(JSON.parse(privateKeyString));
} catch (e) {
    console.error("❌ Invalid ORACLE_PRIVATE_KEY format. Must be a JSON array.");
    process.exit(1);
}
const oracleKeypair = Keypair.fromSecretKey(secretKey);
const oracleWallet = new Wallet(oracleKeypair);

console.log(`🔑 Oracle Authority: ${oracleKeypair.publicKey.toBase58()}`);

// Setup Anchor Program
const connection = new Connection(RPC_URL, "confirmed");
const provider = new AnchorProvider(connection, oracleWallet, {
    preflightCommitment: "confirmed",
});
// Program ID is read from the IDL (Anchor 0.30)
const program = new Program(idl as Idl, provider);
const PROGRAM_ID = program.programId;

console.log(`📜 Loaded Program: ${PROGRAM_ID.toBase58()}`);

// Seed prefixes from Anchor program
const CONFIG_SEED = Buffer.from("program-config");
const TREASURY_SEED = Buffer.from("agent-treasury");

const [configPda] = PublicKey.findProgramAddressSync(
    [CONFIG_SEED],
    PROGRAM_ID
);

function toSafeNumber(value: any): number {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "bigint") {
        return Number(value);
    }
    if (value && typeof value.toNumber === "function") {
        return value.toNumber();
    }
    return Number(value ?? 0);
}

async function fetchAgentActionTimestamps(agentIdentityPda: PublicKey): Promise<number[]> {
    const actions = await (program.account as any).agentAction.all([
        {
            memcmp: {
                offset: 8,
                bytes: agentIdentityPda.toBase58(),
            },
        },
    ]);

    return actions.map((action: any) => toSafeNumber(action.account.timestamp));
}

async function fetchTreasuryVolumeLamports(agentIdentityPda: PublicKey): Promise<number> {
    const [treasuryPda] = PublicKey.findProgramAddressSync(
        [TREASURY_SEED, agentIdentityPda.toBuffer()],
        PROGRAM_ID
    );

    try {
        const treasury = await (program.account as any).agentTreasury.fetch(treasuryPda);
        return toSafeNumber(treasury.totalEarned) + toSafeNumber(treasury.totalSpent);
    } catch {
        return 0;
    }
}

async function buildReputation(agentIdentityPda: PublicKey, agentData: any) {
    const [actionTimestamps, totalVolumeLamports] = await Promise.all([
        fetchAgentActionTimestamps(agentIdentityPda),
        fetchTreasuryVolumeLamports(agentIdentityPda),
    ]);

    return calculateReputationScore({
        totalTransactions: toSafeNumber(agentData.totalTransactions),
        successfulTransactions: toSafeNumber(agentData.successfulTransactions),
        humanRatingX10: toSafeNumber(agentData.humanRatingX10),
        ratingCount: toSafeNumber(agentData.ratingCount),
        registeredAt: toSafeNumber(agentData.registeredAt),
        verifiedLevel: toSafeNumber(agentData.verifiedLevel),
        actionTimestamps,
        totalVolumeLamports,
    });
}

// ── Webhook Endpoint ────────────────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
    // 0. Verify Webhook Auth Header — always required
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.HELIUS_WEBHOOK_AUTH;
    if (!expectedAuth) {
        console.error("❌ HELIUS_WEBHOOK_AUTH not set — refusing all webhook requests");
        return res.status(500).send("Server misconfigured");
    }
    if (authHeader !== expectedAuth) {
        console.warn(`⚠️  Unauthorized webhook attempt from ${req.ip}`);
        return res.status(401).send("Unauthorized");
    }

    // Helius sends an array of enriched transactions
    const transactions = req.body;

    if (!Array.isArray(transactions)) {
        return res.status(400).send("Invalid payload");
    }

    console.log(`\n🔔 Received ${transactions.length} transaction(s) from Helius`);

    for (const tx of transactions) {
        // 1. Only process confirmed successful transactions
        // tx.meta.err is null on success and an object on failure
        const hasTxError = tx.meta?.err !== null && tx.meta?.err !== undefined;
        if (hasTxError || tx.transactionError) {
            console.log(`⏩ Skipping tx ${tx.signature}: Transaction failed`);
            continue;
        }

        console.log(`🔍 Analyzing tx: ${tx.signature}`);

        // 2. Identify the action (for logs, though we recalculate full score anyway)
        const logs = tx.meta?.logMessages || [];
        const isOurs = logs.some((l: string) => l.includes(PROGRAM_ID.toBase58()));
        if (!isOurs) continue;

        const logStr = logs.join(" ");
        if (logStr.includes("Instruction: LogAction")) {
            console.log(`   └─ Detected LogAction interaction`);
        } else if (logStr.includes("Instruction: RateAgent") || logStr.includes("Instruction: Rate")) {
            console.log(`   └─ Detected Rate interaction`);
        } else {
            continue; // Not an action that triggers reputation recalc
        }

        try {
            // Extract the AgentIdentity PDA from the transaction's account keys.
            const accountKeys: string[] =
                tx.accountData?.map((a: { account: string }) => a.account) ||
                tx.transaction?.message?.accountKeys ||
                [];

            let agentIdentityPda: PublicKey | null = null;
            let agentData: any = null;

            for (const key of accountKeys) {
                try {
                    const pk = new PublicKey(key);
                    if (pk.equals(PROGRAM_ID) || pk.equals(oracleKeypair.publicKey)) continue;
                    
                    const data = await (program.account as any).agentIdentity.fetch(pk);
                    agentIdentityPda = pk;
                    agentData = data;
                    break;
                } catch {
                    // Not an AgentIdentity account
                }
            }

            if (!agentIdentityPda || !agentData) {
                console.log(`   └─ No valid AgentIdentity PDA found in tx — skipping`);
                continue;
            }

            const {
                newScore,
                activeDays,
                successTrustMultiplier,
                scoreSuccess,
                scoreRating,
                scoreLongevity,
                scoreVolume,
                scoreVerification,
            } = await buildReputation(agentIdentityPda, agentData);

            console.log(`   └─ Computed Score: ${newScore} (Success: ${Math.round(scoreSuccess)}, Rating: ${Math.round(scoreRating)}, Longevity: ${Math.round(scoreLongevity)}, Volume: ${Math.round(scoreVolume)}, Verif: ${scoreVerification}, ActiveDays: ${activeDays}, SuccessTrust: ${successTrustMultiplier.toFixed(2)})`);
            console.log(`   └─ Calling update_reputation(${newScore}) for ${agentIdentityPda.toBase58().slice(0, 8)}...`);

            // 4. Update the computed score on-chain
            const txSig = await (program.methods as any)
                .updateReputation(newScore)
                .accountsStrict({
                    identity: agentIdentityPda,
                    oracle: oracleWallet.publicKey,
                    config: configPda,
                })
                .rpc();
            
            console.log(`   ✅ Reputation updated to ${newScore}: ${txSig}`);
        } catch (e) {
            console.error("   ❌ Failed to update reputation", e);
        }
    }

    res.status(200).send("OK");
});

app.listen(PORT, () => {
    console.log(`\n🚀 Oracle backend listening on port ${PORT}`);
});

// ── Cron Job: Hourly Reputation Sync ─────────────────────────────────────────
cron.schedule("0 * * * *", async () => {
    console.log(`\n⏰ Running hourly reputation sync...`);
    try {
        const allAgents = await (program.account as any).agentIdentity.all();
        console.log(`   └─ Found ${allAgents.length} agents to update.`);

        for (const agent of allAgents) {
            const agentIdentityPda = agent.publicKey;
            const agentData = agent.account;

            const {
                newScore,
                activeDays,
                successTrustMultiplier,
                scoreSuccess,
                scoreRating,
                scoreLongevity,
                scoreVolume,
                scoreVerification,
            } = await buildReputation(agentIdentityPda, agentData);

            // Skip update if score hasn't changed to save fees
            if (agentData.reputationScore === newScore) {
                continue;
            }

            console.log(`   └─ Updating ${agentData.name} (${agentIdentityPda.toBase58().slice(0, 8)}): ${agentData.reputationScore} ➡️ ${newScore}`);
            console.log(`      Breakdown: Success ${Math.round(scoreSuccess)}, Rating ${Math.round(scoreRating)}, Longevity ${Math.round(scoreLongevity)}, Volume ${Math.round(scoreVolume)}, Verif ${scoreVerification}, ActiveDays ${activeDays}, SuccessTrust ${successTrustMultiplier.toFixed(2)}`);

            try {
                await (program.methods as any)
                    .updateReputation(newScore)
                    .accountsStrict({
                        identity: agentIdentityPda,
                        oracle: oracleWallet.publicKey,
                        config: configPda,
                    })
                    .rpc();
            } catch (updateErr) {
                console.error(`   ❌ Update failed for ${agentData.name}:`, updateErr);
            }
        }
        console.log(`   ✅ Hourly sync complete.`);
    } catch (err) {
        console.error("   ❌ Failed hourly sync:", err);
    }
});
