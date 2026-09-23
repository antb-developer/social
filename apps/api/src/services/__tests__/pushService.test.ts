import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
  findSubscriptionsForUsers: vi.fn(),
  deleteSubscriptionByEndpoint: vi.fn(),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}));

vi.mock("../../repositories/pushSubscriptionRepository", () => ({
  findSubscriptionsForUsers: mocks.findSubscriptionsForUsers,
  deleteSubscriptionByEndpoint: mocks.deleteSubscriptionByEndpoint,
}));

const envMock = { vapidPublicKey: "", vapidPrivateKey: "", vapidSubject: "mailto:test@example.com" };
vi.mock("../../config/env", () => ({ env: envMock }));

// Push VAPID configuration is cached in module-level state (`configured`),
// so each test gets a fresh module instance via resetModules + dynamic
// import instead of sharing state across cases.
async function freshPushService() {
  vi.resetModules();
  return import("../pushService");
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  envMock.vapidPublicKey = "";
  envMock.vapidPrivateKey = "";
});

describe("sendPushToUsers", () => {
  it("does nothing when VAPID keys are not configured", async () => {
    const { sendPushToUsers } = await freshPushService();
    await sendPushToUsers(["user-1"], { title: "t", body: "b" });

    expect(mocks.findSubscriptionsForUsers).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing for an empty user list even when configured", async () => {
    envMock.vapidPublicKey = "pub";
    envMock.vapidPrivateKey = "priv";
    const { sendPushToUsers } = await freshPushService();
    await sendPushToUsers([], { title: "t", body: "b" });

    expect(mocks.findSubscriptionsForUsers).not.toHaveBeenCalled();
  });

  it("dedupes user ids before looking up subscriptions", async () => {
    envMock.vapidPublicKey = "pub";
    envMock.vapidPrivateKey = "priv";
    mocks.findSubscriptionsForUsers.mockResolvedValue([]);
    const { sendPushToUsers } = await freshPushService();
    await sendPushToUsers(["user-1", "user-1", "user-2"], { title: "t", body: "b" });

    expect(mocks.findSubscriptionsForUsers).toHaveBeenCalledWith(["user-1", "user-2"]);
  });

  it("configures VAPID once and sends a notification to each subscription", async () => {
    envMock.vapidPublicKey = "pub";
    envMock.vapidPrivateKey = "priv";
    mocks.findSubscriptionsForUsers.mockResolvedValue([
      { endpoint: "https://push.example.com/a", keys: { p256dh: "k1", auth: "a1" } },
    ]);
    mocks.sendNotification.mockResolvedValue(undefined);

    const { sendPushToUsers } = await freshPushService();
    await sendPushToUsers(["user-1"], { title: "New order", body: "Order ORD-1000" });

    expect(mocks.setVapidDetails).toHaveBeenCalledWith("mailto:test@example.com", "pub", "priv");
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.example.com/a", keys: { p256dh: "k1", auth: "a1" } },
      JSON.stringify({ title: "New order", body: "Order ORD-1000" })
    );
  });

  it("deletes the subscription when the push service returns 410 Gone", async () => {
    envMock.vapidPublicKey = "pub";
    envMock.vapidPrivateKey = "priv";
    mocks.findSubscriptionsForUsers.mockResolvedValue([
      { endpoint: "https://push.example.com/dead", keys: { p256dh: "k1", auth: "a1" } },
    ]);
    mocks.sendNotification.mockRejectedValue(Object.assign(new Error("gone"), { statusCode: 410 }));

    const { sendPushToUsers } = await freshPushService();
    await sendPushToUsers(["user-1"], { title: "t", body: "b" });

    expect(mocks.deleteSubscriptionByEndpoint).toHaveBeenCalledWith("https://push.example.com/dead");
  });

  it("swallows other send failures without deleting the subscription or throwing", async () => {
    envMock.vapidPublicKey = "pub";
    envMock.vapidPrivateKey = "priv";
    mocks.findSubscriptionsForUsers.mockResolvedValue([
      { endpoint: "https://push.example.com/flaky", keys: { p256dh: "k1", auth: "a1" } },
    ]);
    mocks.sendNotification.mockRejectedValue(Object.assign(new Error("server error"), { statusCode: 500 }));

    const { sendPushToUsers } = await freshPushService();
    await expect(sendPushToUsers(["user-1"], { title: "t", body: "b" })).resolves.toBeUndefined();
    expect(mocks.deleteSubscriptionByEndpoint).not.toHaveBeenCalled();
  });
});
