import crypto from "crypto";

const SIGNATURE_HEADER = "x-agentid-signature";

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function computeHmacHex(body: Buffer, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function validateWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  if (!secret) {
    return false;
  }

  const incoming = readHeader(headers, SIGNATURE_HEADER);
  if (!incoming || !incoming.startsWith("sha256=")) {
    return false;
  }

  const incomingHex = incoming.slice("sha256=".length);
  const expectedHex = computeHmacHex(rawBody, secret);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(incomingHex, "hex"),
      Buffer.from(expectedHex, "hex"),
    );
  } catch {
    return false;
  }
}

export function validateWebhookAuthHeader(
  headers: Record<string, string | string[] | undefined>,
  expectedAuth: string,
): boolean {
  if (!expectedAuth) {
    return false;
  }

  return readHeader(headers, "authorization") === expectedAuth;
}

export function parseWebhookPayload(rawBody: Buffer): unknown {
  return JSON.parse(rawBody.toString("utf8"));
}
