import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../rateLimit";

function buildTestApp() {
  const app = express();
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, message: "slow down" });
  app.get("/limited", limiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe("createRateLimiter", () => {
  it("allows requests up to the configured max, then 429s", async () => {
    const app = buildTestApp();

    const first = await request(app).get("/limited");
    const second = await request(app).get("/limited");
    const third = await request(app).get("/limited");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("rate_limited");
    expect(third.body.error.message).toBe("slow down");
  });

  it("sets standard RateLimit-* headers, not legacy X-RateLimit-*", async () => {
    const app = buildTestApp();

    const res = await request(app).get("/limited");

    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
  });
});
