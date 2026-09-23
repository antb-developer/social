import crypto from "node:crypto";
import { env } from "../config/env";

// A self-contained, HMAC-signed bearer token for the superadmin
// username+password login (see superadminAuthController). Deliberately
// independent of DEV_OTP_MODE's dev-token bypass in middleware/auth.ts —
// that one is a temporary stand-in for phone OTP and only exists while
// DEV_OTP_MODE is on; this is a real login path meant to work in every
// environment. requireSuperadmin still re-checks the `superadmins` table on
// every request, so a forged/replayed token only gets as far as this
// signature check — it doesn't grant access by itself.
export const SUPERADMIN_TOKEN_PREFIX = "superadmin:";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.superadminTokenSecret).update(payload).digest("hex");
}

export function issueSuperadminToken(userId: string): string {
  const payload = `${userId}.${Date.now() + TOKEN_TTL_MS}`;
  const signature = sign(payload);
  return `${SUPERADMIN_TOKEN_PREFIX}${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

export function verifySuperadminToken(token: string): { userId: string } | null {
  if (!token.startsWith(SUPERADMIN_TOKEN_PREFIX)) return null;

  const [encodedPayload, signature] = token.slice(SUPERADMIN_TOKEN_PREFIX.length).split(".");
  if (!encodedPayload || !signature) return null;

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSignature = sign(payload);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return null;
  }

  const [userId, expiresAtRaw] = payload.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!userId || !Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  return { userId };
}
