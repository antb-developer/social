import { afterEach, describe, expect, it, vi } from "vitest";
import { issueSuperadminToken, SUPERADMIN_TOKEN_PREFIX, verifySuperadminToken } from "../superadminTokenService";

describe("superadmin token service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("issues a token that verifies back to the same user id", () => {
    const token = issueSuperadminToken("user-1");
    expect(token.startsWith(SUPERADMIN_TOKEN_PREFIX)).toBe(true);

    const result = verifySuperadminToken(token);
    expect(result).toEqual({ userId: "user-1" });
  });

  it("rejects a token with a tampered payload", () => {
    const token = issueSuperadminToken("user-1");
    const [prefixed, signature] = token.split(".");
    const tampered = `${prefixed.replace(SUPERADMIN_TOKEN_PREFIX, "")}x`;
    const forged = `${SUPERADMIN_TOKEN_PREFIX}${tampered}.${signature}`;

    expect(verifySuperadminToken(forged)).toBeNull();
  });

  it("rejects a token with a wrong signature", () => {
    const token = issueSuperadminToken("user-1");
    const [payloadPart] = token.split(".");
    const forged = `${payloadPart}.0000000000000000000000000000000000000000000000000000000000000000`;

    expect(verifySuperadminToken(forged)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifySuperadminToken("not-a-superadmin-token")).toBeNull();
    expect(verifySuperadminToken(`${SUPERADMIN_TOKEN_PREFIX}nodot`)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = issueSuperadminToken("user-1");

    vi.setSystemTime(new Date("2026-01-02T00:00:00Z")); // 24h later, past the 12h TTL

    expect(verifySuperadminToken(token)).toBeNull();
  });
});
