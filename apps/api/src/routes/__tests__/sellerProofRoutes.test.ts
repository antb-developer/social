import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  membershipMaybeSingle: vi.fn(),
  findOrderById: vi.fn(),
  insertOrderMessage: vi.fn(),
  insertOrderStatusHistory: vi.fn(),
  updateOrderStatus: vi.fn(),
  setProofUploaded: vi.fn(),
  findProofById: vi.fn(),
  updateProofReview: vi.fn(),
  sendPushToUsers: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: mocks.membershipMaybeSingle }) }) }),
    }),
    storage: { from: () => ({ createSignedUrl: mocks.createSignedUrl }) },
  },
}));

vi.mock("../../repositories/orderRepository", () => ({
  findOrderById: mocks.findOrderById,
  findOrderItems: vi.fn(),
  findOrderMessages: vi.fn(),
  findOrderStatusHistory: vi.fn(),
  findOrdersBySeller: vi.fn(),
  insertOrderMessage: mocks.insertOrderMessage,
  insertOrderStatusHistory: mocks.insertOrderStatusHistory,
  updateOrderStatus: mocks.updateOrderStatus,
  setProofUploaded: mocks.setProofUploaded,
}));
vi.mock("../../repositories/paymentProofRepository", () => ({
  createPaymentProof: vi.fn(),
  findProofById: mocks.findProofById,
  updateProofReview: mocks.updateProofReview,
}));

vi.mock("../../repositories/customerRepository", () => ({ ensureCustomer: vi.fn() }));
vi.mock("../../repositories/sellerRepository", () => ({ findSellerById: vi.fn() }));
vi.mock("../../repositories/productRepository", () => ({ findProductsByIds: vi.fn() }));
vi.mock("../../services/pushService", () => ({ sendPushToUsers: mocks.sendPushToUsers }));

const SELLER_USER = { id: "user-1", phone: "919990001111" };
const SELLER_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getUser.mockResolvedValue({ data: { user: SELLER_USER }, error: null });
  mocks.membershipMaybeSingle.mockResolvedValue({ data: { seller_id: SELLER_ID, role: "owner" }, error: null });
});

describe("GET /api/seller/proofs/:id/signed-url", () => {
  it("404s for a proof belonging to a different seller's order", async () => {
    mocks.findProofById.mockResolvedValue({ id: "proof-1", order_id: "order-1", image_url: "order-1/x.jpg" });
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: "someone-elses-store" });

    const res = await request(createApp())
      .get("/api/seller/proofs/proof-1/signed-url")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(404);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signed URL for the owning seller's proof", async () => {
    mocks.findProofById.mockResolvedValue({ id: "proof-1", order_id: "order-1", image_url: "order-1/x.jpg" });
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/x.jpg" }, error: null });

    const res = await request(createApp())
      .get("/api/seller/proofs/proof-1/signed-url")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: "https://signed.example/x.jpg" });
    expect(mocks.createSignedUrl).toHaveBeenCalledWith("order-1/x.jpg", 3600);
  });
});

describe("POST /api/seller/proofs/:id/review", () => {
  it("404s for a proof belonging to a different seller's order", async () => {
    mocks.findProofById.mockResolvedValue({ id: "proof-1", order_id: "order-1", review: "pending" });
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: "someone-elses-store" });

    const res = await request(createApp())
      .post("/api/seller/proofs/proof-1/review")
      .set("Authorization", "Bearer good")
      .send({ decision: "approved" });

    expect(res.status).toBe(404);
    expect(mocks.updateProofReview).not.toHaveBeenCalled();
  });

  it("rejects reviewing a proof that was already reviewed", async () => {
    mocks.findProofById.mockResolvedValue({ id: "proof-1", order_id: "order-1", review: "approved" });
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID, status: "paid" });

    const res = await request(createApp())
      .post("/api/seller/proofs/proof-1/review")
      .set("Authorization", "Bearer good")
      .send({ decision: "rejected" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("proof_already_reviewed");
  });

  it("approving moves the order to paid, records history, and notifies the customer", async () => {
    mocks.findProofById.mockResolvedValue({ id: "proof-1", order_id: "order-1", review: "pending" });
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      order_no: "ORD-1000",
      status: "pending_payment",
    });

    const res = await request(createApp())
      .post("/api/seller/proofs/proof-1/review")
      .set("Authorization", "Bearer good")
      .send({ decision: "approved" });

    expect(res.status).toBe(200);
    expect(mocks.updateProofReview).toHaveBeenCalledWith("proof-1", "approved", "user-1");
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith("order-1", "paid");
    expect(mocks.insertOrderStatusHistory).toHaveBeenCalledWith({
      orderId: "order-1",
      from: "pending_payment",
      to: "paid",
      changedBy: "user-1",
      note: "Payment proof approved",
    });
    expect(mocks.sendPushToUsers).toHaveBeenCalledWith(
      ["customer-1"],
      expect.objectContaining({ title: "Payment approved" })
    );
  });

  it("rejects an approval that would require an invalid status transition", async () => {
    mocks.findProofById.mockResolvedValue({ id: "proof-1", order_id: "order-1", review: "pending" });
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID, status: "delivered" });

    const res = await request(createApp())
      .post("/api/seller/proofs/proof-1/review")
      .set("Authorization", "Bearer good")
      .send({ decision: "approved" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("invalid_status_transition");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejecting clears proof_uploaded, leaves order status untouched, and notifies the customer", async () => {
    mocks.findProofById.mockResolvedValue({ id: "proof-1", order_id: "order-1", review: "pending" });
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      order_no: "ORD-1000",
      status: "pending_payment",
    });

    const res = await request(createApp())
      .post("/api/seller/proofs/proof-1/review")
      .set("Authorization", "Bearer good")
      .send({ decision: "rejected" });

    expect(res.status).toBe(200);
    expect(mocks.setProofUploaded).toHaveBeenCalledWith("order-1", false);
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "seller",
      kind: "text",
      payload: { body: "Your payment proof was rejected. Please re-upload it." },
    });
    expect(mocks.sendPushToUsers).toHaveBeenCalledWith(
      ["customer-1"],
      expect.objectContaining({ title: "Payment proof rejected" })
    );
  });
});
