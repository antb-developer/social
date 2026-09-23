import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findMembershipForUser: vi.fn(),
  createSeller: vi.fn(),
  addSellerMember: vi.fn(),
  createTemplate: vi.fn(),
  ensureCustomer: vi.fn(),
  updateCustomerName: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: { auth: { getUser: mocks.getUser } },
}));
vi.mock("../../repositories/sellerRepository", () => ({
  findMembershipForUser: mocks.findMembershipForUser,
  createSeller: mocks.createSeller,
  addSellerMember: mocks.addSellerMember,
}));
vi.mock("../../repositories/customerRepository", () => ({
  ensureCustomer: mocks.ensureCustomer,
  updateCustomerName: mocks.updateCustomerName,
}));
vi.mock("../../repositories/templateRepository", () => ({ createTemplate: mocks.createTemplate }));

const USER = { id: "user-1", phone: "919990001111" };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
});

describe("POST /api/seller/signup", () => {
  it("requires auth", async () => {
    const res = await request(createApp()).post("/api/seller/signup").send({ store_name: "Demo" });
    expect(res.status).toBe(401);
  });

  it("rejects a user who already has a store", async () => {
    mocks.findMembershipForUser.mockResolvedValue({ seller_id: "seller-1", role: "owner" });

    const res = await request(createApp())
      .post("/api/seller/signup")
      .set("Authorization", "Bearer good")
      .send({ store_name: "Demo Store" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("already_a_seller");
    expect(mocks.createSeller).not.toHaveBeenCalled();
  });

  it("auto-generates and validates a slug from the store name when none is given", async () => {
    mocks.findMembershipForUser.mockResolvedValue(null);
    mocks.createSeller.mockResolvedValue({ id: "seller-1", name: "Amit's Kirana Store", slug: "amit-s-kirana-store" });

    const res = await request(createApp())
      .post("/api/seller/signup")
      .set("Authorization", "Bearer good")
      .send({ store_name: "Amit's Kirana Store" });

    expect(res.status).toBe(201);
    expect(mocks.createSeller).toHaveBeenCalledWith({
      name: "Amit's Kirana Store",
      slug: "amit-s-kirana-store",
      phone: "919990001111",
    });
    expect(mocks.addSellerMember).toHaveBeenCalledWith("seller-1", "user-1", "owner");
    // Seeds the two default templates per spec.
    expect(mocks.createTemplate).toHaveBeenCalledTimes(2);
    expect(mocks.createTemplate).toHaveBeenCalledWith(
      "seller-1",
      expect.objectContaining({ kind: "payment_request" })
    );
    expect(mocks.createTemplate).toHaveBeenCalledWith(
      "seller-1",
      expect.objectContaining({ kind: "form_request" })
    );
  });

  it("saves the owner's name on their customer profile when given", async () => {
    mocks.findMembershipForUser.mockResolvedValue(null);
    mocks.createSeller.mockResolvedValue({ id: "seller-1", name: "Demo Store", slug: "demo-store" });

    const res = await request(createApp())
      .post("/api/seller/signup")
      .set("Authorization", "Bearer good")
      .send({ store_name: "Demo Store", owner_name: "Amit Kumar" });

    expect(res.status).toBe(201);
    expect(mocks.ensureCustomer).toHaveBeenCalledWith("user-1", "919990001111");
    expect(mocks.updateCustomerName).toHaveBeenCalledWith("user-1", "Amit Kumar");
  });

  it("rejects a reserved or malformed explicit slug", async () => {
    mocks.findMembershipForUser.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/seller/signup")
      .set("Authorization", "Bearer good")
      .send({ store_name: "Demo Store", slug: "admin" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_slug");
    expect(mocks.createSeller).not.toHaveBeenCalled();
  });
});
