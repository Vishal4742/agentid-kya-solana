const DEFAULT_SOLANA_RPC_ENDPOINT = "https://api.devnet.solana.com";
const DEFAULT_METADATA_BASE_URL = "https://agentid-metadata-api.vercel.app";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const SOLANA_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim() || DEFAULT_SOLANA_RPC_ENDPOINT;

export const METADATA_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_METADATA_BASE_URL?.trim() || DEFAULT_METADATA_BASE_URL,
);

export function buildMetadataUrl(agentName: string): string {
  const encodedName = encodeURIComponent(agentName);
  return `${METADATA_BASE_URL}/metadata/${encodedName}.json`;
}
