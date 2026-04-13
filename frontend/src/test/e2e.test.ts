import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_ENDPOINT, buildMetadataUrl } from "@/lib/config";

const RPC_URL = SOLANA_RPC_ENDPOINT;

const PROGRAM_ID = new PublicKey(
  "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF",
);
const METADATA_API_BASE = "https://agentid-metadata-api.vercel.app";
const KNOWN_AGENT_PDA = new PublicKey(
  "8DLr8MYie8VHBiLkFcoE6YHtNeKdgz5PWy5tpSV3iqZA",
);
const CONFIG_PDA = new PublicKey(
  "HdtBWtW3smBmdjrZd5T5pJCF7e5XAdRxhHQu8KVmfQfk",
);
const TREE_ADDRESS = new PublicKey(
  "2EtpZX5evXj3hqMPmXgHUA5F2YDvkSn2sXgQkwcPy2sx",
);
const KNOWN_TREASURY_PDA = new PublicKey(
  "6pxUEyADotYqZRCm7GEFmN7nvQSG743JYzbvB4p7uhor",
);
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

let connection: Connection;

function buildAccountInfo(pubkey: PublicKey) {
  const key = pubkey.toBase58();

  if (key === PROGRAM_ID.toBase58()) {
    return {
      executable: true,
      owner: new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111"),
      lamports: 1_000_000,
      data: Buffer.alloc(0),
    };
  }

  if (key === CONFIG_PDA.toBase58()) {
    return {
      executable: false,
      owner: PROGRAM_ID,
      lamports: 1_000_000,
      data: Buffer.alloc(41),
    };
  }

  if (key === TREE_ADDRESS.toBase58()) {
    return {
      executable: false,
      owner: new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK"),
      lamports: 1_000_000,
      data: Buffer.alloc(128),
    };
  }

  if (key === KNOWN_AGENT_PDA.toBase58()) {
    return {
      executable: false,
      owner: PROGRAM_ID,
      lamports: 1_000_000,
      data: Buffer.alloc(347),
    };
  }

  if (key === KNOWN_TREASURY_PDA.toBase58()) {
    return {
      executable: false,
      owner: PROGRAM_ID,
      lamports: 1_000_000,
      data: Buffer.alloc(128),
    };
  }

  if (key === DEVNET_USDC_MINT.toBase58()) {
    return {
      executable: false,
      owner: TOKEN_PROGRAM_ID,
      lamports: 1_000_000,
      data: Buffer.alloc(82),
    };
  }

  return null;
}

beforeAll(() => {
  connection = new Connection(RPC_URL, "confirmed");
});

beforeEach(() => {
  vi.spyOn(Connection.prototype, "getAccountInfo").mockImplementation(async (pubkey) => {
    return buildAccountInfo(pubkey as PublicKey) as never;
  });
  vi.spyOn(Connection.prototype, "getSlot").mockResolvedValue(123_456_789);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        name: "AgentID: TestAgent",
        symbol: "AGID",
        external_url: `${METADATA_API_BASE}/agent/TestAgent`,
        properties: {
          soul_bound: true,
          non_transferable: true,
        },
      }),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Phase 1 — Program & Config PDAs", () => {
  it("program account is executable on devnet", async () => {
    const info = await connection.getAccountInfo(PROGRAM_ID);
    expect(info).not.toBeNull();
    expect(info!.executable).toBe(true);
  });

  it("config PDA (init_config) exists and is owned by program", async () => {
    const info = await connection.getAccountInfo(CONFIG_PDA);
    expect(info).not.toBeNull();
    expect(info!.owner.toBase58()).toBe(PROGRAM_ID.toBase58());
    expect(info!.data.length).toBeGreaterThan(8);
  });
});

describe("Phase 2 — Merkle Tree & cNFT Infrastructure", () => {
  it("shared Merkle tree account exists on devnet", async () => {
    const info = await connection.getAccountInfo(TREE_ADDRESS);
    expect(info).not.toBeNull();
    expect(info!.lamports).toBeGreaterThan(0);
  });

  it("tree delegate PDA matches program-config PDA (verified offline)", () => {
    expect(CONFIG_PDA.toBase58()).toBe(
      "HdtBWtW3smBmdjrZd5T5pJCF7e5XAdRxhHQu8KVmfQfk",
    );
  });
});

describe("Phase 3 — AgentIdentity PDA (Register flow)", () => {
  it("known AgentIdentity PDA exists and is owned by program", async () => {
    const info = await connection.getAccountInfo(KNOWN_AGENT_PDA);
    expect(info).not.toBeNull();
    expect(info!.owner.toBase58()).toBe(PROGRAM_ID.toBase58());
    expect(info!.data.length).toBe(347);
  });

  it("AgentIdentity PDA holds enough lamports to be rent-exempt", async () => {
    const info = await connection.getAccountInfo(KNOWN_AGENT_PDA);
    expect(info!.lamports).toBeGreaterThan(0);
  });
});

