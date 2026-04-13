import { Connection, ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL?.trim() || "https://api.devnet.solana.com";
const DEFAULT_PAYMENT_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const REPLAY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONSUMED_SIGNATURES = 100_000;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

type HeaderValue = string | string[] | undefined;
type HeaderMap = Record<string, HeaderValue>;

type VerifiedPayment = {
  signature: string;
  treasury: string;
  treasuryTokenAccount?: string;
  mint: string;
  amountRaw: string;
  amountUsdc: number;
};

type VerificationFailure = {
  ok: false;
  status: number;
  body: Record<string, unknown>;
};

type VerificationSuccess = {
  ok: true;
  payment: VerifiedPayment;
};

export type X402VerificationResult = VerificationFailure | VerificationSuccess;

type ReplayCache = Map<string, number>;

declare global {
  // eslint-disable-next-line no-var
  var __agentidX402ReplayCache__: ReplayCache | undefined;
}

function getReplayCache(): ReplayCache {
  if (!globalThis.__agentidX402ReplayCache__) {
    globalThis.__agentidX402ReplayCache__ = new Map<string, number>();
  }
  return globalThis.__agentidX402ReplayCache__;
}

function pruneReplayCache(now = Date.now()) {
  const cache = getReplayCache();
  for (const [signature, seenAt] of cache.entries()) {
    if (now - seenAt > REPLAY_TTL_MS || cache.size > MAX_CONSUMED_SIGNATURES) {
      cache.delete(signature);
    }
  }
}

function getAccountPubkey(
  tx: ParsedTransactionWithMeta,
  accountIndex: number
): string | null {
  const key = tx.transaction.message.accountKeys[accountIndex];
  if (!key) return null;
  if (typeof key === "string") return key;
  if ("pubkey" in key) return key.pubkey.toBase58();
  return null;
}

function getRawTokenAmount(
  balance: { uiTokenAmount: { amount: string } } | undefined
): bigint {
  return BigInt(balance?.uiTokenAmount.amount ?? "0");
}

function calculateTreasuryUsdcInflow(
  tx: ParsedTransactionWithMeta,
  treasuryAddress: string,
  paymentMint: string
): bigint {
  const treasury = new PublicKey(treasuryAddress).toBase58();
  const preBalances = new Map(
    (tx.meta?.preTokenBalances ?? []).map((balance) => [
      balance.accountIndex,
      balance,
    ])
  );

  let inflow = 0n;
  for (const postBalance of tx.meta?.postTokenBalances ?? []) {
    if (postBalance.mint !== paymentMint) continue;

    const tokenAccountPubkey = getAccountPubkey(tx, postBalance.accountIndex);
    const tokenOwner = postBalance.owner ?? null;
    const targetsTreasury =
      tokenAccountPubkey === treasury || tokenOwner === treasury;

    if (!targetsTreasury) continue;

    const before = getRawTokenAmount(preBalances.get(postBalance.accountIndex));
    const after = getRawTokenAmount(postBalance);
    if (after > before) {
      inflow += after - before;
    }
  }

  return inflow;
}

export async function verifyX402Payment(
  headers: HeaderMap,
  requiredUsdcAmount: number,
  treasuryAddress: string,
  treasuryTokenAccount?: string,
  paymentMint = DEFAULT_PAYMENT_MINT
): Promise<X402VerificationResult> {
  const treasury = new PublicKey(treasuryAddress).toBase58();
  const paymentSignature = String(headers["x-payment-signature"] ?? "").trim();
  const requiredAmountRaw = BigInt(Math.round(requiredUsdcAmount * 1_000_000));

  if (!paymentSignature) {
    return {
      ok: false,
      status: 402,
      body: {
        error: "Payment Required",
        message: `Provide an 'X-Payment-Signature' header proving a ${requiredUsdcAmount} USDC payment to treasury ${treasury}.`,
        required_amount: requiredUsdcAmount,
        treasury,
        treasury_token_account: treasuryTokenAccount,
        currency: "USDC",
        mint: paymentMint,
      },
    };
  }

  pruneReplayCache();
  const replayCache = getReplayCache();
  if (replayCache.has(paymentSignature)) {
    return {
      ok: false,
      status: 409,
      body: {
        error: "Replay detected",
        message: "This payment signature has already been accepted.",
      },
    };
  }

  try {
    const tx = await connection.getParsedTransaction(paymentSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx) {
      return {
        ok: false,
        status: 400,
        body: {
          error: "Transaction not found or not confirmed on-chain.",
        },
      };
    }

    if (tx.meta?.err) {
      return {
        ok: false,
        status: 400,
        body: {
          error: "Transaction failed on-chain.",
        },
      };
    }

    const inflowRaw = calculateTreasuryUsdcInflow(tx, treasury, paymentMint);
    if (inflowRaw < requiredAmountRaw) {
      return {
        ok: false,
        status: 402,
        body: {
          error: "Insufficient payment",
          message: `Expected at least ${requiredUsdcAmount} USDC to treasury ${treasury}.`,
          observed_amount: Number(inflowRaw) / 1_000_000,
          required_amount: requiredUsdcAmount,
          treasury,
          treasury_token_account: treasuryTokenAccount,
          currency: "USDC",
          mint: paymentMint,
        },
      };
    }

    replayCache.set(paymentSignature, Date.now());
    return {
      ok: true,
      payment: {
        signature: paymentSignature,
        treasury,
        treasuryTokenAccount,
        mint: paymentMint,
        amountRaw: inflowRaw.toString(),
        amountUsdc: Number(inflowRaw) / 1_000_000,
      },
    };
  } catch (error) {
    console.error("[x402-api] Verification error:", error);
    return {
      ok: false,
      status: 500,
      body: {
        error: "Failed to verify payment signature on Solana.",
      },
    };
  }
}
