const DEFAULT_SOLANA_RPC_ENDPOINT = "https://api.devnet.solana.com";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const SOLANA_RPC_ENDPOINT =
  import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim() || DEFAULT_SOLANA_RPC_ENDPOINT;

export function buildMetadataUrl(agentName: string): string {
  const encodedName = encodeURIComponent(agentName);
  const metadataBaseUrl = import.meta.env.VITE_METADATA_BASE_URL?.trim();

  if (metadataBaseUrl) {
    return `${trimTrailingSlash(metadataBaseUrl)}/metadata/${encodedName}.json`;
  }

  if (typeof window !== "undefined") {
    return new URL(`/metadata/${encodedName}.json`, window.location.origin).toString();
  }

  return `/metadata/${encodedName}.json`;
}