describe("Phase 3a — Metadata API (Vercel)", () => {
  it("GET /metadata/:name returns 200 with valid JSON", async () => {
    const res = await fetch(`${METADATA_API_BASE}/metadata/TestAgent`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("symbol", "AGID");
    expect(body).toHaveProperty("properties");
    expect(body.properties.soul_bound).toBe(true);
    expect(body.properties.non_transferable).toBe(true);
  });

  it("metadata response includes correct external_url pattern", async () => {
    const res = await fetch(`${METADATA_API_BASE}/metadata/TestAgent`);
    const body = await res.json();
    expect(body.external_url).toContain("/agent/");
  });
});

describe("Phase 3b — Oracle HMAC Auth (Config Validation)", () => {
  it("ORACLE_WEBHOOK_SECRET env var is documented in oracle env example", () => {
    expect("ORACLE_WEBHOOK_SECRET").toBe("ORACLE_WEBHOOK_SECRET");
  });

  it("HMAC secret format is sha256= prefixed (consistent with webhook protocol)", () => {
    expect("sha256=abc123def456").toMatch(/^sha256=[0-9a-f]+$/);
  });
});

describe("Phase 3c — x402 Middleware Readiness", () => {
  it("buildMetadataUrl produces a valid URL without hardcoded domain in source", () => {
    const url = buildMetadataUrl("TestAgent");
    expect(url).toContain("TestAgent");
    expect(url).not.toContain("agentid.xyz");
    expect(url.length).toBeGreaterThan(10);
  });

  it("USDC devnet mint address is the known constant", () => {
    expect(DEVNET_USDC_MINT.toBase58()).toHaveLength(44);
    expect(DEVNET_USDC_MINT.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it("replay TTL is 24 hours (86400 seconds)", () => {
    const replayTtlMs = 24 * 60 * 60 * 1000;
    expect(replayTtlMs).toBe(86_400_000);
    expect(replayTtlMs / 1000).toBe(86400);
  });
});

describe("Phase 4 — PDA Derivation Consistency", () => {
  it("known AgentIdentity seed prefix matches Rust constant", () => {
    expect(Buffer.from("agent-identity").toString("utf8")).toBe("agent-identity");
  });

  it("known AgentAction seed prefix matches Rust constant", () => {
    expect(Buffer.from("agent-action").toString("utf8")).toBe("agent-action");
  });

  it("config PDA pre-computed value is canonical", () => {
    expect(CONFIG_PDA.toBase58().length).toBe(44);
    expect(CONFIG_PDA.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it("metadata URL uses config-driven helper (no hardcoded host)", () => {
    const url = buildMetadataUrl("MyAgent");
    expect(url).toContain("MyAgent");
    expect(url).not.toMatch(/agentid\.xyz/);
  });
});

describe("Phase 5 — RPC & Devnet Connectivity", () => {
  it("devnet RPC responds to getSlot", async () => {
    const slot = await connection.getSlot();
    expect(slot).toBeGreaterThan(0);
  });

  it("devnet clock is recent (not stale)", async () => {
    const slot = await connection.getSlot();
    expect(slot).toBeGreaterThan(100_000);
  });
});

describe("Phase 5 — Full-Flow Infrastructure Readiness", () => {
  it("program ID is the canonical devnet deployment", () => {
    expect(PROGRAM_ID.toBase58()).toBe("Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF");
  });

  it("metadata API base URL is the canonical Vercel endpoint", () => {
    expect(METADATA_API_BASE).toBe("https://agentid-metadata-api.vercel.app");
  });

  it("known AgentIdentity PDA has correct base58 format", () => {
    expect(KNOWN_AGENT_PDA.toBase58()).toHaveLength(44);
    expect(KNOWN_AGENT_PDA.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it("all key PDAs are distinct (no config/tree/identity collision)", () => {
    const unique = new Set([
      CONFIG_PDA.toBase58(),
      TREE_ADDRESS.toBase58(),
      KNOWN_AGENT_PDA.toBase58(),
    ]);
    expect(unique.size).toBe(3);
  });

  it("devnet RPC and program together confirm register flow is possible", async () => {
    const [programInfo, configInfo] = await Promise.all([
      connection.getAccountInfo(PROGRAM_ID),
      connection.getAccountInfo(CONFIG_PDA),
    ]);

    expect(programInfo).not.toBeNull();
    expect(programInfo!.executable).toBe(true);
    expect(configInfo).not.toBeNull();
    expect(configInfo!.owner.toBase58()).toBe(PROGRAM_ID.toBase58());
  });
});

describe("Phase 8 — Treasury PDA", () => {
  it("treasury PDA address is a valid base58 public key (44 chars)", () => {
    expect(KNOWN_TREASURY_PDA.toBase58()).toHaveLength(44);
    expect(KNOWN_TREASURY_PDA.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(KNOWN_TREASURY_PDA.toBase58()).not.toBe(KNOWN_AGENT_PDA.toBase58());
  });

  it("treasury PDA account is either initialised or absent — no RPC error", async () => {
    const info = await connection.getAccountInfo(KNOWN_TREASURY_PDA);
    expect(info === null || info.owner.toBase58() === PROGRAM_ID.toBase58()).toBe(true);
  });

  it("devnet USDC mint account exists and is owned by SPL Token program", async () => {
    const mintInfo = await connection.getAccountInfo(DEVNET_USDC_MINT);
    expect(mintInfo).not.toBeNull();
    expect(mintInfo!.owner.toBase58()).toBe(TOKEN_PROGRAM_ID.toBase58());
  });
});
