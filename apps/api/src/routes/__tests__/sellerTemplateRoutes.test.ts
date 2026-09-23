import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  membershipMaybeSingle: vi.fn(),
  findAllTemplatesBySeller: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplateForSeller: vi.fn(),
  deleteTemplateForSeller: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: mocks.membershipMaybeSingle }) }) }),
    }),
  },
}));

vi.mock("../../repositories/templateRepository", () => ({
  findAllTemplatesBySeller: mocks.findAllTemplatesBySeller,
  createTemplate: mocks.createTemplate,
  updateTemplateForSeller: mocks.updateTemplateForSeller,
  deleteTemplateForSeller: mocks.deleteTemplateForSeller,
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

describe("GET /api/seller/templates", () => {
  it("requires auth", async () => {
    const res = await request(createApp()).get("/api/seller/templates");
    expect(res.status).toBe(401);
  });

  it("lists templates scoped to the caller's seller id", async () => {
    mocks.findAllTemplatesBySeller.mockResolvedValue([{ id: "t1" }]);

    const res = await request(createApp())
      .get("/api/seller/templates")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.findAllTemplatesBySeller).toHaveBeenCalledWith(SELLER_ID);
  });
});

describe("POST /api/seller/templates", () => {
  it("creates a form_request template with fields", async () => {
    mocks.createTemplate.mockResolvedValue({ id: "t1" });
    const fields = [{ key: "pincode", label: "Pincode", type: "pincode", required: true }];

    const res = await request(createApp())
      .post("/api/seller/templates")
      .set("Authorization", "Bearer good")
      .send({ kind: "form_request", title: "Shipping address", fields });

    expect(res.status).toBe(201);
    expect(mocks.createTemplate).toHaveBeenCalledWith(SELLER_ID, {
      kind: "form_request",
      title: "Shipping address",
      fields,
    });
  });

  it("rejects an unknown field type", async () => {
    const res = await request(createApp())
      .post("/api/seller/templates")
      .set("Authorization", "Bearer good")
      .send({
        kind: "form_request",
        title: "Shipping address",
        fields: [{ key: "x", label: "X", type: "not-a-real-type" }],
      });

    expect(res.status).toBe(400);
    expect(mocks.createTemplate).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/seller/templates/:id", () => {
  it("404s for a template belonging to a different seller", async () => {
    mocks.updateTemplateForSeller.mockResolvedValue(null);

    const res = await request(createApp())
      .patch("/api/seller/templates/t1")
      .set("Authorization", "Bearer good")
      .send({ title: "New title" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/seller/templates/:id", () => {
  it("204s on success", async () => {
    mocks.deleteTemplateForSeller.mockResolvedValue({ id: "t1" });

    const res = await request(createApp())
      .delete("/api/seller/templates/t1")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(204);
  });
});
