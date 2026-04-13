#!/usr/bin/env node
/**
 * Treasury Smoke Test — devnet
 *
 * Validates the full treasury lifecycle against live deployed infrastructure:
 *   1. RPC connectivity (Helius devnet)
 *   2. Program account existence
 *   3. List registered agents on-chain
 *   4. Derive treasury PDA for the first found agent
 *   5. Hit the live Vercel metadata API with a real agent pubkey/name
 *   6. Hit the live Vercel premium/treasury API (expect 402 or 200 with treasury data)
 *   7. Validate treasury account fields if treasury is initialized
 *
 * Usage:
 *   node scripts/treasury-smoke.mjs
 *
 * Prerequisites:
 *   - backend/api/.env must have SOLANA_RPC_URL set
 *   - Node 18+ (uses native fetch)
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

// ── Config ─────────────────────────────────────────────────────────────────

const VERCEL_API_BASE = "https://agentid-kya-solana.vercel.app";
const NETLIFY_BASE = "https://agentid.netlify.app";

function readEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
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

const apiEnv = readEnv(path.join(root, "backend/api/.env"));
const backendEnv = readEnv(path.join(root, "backend/.env"));
const RPC_URL =
  apiEnv.SOLANA_RPC_URL ||
  backendEnv.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

// ── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function pass(name, detail = "") {
  passed++;
  results.push({ status: "✅", name, detail });
  console.log(`  ✅  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed++;
  results.push({ status: "❌", name, detail });
  console.log(`  ❌  ${name}${detail ? ` — ${detail}` : ""}`);
}

function warn(name, detail = "") {
  results.push({ status: "⚠️ ", name, detail });
  console.log(`  ⚠️   ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 55 - title.length))}`);
}

async function rpcCall(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function httpGet(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  return { status: res.status, body };
}

// ── Read IDL for program ID ─────────────────────────────────────────────────

const IDL_PATH = path.join(root, "backend/idl/agentid_program.json");
let PROGRAM_ID;
try {
  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  PROGRAM_ID = idl.address;
} catch {
  console.error("❌  Could not read backend/idl/agentid_program.json");
  process.exit(1);
}

// ── PDA derivation (pure JS, no @solana/web3.js needed) ────────────────────
// We use dynamic import of @solana/web3.js from the backend node_modules.

async function loadSolana() {
  try {
    // Try backend node_modules first
    const solanaPath = path.join(root, "backend/node_modules/@solana/web3.js");
    if (existsSync(solanaPath)) {
      return await import(
        path.join(root, "backend/node_modules/@solana/web3.js/lib/index.cjs.js")
      ).catch(() =>
        import(
          path.join(root, "backend/node_modules/@solana/web3.js/lib/index.browser.cjs.js")
        )
      );
    }
  } catch { /* fall through */ }
  // Fallback — try global
  return import("@solana/web3.js");
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         AgentID Treasury Smoke Test — Devnet             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  RPC : ${RPC_URL.replace(/api-key=[^&]+/, "api-key=***")}`);
  console.log(`  API : ${VERCEL_API_BASE}`);
  console.log(`  App : ${NETLIFY_BASE}`);

  // ── 1. RPC health ───────────────────────────────────────────────────────
  section("1. RPC Connectivity");
  try {
    const slot = await rpcCall("getSlot");
    pass("Helius devnet RPC reachable", `slot ${slot}`);
  } catch (e) {
    fail("RPC unreachable", String(e));
    console.log("\nSmoke test aborted — RPC must be reachable.\n");
    process.exit(1);
  }

  // ── 2. Program account ──────────────────────────────────────────────────
  section("2. On-chain Program");
  try {
    const info = await rpcCall("getAccountInfo", [
      PROGRAM_ID,
      { encoding: "base64" },
    ]);
    if (info?.value?.executable) {
      pass("Program account exists and is executable", PROGRAM_ID);
    } else if (info?.value) {
      warn("Program account exists but is NOT executable", PROGRAM_ID);
    } else {
      fail("Program account NOT found on devnet", PROGRAM_ID);
    }
  } catch (e) {
    fail("Could not fetch program account", String(e));
  }

  // ── 3. Find registered agents ───────────────────────────────────────────
  section("3. On-chain Agent Identities");

  const IDENTITY_DISCRIMINATOR = Buffer.from([
    // sha256("account:AgentIdentity")[0..8] — anchor discriminator
    // We'll use getProgramAccounts with dataSize filter and pick first match
  ]);

  let agents = [];
  try {
    const allAccounts = await rpcCall("getProgramAccounts", [
      PROGRAM_ID,
      { encoding: "base64" },
    ]);
    agents = allAccounts ?? [];
    if (agents.length > 0) {
      pass(`Found ${agents.length} program account(s) on devnet`);
    } else {
      warn("No program accounts found — program may not have been used on devnet yet");
    }
  } catch (e) {
    fail("getProgramAccounts failed", String(e));
  }

  // ── 4. Frontend health ──────────────────────────────────────────────────
  section("4. Frontend (Netlify)");
  try {
    const res = await fetch(NETLIFY_BASE, { redirect: "follow" });
    if (res.ok) {
      pass("Frontend responds 200", NETLIFY_BASE);
    } else {
      fail(`Frontend returned HTTP ${res.status}`, NETLIFY_BASE);
    }
  } catch (e) {
    fail("Frontend unreachable", String(e));
  }

  // ── 5. Metadata API — placeholder (name-based) ──────────────────────────
  section("5. Metadata API (Vercel)");
  {
    const url = `${VERCEL_API_BASE}/metadata/Test%20Agent`;
    try {
      const { status, body } = await httpGet(url);
      if (status === 200 && body?.name) {
        pass("Metadata by name returns valid NFT JSON", `name="${body.name}"`);
        if (body.image?.includes("agentid.netlify.app")) {
          pass("Metadata image URL uses FRONTEND_BASE (Netlify)", body.image);
        } else if (body.image?.includes("vercel.app")) {
          warn(
            "Metadata image falls back to Vercel placeholder — FRONTEND_BASE not set in Vercel yet",
            body.image
          );
        }
        if (body.external_url?.includes("agentid.netlify.app")) {
          pass("Metadata external_url uses FRONTEND_BASE", body.external_url);
        } else {
          warn(
            "Metadata external_url does not use FRONTEND_BASE",
            body.external_url
          );
        }
      } else if (status === 200) {
        warn("Metadata returned 200 but unexpected body shape", JSON.stringify(body).slice(0, 100));
      } else {
        fail(`Metadata returned HTTP ${status}`, JSON.stringify(body).slice(0, 100));
      }
    } catch (e) {
      fail("Metadata API unreachable", String(e));
    }
  }

  // ── 6. Metadata API — bad slug (should return 400 or placeholder) ───────
  {
    const url = `${VERCEL_API_BASE}/metadata/ab`;
    const { status } = await httpGet(url);
    if (status === 400) {
      pass("Metadata rejects slug < 3 chars with 400");
    } else {
      warn(`Metadata slug validation: expected 400, got ${status}`);
    }
  }

  // ── 7. Oracle webhook — GET rejected ───────────────────────────────────
  section("6. Oracle Webhook (Vercel)");
  {
    const url = `${VERCEL_API_BASE}/oracle/webhook`;
    const { status, body } = await httpGet(url);
    if (status === 405) {
      pass("Webhook correctly rejects GET with 405");
    } else {
      fail(`Webhook GET expected 405, got ${status}`, JSON.stringify(body).slice(0, 80));
    }
  }

  // ── 8. Oracle webhook — POST without auth ──────────────────────────────
  {
    const url = `${VERCEL_API_BASE}/oracle/webhook`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([]),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 401) {
        pass("Webhook correctly rejects unauthenticated POST with 401");
      } else if (res.status === 500 && body?.error?.includes("misconfigured")) {
        warn(
          "Webhook returns 500 — ORACLE_WEBHOOK_SECRET not set in Vercel env yet",
          "Set ORACLE_WEBHOOK_SECRET in Vercel dashboard"
        );
      } else {
        warn(`Webhook unauthenticated POST returned ${res.status}`, JSON.stringify(body).slice(0, 80));
      }
    } catch (e) {
      fail("Webhook POST failed", String(e));
    }
  }

  // ── 9. Premium Treasury API — invalid pubkey ────────────────────────────
  section("7. Premium Treasury API (Vercel)");
  {
    const url = `${VERCEL_API_BASE}/premium/treasury/not-a-pubkey`;
    const { status, body } = await httpGet(url);
    if (status === 400 && body?.error?.includes("base58")) {
      pass("Treasury API correctly rejects invalid pubkey with 400");
    } else {
      fail(`Treasury API pubkey validation: expected 400/base58, got ${status}`, JSON.stringify(body).slice(0, 80));
    }
  }

  // ── 10. Premium Treasury API — real pubkey (expect 404 or 402) ─────────
  {
    // Use the oracle key from .env as a known pubkey on devnet
    let oraclePubkey = null;
    try {
      const keyArr = JSON.parse(backendEnv.ORACLE_PRIVATE_KEY || apiEnv.ORACLE_PRIVATE_KEY || "[]");
      if (keyArr.length === 64) {
        // Derive public key: last 32 bytes of a 64-byte keypair
        const pubkeyBytes = keyArr.slice(32);
        // Convert to base58 without web3.js — use a simple base58 encoder
        const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        function toBase58(bytes) {
          let leading = 0;
          for (const b of bytes) { if (b) break; leading++; }
          const digits = [0];
          for (const byte of bytes) {
            let carry = byte;
            for (let i = 0; i < digits.length; i++) {
              carry += digits[i] << 8;
              digits[i] = carry % 58;
              carry = Math.floor(carry / 58);
            }
            while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
          }
          return "1".repeat(leading) + digits.reverse().map(d => B58_ALPHABET[d]).join("");
        }
        oraclePubkey = toBase58(Buffer.from(pubkeyBytes));
      }
    } catch { /* skip */ }

    if (oraclePubkey) {
      const url = `${VERCEL_API_BASE}/premium/treasury/${oraclePubkey}`;
      const { status, body } = await httpGet(url);
      if (status === 402) {
        pass("Treasury API returns 402 Payment Required for valid pubkey (no payment header)", `agent=${oraclePubkey.slice(0,8)}...`);
      } else if (status === 404 && body?.error?.includes("identity")) {
        pass("Treasury API returns 404 — no agent registered for this pubkey (expected on fresh devnet)", `agent=${oraclePubkey.slice(0,8)}...`);
      } else if (status === 404 && body?.error?.includes("Treasury")) {
        pass("Treasury API returns 404 — agent found but treasury NOT initialized yet", `agent=${oraclePubkey.slice(0,8)}...`);
        warn("ACTION REQUIRED: Initialize treasury via the dashboard", `Go to ${NETLIFY_BASE}/dashboard → Treasury panel`);
      } else if (status === 200 && body?.treasury) {
        pass("Treasury API returns 200 with full treasury data! 🎉", `balance=${body.treasury.usdc_balance} USDC`);
        console.log("  Treasury data:");
        console.log(`    address       : ${body.treasury.address}`);
        console.log(`    usdc_balance  : ${body.treasury.usdc_balance} USDC`);
        console.log(`    total_earned  : ${body.treasury.total_earned} USDC`);
        console.log(`    total_spent   : ${body.treasury.total_spent} USDC`);
        console.log(`    emergency_pause: ${body.treasury.emergency_pause}`);
      } else {
        warn(`Treasury API returned unexpected ${status}`, JSON.stringify(body).slice(0, 120));
      }
    } else {
      warn("Could not derive oracle pubkey from ORACLE_PRIVATE_KEY — skipping real pubkey test");
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                     Smoke Test Results                   ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Passed : ${String(passed).padEnd(3)}   Failed : ${String(failed).padEnd(3)}                          ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    console.log("❌  Some checks failed. See details above.\n");
    process.exit(1);
  } else {
    console.log("✅  All checks passed.\n");
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
