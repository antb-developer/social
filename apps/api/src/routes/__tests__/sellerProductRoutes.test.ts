import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  membershipMaybeSingle: vi.fn(),
  findAllProductsBySeller: vi.fn(),
  createProduct: vi.fn(),
  updateProductForSeller: vi.fn(),
  deleteProductForSeller: vi.fn(),
  reorderProducts: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: mocks.membershipMaybeSingle }) }) }),
    }),
  },
}));

vi.mock("../../repositories/productRepository", () => ({
  findActiveProductsBySeller: vi.fn(),
  findProductsByIds: vi.fn(),
  findAllProductsBySeller: mocks.findAllProductsBySeller,
  createProduct: mocks.createProduct,
  updateProductForSeller: mocks.updateProductForSeller,
  deleteProductForSeller: mocks.deleteProductForSeller,
  reorderProducts: mocks.reorderProducts,
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
vi.mock("../../repositories/sellerRepository", () => ({ findSellerById: vi.fn() }));

const SELLER_USER = { id: "user-1", phone: "919990001111" };
const SELLER_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getUser.mockResolvedValue({ data: { user: SELLER_USER }, error: null });
  mocks.membershipMaybeSingle.mockResolvedValue({ data: { seller_id: SELLER_ID, role: "staff" }, error: null });
});

describe("seller product routes auth", () => {
  it("requires a bearer token", async () => {
    const res = await request(createApp()).get("/api/seller/products");
    expect(res.status).toBe(401);
  });

  it("staff (not just owner) can manage products", async () => {
    mocks.findAllProductsBySeller.mockResolvedValue([]);
    const res = await request(createApp())
      .get("/api/seller/products")
      .set("Authorization", "Bearer good");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/seller/products", () => {
  it("creates a product scoped to the caller's seller id", async () => {
    mocks.createProduct.mockResolvedValue({ id: "p1", name: "Kurti" });

    const res = await request(createApp())
      .post("/api/seller/products")
      .set("Authorization", "Bearer good")
      .send({ name: "Kurti", price_paise: 59900 });

    expect(res.status).toBe(201);
    expect(mocks.createProduct).toHaveBeenCalledWith(SELLER_ID, { name: "Kurti", price_paise: 59900 });
  });

  it("rejects a negative price", async () => {
    const res = await request(createApp())
      .post("/api/seller/products")
      .set("Authorization", "Bearer good")
      .send({ name: "Kurti", price_paise: -1 });

    expect(res.status).toBe(400);
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/seller/products/reorder", () => {
  it("is not swallowed by the /:id route", async () => {
    const res = await request(createApp())
      .patch("/api/seller/products/reorder")
      .set("Authorization", "Bearer good")
      .send({ order: [{ id: "11111111-1111-1111-1111-111111111111", sort_order: 0 }] });

    expect(res.status).toBe(204);
    expect(mocks.reorderProducts).toHaveBeenCalledWith(SELLER_ID, [
      { id: "11111111-1111-1111-1111-111111111111", sort_order: 0 },
    ]);
  });
});

describe("PATCH /api/seller/products/:id", () => {
  it("404s for a product belonging to a different seller", async () => {
    mocks.updateProductForSeller.mockResolvedValue(null);

    const res = await request(createApp())
      .patch("/api/seller/products/some-id")
      .set("Authorization", "Bearer good")
      .send({ in_stock: false });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/seller/products/:id", () => {
  it("204s on success", async () => {
    mocks.deleteProductForSeller.mockResolvedValue({ id: "p1" });

    const res = await request(createApp())
      .delete("/api/seller/products/p1")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(204);
  });

  it("404s when nothing was deleted", async () => {
    mocks.deleteProductForSeller.mockResolvedValue(null);

    const res = await request(createApp())
      .delete("/api/seller/products/p1")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(404);
  });
});
