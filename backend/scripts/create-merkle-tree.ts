import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
  signerPayer,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplBubblegum, createTree } from "@metaplex-foundation/mpl-bubblegum";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair, PublicKey } from "@solana/web3.js";

const ENV_PATH = path.resolve(__dirname, "..", ".env");
const DEVNET_RPC = "https://api.devnet.solana.com";
const DEFAULT_WALLET_PATH = "~/.config/solana/id.json";
const BUBBLEGUM_PROGRAM_ID = new PublicKey(
  "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY",
);

const expandHome = (filePath: string): string => {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
};

const upsertEnvValue = async (key: string, value: string): Promise<void> => {
  let envContent = "";

  try {
    envContent = await fs.readFile(ENV_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const entry = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  const nextContent = pattern.test(envContent)
    ? envContent.replace(pattern, entry)
    : `${envContent.trimEnd()}${envContent ? "\n" : ""}${entry}\n`;

  await fs.writeFile(ENV_PATH, nextContent, "utf8");
};

const main = async (): Promise<void> => {
  const umi = createUmi(DEVNET_RPC).use(mplBubblegum());

  const walletPath = expandHome(
    process.env.SOLANA_WALLET_PATH ?? DEFAULT_WALLET_PATH,
  );
  const walletBytes = JSON.parse(await fs.readFile(walletPath, "utf8"));
  const payer = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(Keypair.fromSecretKey(Uint8Array.from(walletBytes))),
  );

  umi.use(signerIdentity(payer));
  umi.use(signerPayer(payer));

  const merkleTree = generateSigner(umi);

  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 10,
  });

  await builder.sendAndConfirm(umi);

  const treeAddress = merkleTree.publicKey.toString();
  const [treeAuthority] = PublicKey.findProgramAddressSync(
    [new PublicKey(treeAddress).toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );

  await upsertEnvValue("MERKLE_TREE_ADDRESS", treeAddress);
  await upsertEnvValue("MERKLE_TREE_AUTHORITY", treeAuthority.toBase58());

  console.log(`Merkle tree created: ${treeAddress}`);
  console.log(`Tree authority: ${treeAuthority.toBase58()}`);
};

main().catch((error) => {
  console.error("Failed to create Merkle tree:", error);
  process.exit(1);
});
