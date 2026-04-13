#!/usr/bin/env node
/**
 * devnet-init.js — CommonJS Bootstrap script for AgentID program on devnet
 *
 * Calls init_config if the program-config PDA doesn't exist yet.
 * This MUST be run once before any agent can register on-chain.
 *
 * Usage (from repo root, inside WSL or Git Bash):
 *   cd backend && node ../scripts/devnet-init.js
 *
 * Requires backend/node_modules to be installed (yarn install in backend/).
 */

"use strict";
const path = require("path");
const fs = require("fs");

// Must run from repo root or backend/
const root = path.resolve(__dirname, "..");
const BACKEND = path.join(root, "backend");

// ── Load env ────────────────────────────────────────────────────────────────
function readEnv(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) return {};
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const sep = t.indexOf("=");
    if (sep === -1) continue;
    env[t.slice(0, sep).trim()] = t.slice(sep + 1).trim();
  }
  return env;
}

const backendEnv = readEnv("backend/.env");
const apiEnv = readEnv("backend/api/.env");

const RPC_URL =
  backendEnv.SOLANA_RPC_URL ||
  apiEnv.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

const ORACLE_KEY_RAW = backendEnv.ORACLE_PRIVATE_KEY || apiEnv.ORACLE_PRIVATE_KEY;
if (!ORACLE_KEY_RAW) {
  console.error("❌  ORACLE_PRIVATE_KEY not found in backend/.env");
  process.exit(1);
}

let keypairBytes;
try {
  keypairBytes = Uint8Array.from(JSON.parse(ORACLE_KEY_RAW));
} catch {
  console.error("❌  Failed to parse ORACLE_PRIVATE_KEY as JSON array");
  process.exit(1);
}

// ── Require Anchor from backend node_modules ────────────────────────────────
const anchor = require(path.join(BACKEND, "node_modules/@coral-xyz/anchor"));
const { Connection, Keypair, PublicKey, SystemProgram } = require(
  path.join(BACKEND, "node_modules/@solana/web3.js")
);

const IDL = JSON.parse(
  fs.readFileSync(path.join(root, "backend/idl/agentid_program.json"), "utf8")
);
const PROGRAM_ID = new PublicKey(IDL.address);

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const oracleKp = Keypair.fromSecretKey(keypairBytes);
  const connection = new Connection(RPC_URL, "confirmed");

  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║         AgentID Devnet Initializer                    ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`\n  RPC    : ${RPC_URL.replace(/api-key=[^&]+/, "api-key=***")}`);
  console.log(`  Admin  : ${oracleKp.publicKey.toBase58()}`);
  console.log(`  Oracle : ${oracleKp.publicKey.toBase58()}`);
  console.log(`  Program: ${PROGRAM_ID.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(oracleKp.publicKey);
  console.log(`\n  Balance: ${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 0.005 * 1e9) {
    console.error("\n❌  Not enough SOL to pay for init_config.");
    console.error(`   Run: solana airdrop 1 ${oracleKp.publicKey.toBase58()} --url devnet`);
    process.exit(1);
  }

  // Derive program-config PDA
  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("program-config")],
    PROGRAM_ID
  );
  console.log(`\n  Config PDA : ${configPda.toBase58()} (bump=${configBump})`);

  // Check if already initialized
  const configInfo = await connection.getAccountInfo(configPda);
  if (configInfo) {
    console.log("\n✅  program-config PDA already exists — nothing to do.");
    console.log(`   Data size: ${configInfo.data.length} bytes`);
    console.log("\n   The program is already bootstrapped. Users can register agents.");
    console.log("   If registration still fails, the issue is likely the Bubblegum");
    console.log("   merkle tree — check that the shared tree account is cloned.");
    return;
  }

  console.log("\n⚡  program-config NOT found. Calling init_config on devnet...");

  // Setup Anchor provider
  const wallet = new anchor.Wallet(oracleKp);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new anchor.Program(IDL, provider);

  try {
    const tx = await program.methods
      .initConfig()
      .accounts({
        admin: oracleKp.publicKey,
        oracle: oracleKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([oracleKp])
      .rpc({ commitment: "confirmed" });

    console.log(`\n✅  init_config SUCCESS`);
    console.log(`   Signature : ${tx}`);
    console.log(`   Explorer  : https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log(`   Config PDA: ${configPda.toBase58()}`);

    // Verify
    const verifyInfo = await connection.getAccountInfo(configPda);
    console.log(`   Byte size : ${verifyInfo?.data.length ?? "?"} bytes ✓`);

    console.log(
      "\n🎉  Devnet is now bootstrapped. Users can register agents at:"
    );
    console.log("   https://agentid.netlify.app/register");
  } catch (err) {
    console.error("\n❌  init_config failed:", err?.message ?? err);
    if (err?.logs?.length) {
      console.error("\n   Program logs:");
      for (const log of err.logs) console.error("  ", log);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
