import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const { getUser, upsertPushSubscription } = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsertPushSubscription: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: { auth: { getUser } },
}));
vi.mock("../../repositories/pushSubscriptionRepository", () => ({ upsertPushSubscription }));

const USER = { id: "user-1", phone: "919990001111" };

beforeEach(() => {
  getUser.mockReset();
  upsertPushSubscription.mockReset();
  getUser.mockResolvedValue({ data: { user: USER }, error: null });
});

describe("POST /api/push/subscribe", () => {
  it("requires auth", async () => {
    const res = await request(createApp()).post("/api/push/subscribe").send({});
    expect(res.status).toBe(401);
  });

  it("rejects a malformed subscription payload", async () => {
    const res = await request(createApp())
      .post("/api/push/subscribe")
      .set("Authorization", "Bearer good")
      .send({ endpoint: "not-a-url", keys: {} });

    expect(res.status).toBe(400);
    expect(upsertPushSubscription).not.toHaveBeenCalled();
  });

  it("upserts the subscription for the caller", async () => {
    upsertPushSubscription.mockResolvedValue({ id: "sub-1" });

    const res = await request(createApp())
      .post("/api/push/subscribe")
      .set("Authorization", "Bearer good")
      .send({
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "key1", auth: "key2" },
      });

    expect(res.status).toBe(201);
    expect(upsertPushSubscription).toHaveBeenCalledWith({
      userId: "user-1",
      endpoint: "https://push.example.com/abc",
      keys: { p256dh: "key1", auth: "key2" },
    });
  });
});
