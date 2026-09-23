import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  ensureCustomer: vi.fn(),
  findCustomerById: vi.fn(),
  updateCustomerName: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: { auth: { getUser: mocks.getUser } },
}));
vi.mock("../../repositories/customerRepository", () => ({
  ensureCustomer: mocks.ensureCustomer,
  findCustomerById: mocks.findCustomerById,
  updateCustomerName: mocks.updateCustomerName,
}));

const USER = { id: "user-1", phone: "919990001111" };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
});

describe("GET /api/me", () => {
  it("requires auth", async () => {
    const res = await request(createApp()).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("returns the caller's profile, creating the customer row if needed", async () => {
    mocks.findCustomerById.mockResolvedValue({ id: "user-1", name: "Amit", phone: "919990001111" });

    const res = await request(createApp()).get("/api/me").set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "user-1", name: "Amit", phone: "919990001111" });
    expect(mocks.ensureCustomer).toHaveBeenCalledWith("user-1", "919990001111");
  });
});

describe("PATCH /api/me", () => {
  it("updates the name, trimmed", async () => {
    mocks.findCustomerById.mockResolvedValue({ id: "user-1", name: "Amit Kumar", phone: "919990001111" });

    const res = await request(createApp())
      .patch("/api/me")
      .set("Authorization", "Bearer good")
      .send({ name: "  Amit Kumar  " });

    expect(res.status).toBe(200);
    expect(mocks.updateCustomerName).toHaveBeenCalledWith("user-1", "Amit Kumar");
    expect(res.body.name).toBe("Amit Kumar");
  });

  it("rejects a blank name", async () => {
    const res = await request(createApp()).patch("/api/me").set("Authorization", "Bearer good").send({ name: "   " });

    expect(res.status).toBe(400);
    expect(mocks.updateCustomerName).not.toHaveBeenCalled();
  });
});
