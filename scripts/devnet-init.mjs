#!/usr/bin/env node
/**
 * devnet-init.mjs — Bootstrap AgentID program on devnet
 *
 * Calls init_config if the program-config PDA doesn't exist yet.
 * This MUST be run once before any agent can register on-chain.
 *
 * Usage:
 *   node scripts/devnet-init.mjs
 *
 * Requires:
 *   - backend/.env with ORACLE_PRIVATE_KEY and SOLANA_RPC_URL
 *   - Node 18+
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// ── Load env ────────────────────────────────────────────────────────────────

function readEnv(relPath) {
  const abs = path.join(root, relPath);
  if (!existsSync(abs)) return {};
  const lines = readFileSync(abs, "utf8").split(/\r?\n/);
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

// ── Load Anchor / web3.js ────────────────────────────────────────────────────

// Resolve from backend node_modules (Anchor is installed there)
const BACKEND = path.join(root, "backend");
process.chdir(BACKEND);

// Dynamic import with resolved paths
const anchorPkg = path.join(BACKEND, "node_modules", "@coral-xyz", "anchor");
const web3Pkg = path.join(BACKEND, "node_modules", "@solana", "web3.js");
const idlPath = path.join(root, "backend", "idl", "agentid_program.json");

const { default: anchor } = await import(anchorPkg);
const web3 = await import(web3Pkg);

const IDL = JSON.parse(readFileSync(idlPath, "utf8"));
const PROGRAM_ID = new web3.PublicKey(IDL.address);

// ── Setup provider with oracle keypair ──────────────────────────────────────

const connection = new web3.Connection(RPC_URL, "confirmed");
const oracleKp = web3.Keypair.fromSecretKey(keypairBytes);

console.log("\n╔═══════════════════════════════════════════════════════╗");
console.log("║         AgentID Devnet Initializer                    ║");
console.log("╚═══════════════════════════════════════════════════════╝");
console.log(`\n  RPC    : ${RPC_URL.replace(/api-key=[^&]+/, "api-key=***")}`);
console.log(`  Admin  : ${oracleKp.publicKey.toBase58()}`);
console.log(`  Oracle : ${oracleKp.publicKey.toBase58()} (same key)`);
console.log(`  Program: ${PROGRAM_ID.toBase58()}`);

// ── Check SOL balance ───────────────────────────────────────────────────────

const balance = await connection.getBalance(oracleKp.publicKey);
console.log(`\n  Balance: ${(balance / 1e9).toFixed(4)} SOL`);
if (balance < 0.01 * 1e9) {
  console.error("\n❌  Not enough SOL. Airdrop first:");
  console.error(`   solana airdrop 1 ${oracleKp.publicKey.toBase58()} --url devnet`);
  process.exit(1);
}

// ── Derive program-config PDA ───────────────────────────────────────────────

const [configPda, configBump] = web3.PublicKey.findProgramAddressSync(
  [Buffer.from("program-config")],
  PROGRAM_ID
);
console.log(`\n  Config PDA: ${configPda.toBase58()} (bump=${configBump})`);

// ── Check if already initialized ────────────────────────────────────────────

const configInfo = await connection.getAccountInfo(configPda);
if (configInfo) {
  console.log("\n✅  program-config PDA already exists — no action needed.");
  console.log("   Data size:", configInfo.data.length, "bytes");
  console.log("\n   Agents should be able to register. Try again in the dashboard.");
  process.exit(0);
}

console.log("\n⚡  program-config PDA NOT found. Calling init_config...");

// ── Build and send init_config transaction ───────────────────────────────────

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
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([oracleKp])
    .rpc({ commitment: "confirmed" });

  console.log(`\n✅  init_config SUCCESS!`);
  console.log(`   Signature: ${tx}`);
  console.log(`   Explorer : https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  console.log(`\n   program-config PDA: ${configPda.toBase58()}`);

  // Verify
  const verifyInfo = await connection.getAccountInfo(configPda);
  if (verifyInfo) {
    console.log(`   Account size: ${verifyInfo.data.length} bytes ✓`);
  }

  console.log("\n🎉  Devnet is initialized. Users can now register agents!");
  console.log(`   Go to: https://agentid.netlify.app/register`);

} catch (err) {
  console.error("\n❌  init_config failed:", err?.message ?? err);
  if (err?.logs) {
    console.error("   Logs:");
    for (const log of err.logs) console.error("  ", log);
  }
  process.exit(1);
}
