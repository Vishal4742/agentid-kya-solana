import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
  signerPayer,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, setTreeDelegate } from '@metaplex-foundation/mpl-bubblegum';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair, PublicKey } from '@solana/web3.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEFAULT_WALLET_PATH = '~/.config/solana/id.json';
const PROGRAM_ID = new PublicKey('Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF');
const DEFAULT_MERKLE_TREE = '2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx';

const expandHome = (filePath: string): string => {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
};

const main = async (): Promise<void> => {
  const walletPath = expandHome(
    process.env.SOLANA_WALLET_PATH ?? DEFAULT_WALLET_PATH,
  );
  const walletBytes = JSON.parse(await fs.readFile(walletPath, 'utf8'));
  const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(walletBytes));
  const umi = createUmi(DEVNET_RPC).use(mplBubblegum());
  const payer = createSignerFromKeypair(
    umi,
    fromWeb3JsKeypair(walletKeypair),
  );
  const merkleTree = publicKey(
    process.env.MERKLE_TREE_ADDRESS ?? DEFAULT_MERKLE_TREE,
  );
  const [treeDelegate] = PublicKey.findProgramAddressSync(
    [Buffer.from('program-config')],
    PROGRAM_ID,
  );

  umi.use(signerIdentity(payer));
  umi.use(signerPayer(payer));

  const builder = setTreeDelegate(umi, {
    merkleTree,
    newTreeDelegate: publicKey(treeDelegate.toBase58()),
  });

  await builder.sendAndConfirm(umi);

  console.log(`Tree delegate set to: ${treeDelegate.toBase58()}`);
  console.log(`Merkle tree: ${merkleTree}`);
};

main().catch((error) => {
  console.error('Failed to set tree delegate:', error);
  process.exit(1);
});
