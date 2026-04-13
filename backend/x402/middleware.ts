import { Request, Response, NextFunction } from "express";
import {
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
} from "@solana/web3.js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const REPLAY_TTL_MS = 24 * 60 * 60 * 1000;
const REPLAY_PRUNE_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CONSUMED_SIGNATURES = 100_000;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const consumedSignatures = new Map<string, number>();

function pruneReplayCache(now = Date.now()) {
  for (const [signature, seenAt] of consumedSignatures.entries()) {
    if (
      now - seenAt > REPLAY_TTL_MS ||
      consumedSignatures.size > MAX_CONSUMED_SIGNATURES
    ) {
      consumedSignatures.delete(signature);
    }
  }
}

const replayPruneTimer = setInterval(() => {
  pruneReplayCache();
}, REPLAY_PRUNE_INTERVAL_MS);

replayPruneTimer.unref();

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
  treasuryAddress: string
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
    if (postBalance.mint !== DEVNET_USDC_MINT) continue;

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

export const x402Middleware = (
  requiredUsdcAmount: number,
  treasuryAddress: string
) => {
  const treasury = new PublicKey(treasuryAddress).toBase58();
  const requiredAmountRaw = BigInt(Math.round(requiredUsdcAmount * 1_000_000));

  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentSignature = String(
      req.headers["x-payment-signature"] ?? ""
    ).trim();

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

    pruneReplayCache();
    if (consumedSignatures.has(paymentSignature)) {
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
        return res
          .status(400)
          .json({ error: "Transaction not found or not confirmed on-chain." });
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

      consumedSignatures.set(paymentSignature, Date.now());
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
      res
        .status(500)
        .json({ error: "Failed to verify payment signature on Solana." });
    }
  };
};
