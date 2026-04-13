import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const placeholderPatterns = [
  /replace-with/i,
  /replace_with/i,
  /\[replace/i,
  /your-api-domain/i,
  /your-netlify-site/i,
];

function readEnvFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const values = {};
  const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value;
  }

  return values;
}

function hasPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function logSection(title) {
  console.log(`\n${title}`);
}

function checkRequiredKeys(label, envValues, keys, allowMissingFile = false) {
  if (!envValues) {
    if (allowMissingFile) {
      console.log(`- skipped: no local file for ${label}`);
      return { ok: true, warnings: 1 };
    }

    console.log(`- missing file for ${label}`);
    return { ok: false, warnings: 0 };
  }

  let ok = true;
  let warnings = 0;

  for (const key of keys) {
    const value = envValues[key];
    if (!value) {
      console.log(`- missing ${key}`);
      ok = false;
      continue;
    }

    if (hasPlaceholder(value)) {
      console.log(`- placeholder value for ${key}`);
      warnings += 1;
      continue;
    }

    console.log(`- ${key} present`);
  }

  return { ok, warnings };
}

function ensureFile(relativePath) {
  const present = existsSync(path.join(root, relativePath));
  console.log(`- ${relativePath}: ${present ? "present" : "missing"}`);
  return present;
}

let failed = false;
let warnings = 0;

logSection("Deployment Targets");
failed ||= !ensureFile("netlify.toml");
failed ||= !ensureFile("frontend/public/_redirects");
failed ||= !ensureFile("backend/api/vercel.json");
failed ||= !ensureFile(".github/workflows/oracle-sync.yml");

logSection("Example Env Files");
{
  const frontendExample = checkRequiredKeys(
    "frontend/.env.example",
    readEnvFile("frontend/.env.example"),
    ["VITE_SOLANA_RPC_ENDPOINT", "VITE_PROGRAM_ID", "VITE_METADATA_BASE_URL"],
  );
  failed ||= !frontendExample.ok;
  warnings += frontendExample.warnings;

  const apiExample = checkRequiredKeys(
    "backend/api/.env.example",
    readEnvFile("backend/api/.env.example"),
    [
      "SOLANA_RPC_URL",
      "METADATA_BASE_URL",
      "FRONTEND_BASE",
      "ORACLE_PRIVATE_KEY",
      "ORACLE_WEBHOOK_SECRET",
    ],
  );
  failed ||= !apiExample.ok;
  warnings += apiExample.warnings;

  const oracleExample = checkRequiredKeys(
    "backend/oracle/.env.example",
    readEnvFile("backend/oracle/.env.example"),
    [
      "SOLANA_RPC_URL",
      "ORACLE_PRIVATE_KEY",
      "ORACLE_WEBHOOK_SECRET",
      "HELIUS_API_KEY",
      "WEBHOOK_URL",
    ],
  );
  failed ||= !oracleExample.ok;
  warnings += oracleExample.warnings;
}

logSection("Optional Local Files");
warnings += checkRequiredKeys(
  "frontend/.env.production",
  readEnvFile("frontend/.env.production"),
  ["VITE_SOLANA_RPC_ENDPOINT", "VITE_PROGRAM_ID", "VITE_METADATA_BASE_URL"],
  true,
).warnings;
warnings += checkRequiredKeys(
  "backend/api/.env",
  readEnvFile("backend/api/.env"),
  [
    "SOLANA_RPC_URL",
    "METADATA_BASE_URL",
    "FRONTEND_BASE",
    "ORACLE_PRIVATE_KEY",
    "ORACLE_WEBHOOK_SECRET",
  ],
  true,
).warnings;
warnings += checkRequiredKeys(
  "backend/oracle/.env",
  readEnvFile("backend/oracle/.env"),
  ["SOLANA_RPC_URL", "ORACLE_PRIVATE_KEY"],
  true,
).warnings;

logSection("Deploy Secrets To Set Externally");
console.log("- Netlify: VITE_SOLANA_RPC_ENDPOINT, VITE_PROGRAM_ID, VITE_METADATA_BASE_URL");
console.log("- Vercel API: SOLANA_RPC_URL, METADATA_BASE_URL, FRONTEND_BASE, ORACLE_PRIVATE_KEY, ORACLE_WEBHOOK_SECRET");
console.log("- GitHub Actions: SOLANA_RPC_URL, ORACLE_PRIVATE_KEY, ORACLE_WEBHOOK_SECRET");

if (failed) {
  console.error(`\nDeployment preflight failed with ${warnings} warning(s).`);
  process.exit(1);
}

console.log(`\nDeployment preflight passed with ${warnings} warning(s).`);
