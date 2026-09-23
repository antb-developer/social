import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { AppError } from "../../middleware/errors";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  membershipMaybeSingle: vi.fn(),
  findSellerById: vi.fn(),
  updateSeller: vi.fn(),
  addSellerMember: vi.fn(),
  findOrCreateAuthUserByPhone: vi.fn(),
  findMembersForSeller: vi.fn(),
  findAuthUserPhoneById: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: mocks.membershipMaybeSingle }) }) }),
    }),
  },
}));

vi.mock("../../repositories/sellerRepository", () => ({
  findSellerById: mocks.findSellerById,
  updateSeller: mocks.updateSeller,
  addSellerMember: mocks.addSellerMember,
  findMembersForSeller: mocks.findMembersForSeller,
}));
vi.mock("../../repositories/authUserRepository", () => ({
  findOrCreateAuthUserByPhone: mocks.findOrCreateAuthUserByPhone,
  findAuthUserPhoneById: mocks.findAuthUserPhoneById,
}));

vi.mock("../../repositories/productRepository", () => ({
  findActiveProductsBySeller: vi.fn(),
  findProductsByIds: vi.fn(),
  findAllProductsBySeller: vi.fn(),
  createProduct: vi.fn(),
  updateProductForSeller: vi.fn(),
  deleteProductForSeller: vi.fn(),
  reorderProducts: vi.fn(),
}));
vi.mock("../../repositories/templateRepository", () => ({
  findAllTemplatesBySeller: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplateForSeller: vi.fn(),
  deleteTemplateForSeller: vi.fn(),
}));
vi.mock("../../repositories/orderRepository", () => ({
  findOrderById: vi.fn(),
  findOrderItems: vi.fn(),
  findOrderMessages: vi.fn(),
  findOrderStatusHistory: vi.fn(),
  findOrdersBySeller: vi.fn(),
  findOrdersByCustomer: vi.fn(),
  createOrderWithItems: vi.fn(),
  insertOrderMessage: vi.fn(),
  insertOrderStatusHistory: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateOrderAddress: vi.fn(),
  setProofUploaded: vi.fn(),
}));
vi.mock("../../repositories/paymentProofRepository", () => ({
  createPaymentProof: vi.fn(),
  findProofById: vi.fn(),
  updateProofReview: vi.fn(),
}));
vi.mock("../../repositories/customerRepository", () => ({ ensureCustomer: vi.fn() }));

const OWNER_USER = { id: "owner-1", phone: "919990001111" };
const STAFF_USER = { id: "staff-1", phone: "919990003333" };
const SELLER_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
});

function asOwner() {
  mocks.getUser.mockResolvedValue({ data: { user: OWNER_USER }, error: null });
  mocks.membershipMaybeSingle.mockResolvedValue({ data: { seller_id: SELLER_ID, role: "owner" }, error: null });
}

function asStaff() {
  mocks.getUser.mockResolvedValue({ data: { user: STAFF_USER }, error: null });
  mocks.membershipMaybeSingle.mockResolvedValue({ data: { seller_id: SELLER_ID, role: "staff" }, error: null });
}

describe("GET /api/seller/settings", () => {
  it("staff can view settings", async () => {
    asStaff();
    mocks.findSellerById.mockResolvedValue({ id: SELLER_ID, name: "Demo Store" });

    const res = await request(createApp())
      .get("/api/seller/settings")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/seller/settings", () => {
  it("staff cannot update settings", async () => {
    asStaff();

    const res = await request(createApp())
      .patch("/api/seller/settings")
      .set("Authorization", "Bearer good")
      .send({ is_accepting_orders: false });

    expect(res.status).toBe(403);
    expect(mocks.updateSeller).not.toHaveBeenCalled();
  });

  it("owner can update settings", async () => {
    asOwner();
    mocks.updateSeller.mockResolvedValue({ id: SELLER_ID, is_accepting_orders: false });

    const res = await request(createApp())
      .patch("/api/seller/settings")
      .set("Authorization", "Bearer good")
      .send({ is_accepting_orders: false });

    expect(res.status).toBe(200);
    expect(mocks.updateSeller).toHaveBeenCalledWith(SELLER_ID, { is_accepting_orders: false });
  });

  it("saves the public store profile (about + address), trimmed", async () => {
    asOwner();
    mocks.updateSeller.mockResolvedValue({ id: SELLER_ID });

    const res = await request(createApp())
      .patch("/api/seller/settings")
      .set("Authorization", "Bearer good")
      .send({ description: "  Handmade candles  ", address: " 12 Market Road, Chandigarh " });

    expect(res.status).toBe(200);
    expect(mocks.updateSeller).toHaveBeenCalledWith(SELLER_ID, {
      description: "Handmade candles",
      address: "12 Market Road, Chandigarh",
    });
  });

  it("rejects an over-long about text", async () => {
    asOwner();

    const res = await request(createApp())
      .patch("/api/seller/settings")
      .set("Authorization", "Bearer good")
      .send({ description: "x".repeat(501) });

    expect(res.status).toBe(400);
    expect(mocks.updateSeller).not.toHaveBeenCalled();
  });

  it("rejects a reserved slug", async () => {
    asOwner();

    const res = await request(createApp())
      .patch("/api/seller/settings")
      .set("Authorization", "Bearer good")
      .send({ slug: "admin" });

    expect(res.status).toBe(400);
    expect(mocks.updateSeller).not.toHaveBeenCalled();
  });

  it("surfaces a taken slug as a 409", async () => {
    asOwner();
    mocks.updateSeller.mockRejectedValue(new AppError(409, "slug_taken", "That store link is already taken"));

    const res = await request(createApp())
      .patch("/api/seller/settings")
      .set("Authorization", "Bearer good")
      .send({ slug: "another-store" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("slug_taken");
  });
});

describe("GET /api/seller/members", () => {
  it("staff can view the team, not just the owner", async () => {
    asStaff();
    mocks.findMembersForSeller.mockResolvedValue([
      { user_id: "owner-1", role: "owner" },
      { user_id: "staff-1", role: "staff" },
    ]);
    mocks.findAuthUserPhoneById.mockImplementation((id: string) =>
      Promise.resolve(id === "owner-1" ? "919990001111" : "919990003333")
    );

    const res = await request(createApp())
      .get("/api/seller/members")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { user_id: "owner-1", role: "owner", phone: "919990001111" },
      { user_id: "staff-1", role: "staff", phone: "919990003333" },
    ]);
  });
});

describe("POST /api/seller/members", () => {
  it("staff cannot add members", async () => {
    asStaff();

    const res = await request(createApp())
      .post("/api/seller/members")
      .set("Authorization", "Bearer good")
      .send({ phone: "+919990009999", role: "staff" });

    expect(res.status).toBe(403);
    expect(mocks.findOrCreateAuthUserByPhone).not.toHaveBeenCalled();
  });

  it("owner can add a member by phone", async () => {
    asOwner();
    mocks.findOrCreateAuthUserByPhone.mockResolvedValue("new-user-1");
    mocks.addSellerMember.mockResolvedValue({ seller_id: SELLER_ID, user_id: "new-user-1", role: "staff" });

    const res = await request(createApp())
      .post("/api/seller/members")
      .set("Authorization", "Bearer good")
      .send({ phone: "+919990009999", role: "staff" });

    expect(res.status).toBe(201);
    expect(mocks.findOrCreateAuthUserByPhone).toHaveBeenCalledWith("+919990009999");
    expect(mocks.addSellerMember).toHaveBeenCalledWith(SELLER_ID, "new-user-1", "staff");
  });
});
