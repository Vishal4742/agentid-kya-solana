export interface AgentCapabilities {
  defiTrading: boolean;
  paymentSending: boolean;
  contentPublishing: boolean;
  dataAnalysis: boolean;
  maxUsdcTx: number;
}

export interface AgentActivity {
  id: string;
  type: "defi_trade" | "payment" | "content" | "audit" | "registration";
  description: string;
  amount?: string;
  timestamp: string;
  txHash?: string;
  status: "success" | "failed" | "pending";
}

export interface Agent {
  id: string;
  name: string;
  framework: "ELIZA" | "AutoGen" | "CrewAI" | "LangGraph" | "Custom";
  llmModel: "Claude 3.5 Sonnet" | "GPT-4o" | "Llama 3.1" | "Gemini Pro";
  ownerWallet: string;
  verifiedLevel: "Unverified" | "KYB" | "Audited";
  reputationScore: number;
  reputationBreakdown: {
    transactions: number;
    uptime: number;
    ratings: number;
    scoreSuccess?: number;
    scoreRating?: number;
    scoreLongevity?: number;
    scoreVolume?: number;
    scoreVerification?: number;
  };
  capabilities: AgentCapabilities;
  indiaCompliance?: {
    gstin: string;
    serviceCategory: string;
    tdsRate: number;
  };
  registeredAt: string;
  lastActive: string;
  totalTxValue: string;
  activity: AgentActivity[];
  paused: boolean;
  avatarSeed: string;
  credentialNft?: string;
}

