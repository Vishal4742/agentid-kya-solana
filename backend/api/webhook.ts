/**
 * webhook.ts  —  HMAC-SHA256 webhook validation helpers for the AgentID oracle.
 *
 * Usage:
 *   import { validateWebhookSignature, withRetry } from "./webhook";
 *
 *   // In your Vercel handler:
 *   const ok = validateWebhookSignature(req, process.env.ORACLE_WEBHOOK_SECRET!);
 *   if (!ok) return res.status(401).json({ error: "Bad signature" });
 *
 * Signature protocol:
 *   - The caller must include the header `x-agentid-signature: sha256=<hex>`
 *   - The HMAC is computed over the raw request body bytes using the shared secret
 *   - Timing-safe comparison prevents timing attacks
 */

import * as crypto from "crypto";
import type { IncomingMessage } from "http";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff (default: 300) */
  baseDelayMs?: number;
  /** Maximum delay cap in ms (default: 10_000) */
  maxDelayMs?: number;
  /** Jitter factor 0–1 (default: 0.2) */
  jitter?: number;
}

// ── HMAC Signature Validation ─────────────────────────────────────────────────

/**
 * Read all body bytes from an IncomingMessage stream.
 */
export async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Compute the expected HMAC-SHA256 signature for a given body and secret.
 * Returns the hex string (without the `sha256=` prefix).
 */
export function computeHmacHex(body: Buffer, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Validate the `x-agentid-signature` header on an incoming webhook request.
 *
 * @param rawBody   Raw body bytes (read from stream before this call)
 * @param headers   HTTP headers from the request
 * @param secret    ORACLE_WEBHOOK_SECRET env var value
 * @returns true if the signature is valid, false otherwise
 */
export function validateWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  if (!secret) {
    console.error(
      "[oracle] ORACLE_WEBHOOK_SECRET not set — rejecting all webhooks",
    );
    return false;
  }

  const sigHeader = headers["x-agentid-signature"];
  const incoming = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;

  if (!incoming || !incoming.startsWith("sha256=")) return false;

  const incomingHex = incoming.slice("sha256=".length);
  const expectedHex = computeHmacHex(rawBody, secret);

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incomingHex, "hex"),
      Buffer.from(expectedHex, "hex"),
    );
  } catch {
    // Buffer lengths differ — invalid hex or truncated header
    return false;
  }
}

// ── Exponential Backoff Retry ─────────────────────────────────────────────────

/**
 * Execute an async operation with exponential backoff + jitter.
 *
 * @param fn       Async function to retry
 * @param options  Retry configuration
 * @returns Result of `fn` if it eventually succeeds
 * @throws Last error after all attempts are exhausted
 *
 * @example
 * const sig = await withRetry(() => program.methods.updateReputation(score).rpc(), {
 *   maxAttempts: 5,
 *   baseDelayMs: 500,
 * });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 10_000,
    jitter = 0.2,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts) break;

      // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
      const exponential = Math.min(
        baseDelayMs * 2 ** (attempt - 1),
        maxDelayMs,
      );
      // Add random jitter to avoid thundering herd
      const withJitter = exponential * (1 + (Math.random() * 2 - 1) * jitter);
      const delayMs = Math.round(withJitter);

      console.warn(
        `[oracle] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs}ms...`,
        err instanceof Error ? err.message : String(err),
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// ── Middleware helper for Vercel serverless ───────────────────────────────────

/**
 * Wraps a Vercel API handler to enforce webhook signature validation.
 * Call this in any oracle endpoint that receives signed webhook payloads.
 *
 * @example
 * export default requireValidWebhook(async (req, res, rawBody) => {
 *   const payload = JSON.parse(rawBody.toString());
 *   // process payload...
 *   res.status(200).json({ ok: true });
 * });
 */
type RawBodyHandler<Req, Res> = (
  req: Req,
  res: Res,
  rawBody: Buffer,
) => Promise<void>;

export function requireValidWebhook<
  Req extends IncomingMessage,
  Res extends {
    status(code: number): Res;
    json(body: unknown): void;
  },
>(handler: RawBodyHandler<Req, Res>) {
  return async (req: Req, res: Res): Promise<void> => {
    const secret = process.env.ORACLE_WEBHOOK_SECRET ?? "";
    const rawBody = await readRawBody(req);

    if (
      !validateWebhookSignature(
        rawBody,
        req.headers as Record<string, string | undefined>,
        secret,
      )
    ) {
      res.status(401).json({ error: "Invalid or missing webhook signature" });
      return;
    }

    return handler(req, res, rawBody);
  };
}
