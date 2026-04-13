const DEFAULT_SOLANA_RPC_URL = "https://api.devnet.solana.com";
const DEFAULT_METADATA_BASE = "https://agentid-metadata-api.vercel.app";

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

export const ACTIVE_RPC_URL =
  normalizeBaseUrl(process.env.SOLANA_RPC_URL) ?? DEFAULT_SOLANA_RPC_URL;
export const METADATA_BASE =
  normalizeBaseUrl(process.env.METADATA_BASE_URL ?? process.env.METADATA_BASE) ??
  DEFAULT_METADATA_BASE;
export const FRONTEND_BASE = normalizeBaseUrl(
  process.env.FRONTEND_BASE ?? process.env.PUBLIC_APP_BASE
);
export const PLACEHOLDER_IMAGE_URL =
  process.env.METADATA_PLACEHOLDER_IMAGE?.trim() ||
  `${METADATA_BASE}/placeholder.svg`;

export function buildMetadataUrlByName(agentName: string): string {
  return `${METADATA_BASE}/metadata/${encodeURIComponent(agentName)}.json`;
}

export function buildMetadataUrlById(agentId: string): string {
  return `${METADATA_BASE}/metadata/${agentId}`;
}

export function buildAgentExternalUrl(
  frontendPath: string,
  fallbackUrl: string
): string {
  if (FRONTEND_BASE) {
    return `${FRONTEND_BASE}${frontendPath}`;
  }

  return fallbackUrl;
}

export function buildAgentImageUrl(frontendPath: string): string {
  if (FRONTEND_BASE) {
    return `${FRONTEND_BASE}${frontendPath}`;
  }

  return PLACEHOLDER_IMAGE_URL;
}
