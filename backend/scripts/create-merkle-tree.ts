import { promises as fs } from 'fs';
import path from 'path';
import {
  generateSigner,
  signerIdentity,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, createTree } from '@metaplex-foundation/mpl-bubblegum';

const ENV_PATH = path.resolve(__dirname, '..', '.env');
const DEVNET_RPC = 'https://api.devnet.solana.com';

const upsertEnvValue = async (key: string, value: string): Promise<void> => {
  let envContent = '';

  try {
    envContent = await fs.readFile(ENV_PATH, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const entry = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  const nextContent = pattern.test(envContent)
    ? envContent.replace(pattern, entry)
    : `${envContent.trimEnd()}${envContent ? '\n' : ''}${entry}\n`;

  await fs.writeFile(ENV_PATH, nextContent, 'utf8');
};

const main = async (): Promise<void> => {
  const umi = createUmi(DEVNET_RPC).use(mplBubblegum());

  const payer = generateSigner(umi);
  umi.use(signerIdentity(payer));

  const merkleTree = generateSigner(umi);

  await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 10,
  }).sendAndConfirm(umi);

  const treeAddress = merkleTree.publicKey.toString();

  await upsertEnvValue('MERKLE_TREE_ADDRESS', treeAddress);

  console.log(`Merkle tree created: ${treeAddress}`);
};

main().catch((error) => {
  console.error('Failed to create Merkle tree:', error);
  process.exit(1);
});
