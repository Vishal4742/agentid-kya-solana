import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bs58 from "bs58";
import cron from "node-cron";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, Wallet } from "@coral-xyz/anchor";
import idl from "../../target/idl/agentid_program.json";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "500kb" }));

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Load Oracle Authority Keypair
// Expected in .env as ORACLE_PRIVATE_KEY=[12,34,56...]
const privateKeyString = process.env.ORACLE_PRIVATE_KEY;
if (!privateKeyString) {
    console.error("❌ Missing ORACLE_PRIVATE_KEY in .env — see .env.example");
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
const CONFIG_SEED = Buffer.from("config");

const [configPda] = PublicKey.findProgramAddressSync(
    [CONFIG_SEED],
    PROGRAM_ID
);

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

            // 3. Compute reputation score using weighted formula
            const totalTx = agentData.totalTransactions.toNumber();
            const successTx = agentData.successfulTransactions.toNumber();
            const ratingX10 = agentData.humanRatingX10;
            const ratingCount = agentData.ratingCount;
            const regAt = agentData.registeredAt.toNumber();
            const verLevel = agentData.verifiedLevel;

            // Success rate: (successful/total) * 400 (40%)
            const successRate = totalTx === 0 ? 0 : (successTx / totalTx);
            const scoreSuccess = successRate * 400;

            // Human rating: ((rating-1)/4) * 200 (20%)
            // Neutral rating (3) if no ratings yet
            const actualRating = ratingCount === 0 ? 3 : (ratingX10 / 10);
            const scoreRating = Math.max(0, ((actualRating - 1) / 4) * 200);

            // Longevity: min(days_since_registration/365, 1) * 150 (15%)
            const daysSinceReg = (Date.now() / 1000 - regAt) / (60 * 60 * 24);
            const scoreLongevity = Math.min(Math.max(daysSinceReg, 0) / 365, 1) * 150;

            // Tx volume: min(total_usdc/100000, 1) * 150 (15%)
            // (Total USDC volume is tracked via AgentTreasury in Phase 8 - assuming 0 for now)
            const scoreVolume = 0;

            // Verification: Unverified=0, Email=50, KYB=100, Audited=200 (10%)
            let scoreVerification = 0;
            if (verLevel === 1) scoreVerification = 50;   // EmailVerified
            if (verLevel === 2) scoreVerification = 100;  // KYBVerified
            if (verLevel === 3) scoreVerification = 200;  // Audited

            // Final score: 0 to 1000
            const totalScore = Math.floor(scoreSuccess + scoreRating + scoreLongevity + scoreVolume + scoreVerification);
            const newScore = Math.min(Math.max(totalScore, 0), 1000);

            console.log(`   └─ Computed Score: ${newScore} (Success: ${Math.round(scoreSuccess)}, Rating: ${Math.round(scoreRating)}, Longevity: ${Math.round(scoreLongevity)}, Verif: ${scoreVerification})`);
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

            // Compute reputation score using weighted formula
            const totalTx = agentData.totalTransactions.toNumber();
            const successTx = agentData.successfulTransactions.toNumber();
            const ratingX10 = agentData.humanRatingX10;
            const ratingCount = agentData.ratingCount;
            const regAt = agentData.registeredAt.toNumber();
            const verLevel = agentData.verifiedLevel;

            const successRate = totalTx === 0 ? 0 : (successTx / totalTx);
            const scoreSuccess = successRate * 400;

            const actualRating = ratingCount === 0 ? 3 : (ratingX10 / 10);
            const scoreRating = Math.max(0, ((actualRating - 1) / 4) * 200);

            const daysSinceReg = (Date.now() / 1000 - regAt) / (60 * 60 * 24);
            const scoreLongevity = Math.min(Math.max(daysSinceReg, 0) / 365, 1) * 150;

            const scoreVolume = 0; // Total USDC volume assumed 0 for now (Phase 8 feature)

            let scoreVerification = 0;
            if (verLevel === 1) scoreVerification = 50;
            if (verLevel === 2) scoreVerification = 100;
            if (verLevel === 3) scoreVerification = 200;

            const totalScore = Math.floor(scoreSuccess + scoreRating + scoreLongevity + scoreVolume + scoreVerification);
            const newScore = Math.min(Math.max(totalScore, 0), 1000);

            // Skip update if score hasn't changed to save fees
            if (agentData.reputationScore === newScore) {
                continue;
            }

            console.log(`   └─ Updating ${agentData.name} (${agentIdentityPda.toBase58().slice(0, 8)}): ${agentData.reputationScore} ➡️ ${newScore}`);

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
