export function truncateWallet(wallet: string): string {
  if (!wallet) return "";
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function formatRelativeTime(isoString: string): string {
  const timestamp = new Date(isoString).getTime();
  if (!Number.isFinite(timestamp)) return "unknown";

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y ago`;
}
