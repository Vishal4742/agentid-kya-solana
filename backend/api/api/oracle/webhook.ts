import type { IncomingMessage, ServerResponse } from "http";
import { readRawBody, validateWebhookSignature } from "../../webhook";
import { processWebhookTransactions } from "../../lib/oracle";

type VercelRequest = IncomingMessage & {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  status(code: number): VercelResponse;
  json(body: unknown): void;
};

function readAuthHeader(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const value = headers.authorization ?? headers.Authorization;
  return Array.isArray(value) ? value[0] : value;
}

function authorizeRequest(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
) {
  const signatureSecret = process.env.ORACLE_WEBHOOK_SECRET ?? "";
  const expectedAuth = process.env.HELIUS_WEBHOOK_AUTH ?? "";

  if (
    signatureSecret &&
    validateWebhookSignature(rawBody, headers, signatureSecret)
  ) {
    return { ok: true, mode: "hmac" as const };
  }

  if (expectedAuth && readAuthHeader(headers) === expectedAuth) {
    return { ok: true, mode: "authorization" as const };
  }

  if (!signatureSecret && !expectedAuth) {
    return {
      ok: false,
      status: 500,
      error:
        "Server misconfigured: missing oracle webhook authentication secrets",
    };
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody = await readRawBody(req);
    const auth = authorizeRequest(rawBody, req.headers);
    if (!auth.ok) {
      return res.status(auth.status ?? 401).json({ error: auth.error });
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as unknown;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const updates = await processWebhookTransactions(payload as never[]);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      ok: true,
      auth_mode: auth.mode,
      received: payload.length,
      processed: updates.length,
      updates,
    });
  } catch (error) {
    console.error("[oracle/webhook] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
