import { Request, Response, NextFunction } from "express";
import { Connection, ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";
import { createClient, RedisClientType } from "redis";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const REDIS_URL = process.env.REDIS_URL || "";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const REPLAY_TTL_MS = 24 * 60 * 60 * 1000;
const REPLAY_PRUNE_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CONSUMED_SIGNATURES = 100_000;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Replay protection storage interface
interface ReplayStore {
  has(signature: string): Promise<boolean>;
  add(signature: string): Promise<void>;
  prune?(): Promise<void>;
}

// In-memory fallback store
class InMemoryReplayStore implements ReplayStore {
  private consumedSignatures = new Map<string, number>();
  private pruneTimer: NodeJS.Timeout;

  constructor() {
    this.pruneTimer = setInterval(() => {
      this.pruneSync();
    }, REPLAY_PRUNE_INTERVAL_MS);
    this.pruneTimer.unref();
  }

  async has(signature: string): Promise<boolean> {
    return this.consumedSignatures.has(signature);
  }

  async add(signature: string): Promise<void> {
    this.consumedSignatures.set(signature, Date.now());
  }

  private pruneSync() {
    const now = Date.now();
    for (const [signature, seenAt] of this.consumedSignatures.entries()) {
      if (now - seenAt > REPLAY_TTL_MS || this.consumedSignatures.size > MAX_CONSUMED_SIGNATURES) {
        this.consumedSignatures.delete(signature);
      }
    }
  }

  async prune(): Promise<void> {
    this.pruneSync();
  }
}

// Redis-backed replay store
class RedisReplayStore implements ReplayStore {
  private client: RedisClientType;
  private connected = false;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    this.initialize();
  }

  private async initialize() {
    try {
      await this.client.connect();
      this.connected = true;
      console.log("[x402] Redis replay store connected");
    } catch (error) {
      console.error("[x402] Redis connection failed:", error);
      this.connected = false;
    }

    this.client.on("error", (err) => {
      console.error("[x402] Redis client error:", err);
      this.connected = false;
    });

    this.client.on("ready", () => {
      this.connected = true;
    });
  }

  async has(signature: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }
    const result = await this.client.exists(`x402:sig:${signature}`);
    return result === 1;
  }

  async add(signature: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Redis not connected");
    }
    const ttlSeconds = Math.floor(REPLAY_TTL_MS / 1000);
    await this.client.setEx(`x402:sig:${signature}`, ttlSeconds, Date.now().toString());
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Initialize replay store (Redis with in-memory fallback)
let replayStore: ReplayStore;
let redisStore: RedisReplayStore | null = null;

if (REDIS_URL) {
  redisStore = new RedisReplayStore(REDIS_URL);
  replayStore = redisStore;
  console.log("[x402] Using Redis replay store");
} else {
  replayStore = new InMemoryReplayStore();
  console.log("[x402] Using in-memory replay store (not production-safe)");
}

// Fallback mechanism: if Redis fails, use in-memory
const inMemoryFallback = new InMemoryReplayStore();

async function checkReplay(signature: string): Promise<boolean> {
  try {
    return await replayStore.has(signature);
  } catch (error) {
    console.warn("[x402] Replay check failed, using fallback:", error);
    return await inMemoryFallback.has(signature);
  }
}

async function markConsumed(signature: string): Promise<void> {
  try {
    await replayStore.add(signature);
  } catch (error) {
    console.warn("[x402] Mark consumed failed, using fallback:", error);
    await inMemoryFallback.add(signature);
  }
}

function getAccountPubkey(tx: ParsedTransactionWithMeta, accountIndex: number): string | null {
  const key = tx.transaction.message.accountKeys[accountIndex];
  if (!key) return null;
  if (typeof key === "string") return key;
  if ("pubkey" in key) return key.pubkey.toBase58();
  return null;
}

function getRawTokenAmount(balance: { uiTokenAmount: { amount: string } } | undefined): bigint {
  return BigInt(balance?.uiTokenAmount.amount ?? "0");
}

function calculateTreasuryUsdcInflow(
  tx: ParsedTransactionWithMeta,
  treasuryAddress: string,
): bigint {
  const treasury = new PublicKey(treasuryAddress).toBase58();
  const preBalances = new Map((tx.meta?.preTokenBalances ?? []).map((balance) => [balance.accountIndex, balance]));

  let inflow = 0n;
  for (const postBalance of tx.meta?.postTokenBalances ?? []) {
    if (postBalance.mint !== DEVNET_USDC_MINT) continue;

    const tokenAccountPubkey = getAccountPubkey(tx, postBalance.accountIndex);
    const tokenOwner = postBalance.owner ?? null;
    const targetsTreasury =
      tokenAccountPubkey === treasury ||
      tokenOwner === treasury;

    if (!targetsTreasury) continue;

    const before = getRawTokenAmount(preBalances.get(postBalance.accountIndex));
    const after = getRawTokenAmount(postBalance);
    if (after > before) {
      inflow += after - before;
    }
  }

  return inflow;
}

export const x402Middleware = (
  requiredUsdcAmount: number,
  treasuryAddress: string,
) => {
  const treasury = new PublicKey(treasuryAddress).toBase58();
  const requiredAmountRaw = BigInt(Math.round(requiredUsdcAmount * 1_000_000));

  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentSignature = String(req.headers["x-payment-signature"] ?? "").trim();

    if (!paymentSignature) {
      return res.status(402).json({
        error: "Payment Required",
        message: `Provide an 'X-Payment-Signature' header proving a ${requiredUsdcAmount} USDC payment to treasury ${treasury}.`,
        required_amount: requiredUsdcAmount,
        treasury,
        currency: "USDC",
        mint: DEVNET_USDC_MINT,
      });
    }

    // Check replay protection
    const isReplayed = await checkReplay(paymentSignature);
    if (isReplayed) {
      return res.status(409).json({
        error: "Replay detected",
        message: "This payment signature has already been accepted.",
      });
    }

    try {
      const tx = await connection.getParsedTransaction(paymentSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx) {
        return res.status(400).json({ error: "Transaction not found or not confirmed on-chain." });
      }

      if (tx.meta?.err) {
        return res.status(400).json({ error: "Transaction failed on-chain." });
      }

      const inflowRaw = calculateTreasuryUsdcInflow(tx, treasury);
      if (inflowRaw < requiredAmountRaw) {
        return res.status(402).json({
          error: "Insufficient payment",
          message: `Expected at least ${requiredUsdcAmount} USDC to treasury ${treasury}.`,
          observed_amount: Number(inflowRaw) / 1_000_000,
          required_amount: requiredUsdcAmount,
          treasury,
          currency: "USDC",
          mint: DEVNET_USDC_MINT,
        });
      }

      await markConsumed(paymentSignature);
      res.locals.verifiedPayment = {
        signature: paymentSignature,
        treasury,
        mint: DEVNET_USDC_MINT,
        amountRaw: inflowRaw.toString(),
        amountUsdc: Number(inflowRaw) / 1_000_000,
      };
      next();
    } catch (error) {
      console.error("x402 Verification Error:", error);
      res.status(500).json({ error: "Failed to verify payment signature on Solana." });
    }
  };
};

// Export store status for health checks
export function getReplayStoreStatus(): { type: string; connected: boolean } {
  if (redisStore) {
    return { type: "redis", connected: redisStore.isConnected() };
  }
  return { type: "in-memory", connected: true };
}
