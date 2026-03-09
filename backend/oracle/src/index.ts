import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bs58 from "bs58";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, Wallet } from "@coral-xyz/anchor";
import idl from "../../programs/agentid-program/target/idl/agentid_program.json";

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
    console.error("❌ Missing ORACLE_PRIVATE_KEY in .env");
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

// Points matrix
const POINTS = {
    defi_trade_success: 10,
    defi_trade_failed: -5,
    payment_success: 5,
    payment_failed: -5,
    rate_5_star: 20,
    rate_1_star: -10,
};

// ── Webhook Endpoint ────────────────────────────────────────────────────────

app.post("/webhook", async (req, res) => {
    // 0. Verify Webhook Auth Header
    const authHeader = req.headers.authorization;
    if (process.env.HELIUS_WEBHOOK_AUTH && authHeader !== process.env.HELIUS_WEBHOOK_AUTH) {
        return res.status(401).send("Unauthorized");
    }

    // Helius sends an array of enriched transactions
    const transactions = req.body;

    if (!Array.isArray(transactions)) {
        return res.status(400).send("Invalid payload");
    }

    console.log(`\n🔔 Received ${transactions.length} transaction(s) from Helius`);

    for (const tx of transactions) {
        // 1. Check if it's a successful transaction
        if (tx.meta?.err || tx.transactionError) {
            console.log(`⏩ Skipping tx ${tx.signature}: Transaction failed`);
            continue;
        }

        console.log(`🔍 Analyzing tx: ${tx.signature}`);

        // Check if tx interacts with our program
        const logs = tx.meta?.logMessages || [];
        const isOurs = logs.some((l: string) => l.includes(PROGRAM_ID.toBase58()));
        if (!isOurs) continue;

        // VERY naive matching for demonstration:
        // Assume standard 10 points for an action for now, or match on string
        let pointsToAdd = 0;
        const logStr = logs.join(" ");

        if (logStr.includes("Instruction: LogAction")) {
            pointsToAdd = 10;
            console.log(`   └─ Detected LogAction (+10 pts)`);
        } else if (logStr.includes("Instruction: Rate")) {
            pointsToAdd = 20;
            console.log(`   └─ Detected Rate (+20 pts)`);
        } else {
            continue; // Not an action we score
        }

        try {
            // [CONFIG]
            const [configPda] = PublicKey.findProgramAddressSync(
                [CONFIG_SEED],
                PROGRAM_ID
            );

            // For demonstration, let's pretend we extracted the specific agent PDA that
            // was interacted with. Currently we'll just skip if we don't have it.
            // In reality, we'd execute this against the parsed \`agentIdentity\` pubkey.
            console.log(`   └─ Ready to call update_reputation with ${pointsToAdd} points!`);

            /*
            const agentIdentityPda = ...; // Extracted from instruction accounts
            const txSig = await program.methods
                .updateReputation(pointsToAdd)
                .accountsStrict({
                    oracleAuthority: oracleWallet.publicKey,
                    config: configPda,
                    agentIdentity: agentIdentityPda,
                })
                .rpc();
            console.log(`   ✅ Reputation updated: ${txSig}`);
            */
        } catch (e) {
            console.error("   ❌ Failed to update reputation", e);
        }
    }

    res.status(200).send("OK");
});

app.listen(PORT, () => {
    console.log(`\n🚀 Oracle backend listening on port ${PORT}`);
});