export const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-001",
    name: "TradingBot-Alpha",
    framework: "ELIZA",
    llmModel: "Claude 3.5 Sonnet",
    ownerWallet: "9xK2mPqR7vNsW4cLbD3tYfEjH8uAzXQ5gFiO6pMnT1r",
    verifiedLevel: "Audited",
    reputationScore: 847,
    reputationBreakdown: { transactions: 320, uptime: 290, ratings: 237 },
    capabilities: {
      defiTrading: true,
      paymentSending: true,
      contentPublishing: false,
      dataAnalysis: true,
      maxUsdcTx: 5000,
    },
    registeredAt: "2024-11-14T08:23:00Z",
    lastActive: "2025-03-08T11:42:00Z",
    totalTxValue: "$1,247,832",
    paused: false,
    avatarSeed: "TradingBot-Alpha",
    activity: [
      {
        id: "act-001",
        type: "defi_trade",
        description: "Swapped 2,450 USDC → SOL via Jupiter",
        amount: "2,450 USDC",
        timestamp: "2025-03-08T11:42:00Z",
        txHash: "5vKj2mPqR7vNsW4cLbD3tYfEjH8uAzXQ5gFiO6pMnT1r",
        status: "success",
      },
      {
        id: "act-002",
        type: "payment",
        description: "USDC payment to vendor wallet",
        amount: "890 USDC",
        timestamp: "2025-03-08T09:15:00Z",
        txHash: "3rNm9xK2mPqR7vNsW4cLbD3tYfEjH8uAzXQ5gFiO6",
        status: "success",
      },
      {
        id: "act-003",
        type: "defi_trade",
        description: "Liquidity provision to Orca pool",
        amount: "10,000 USDC",
        timestamp: "2025-03-07T18:30:00Z",
        txHash: "7wPl4vKj2mPqR7vNsW4cLbD3tYfEjH8uAzXQ5gFiO",
        status: "success",
      },
      {
        id: "act-004",
        type: "audit",
        description: "Credential re-verified by AgentID Protocol",
        timestamp: "2025-03-06T12:00:00Z",
        status: "success",
      },
      {
        id: "act-005",
        type: "defi_trade",
        description: "Attempted arb trade — slippage exceeded",
        amount: "500 USDC",
        timestamp: "2025-03-05T22:11:00Z",
        txHash: "8xQm5wPl4vKj2mPqR7vNsW4cLbD3tYfEjH8uAzXQ",
        status: "failed",
      },
    ],
  },
  {
    id: "agent-002",
    name: "ContentAgent-India",
    framework: "CrewAI",
    llmModel: "GPT-4o",
    ownerWallet: "4mBnCdEfGhIjKlMnOpQrStUvWxYz1234567890abcde",
    verifiedLevel: "KYB",
    reputationScore: 612,
    reputationBreakdown: { transactions: 180, uptime: 240, ratings: 192 },
    capabilities: {
      defiTrading: false,
      paymentSending: true,
      contentPublishing: true,
      dataAnalysis: true,
      maxUsdcTx: 500,
    },
    indiaCompliance: {
      gstin: "27AAPFU0939F1ZV",
      serviceCategory: "Information Technology Services",
      tdsRate: 10,
    },
    registeredAt: "2024-12-01T10:00:00Z",
    lastActive: "2025-03-08T10:20:00Z",
    totalTxValue: "$42,150",
    paused: false,
    avatarSeed: "ContentAgent-India",
    activity: [
      {
        id: "act-101",
        type: "content",
        description: "Published 3 research articles to IPFS",
        timestamp: "2025-03-08T10:20:00Z",
        status: "success",
      },
      {
        id: "act-102",
        type: "payment",
        description: "Invoice payment 450 USDC — TDS deducted 45 USDC",
        amount: "405 USDC (net)",
        timestamp: "2025-03-07T14:00:00Z",
        txHash: "2pOl3rNm9xK2mPqR7vNsW4cLbD3tYfEjH8uAzXQ5g",
        status: "success",
      },
      {
        id: "act-103",
        type: "content",
        description: "Generated product descriptions for 50 SKUs",
        timestamp: "2025-03-06T09:30:00Z",
        status: "success",
      },
      {
        id: "act-104",
        type: "audit",
        description: "GSTIN verified by CA partner node",
        timestamp: "2025-03-01T00:00:00Z",
        status: "success",
      },
    ],
  },
  {
    id: "agent-003",
    name: "AutoResearcher-7B",
    framework: "AutoGen",
    llmModel: "Llama 3.1",
    ownerWallet: "7zAbCdEfGhIjKlMnOpQrStUvWxYz1234567890fghij",
    verifiedLevel: "Unverified",
    reputationScore: 234,
    reputationBreakdown: { transactions: 60, uptime: 110, ratings: 64 },
    capabilities: {
      defiTrading: false,
      paymentSending: false,
      contentPublishing: true,
      dataAnalysis: true,
      maxUsdcTx: 100,
    },
    registeredAt: "2025-01-20T15:45:00Z",
    lastActive: "2025-03-07T22:00:00Z",
    totalTxValue: "$3,200",
    paused: false,
    avatarSeed: "AutoResearcher-7B",
    activity: [
      {
        id: "act-201",
        type: "content",
        description: "Summarized 12 arxiv papers on DeFi security",
        timestamp: "2025-03-07T22:00:00Z",
        status: "success",
      },
      {
        id: "act-202",
        type: "registration",
        description: "AgentID credential minted on Solana",
        timestamp: "2025-01-20T15:45:00Z",
        txHash: "9yBm6xQm5wPl4vKj2mPqR7vNsW4cLbD3tYfEjH8",
        status: "success",
      },
    ],
  },
  {
    id: "agent-004",
    name: "PayrollAgent-Pro",
    framework: "LangGraph",
    llmModel: "Claude 3.5 Sonnet",
    ownerWallet: "1aFgHiJkLmNoPqRsTuVwXyZ0987654321klmnopqr",
    verifiedLevel: "Audited",
    reputationScore: 963,
    reputationBreakdown: { transactions: 380, uptime: 310, ratings: 273 },
    capabilities: {
      defiTrading: false,
      paymentSending: true,
      contentPublishing: false,
      dataAnalysis: true,
      maxUsdcTx: 50000,
    },
    indiaCompliance: {
      gstin: "09AAACR5055K1Z5",
      serviceCategory: "Financial Services",
      tdsRate: 2,
    },
    registeredAt: "2024-10-05T06:00:00Z",
    lastActive: "2025-03-08T12:00:00Z",
    totalTxValue: "$8,920,440",
    paused: false,
    avatarSeed: "PayrollAgent-Pro",
    activity: [
      {
        id: "act-301",
        type: "payment",
        description: "Batch payroll: 240 USDC transfers to contractors",
        amount: "48,000 USDC",
        timestamp: "2025-03-08T12:00:00Z",
        txHash: "6uEn1aFgHiJkLmNoPqRsTuVwXyZ0987654321kl",
        status: "success",
      },
      {
        id: "act-302",
        type: "audit",
        description: "Annual credential audit completed — score 963/1000",
        timestamp: "2025-03-01T09:00:00Z",
        status: "success",
      },
      {
        id: "act-303",
        type: "payment",
        description: "TDS remittance to ITD portal",
        amount: "960 USDC",
        timestamp: "2025-02-28T18:00:00Z",
        txHash: "4sChZ09876543211aFgHiJkLmNoPqRsTuVwXy",
        status: "success",
      },
    ],
  },
];

export function getAgentById(id: string): Agent | undefined {
  return MOCK_AGENTS.find((a) => a.id === id);
}

export function truncateWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}
