import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  membershipMaybeSingle: vi.fn(),
  findOrderById: vi.fn(),
  findOrderItems: vi.fn(),
  findOrderMessages: vi.fn(),
  findOrderStatusHistory: vi.fn(),
  findOrdersBySeller: vi.fn(),
  insertOrderMessage: vi.fn(),
  insertOrderStatusHistory: vi.fn(),
  updateOrderStatus: vi.fn(),
  findCustomerById: vi.fn(),
  findProofsByOrder: vi.fn(),
  sendPushToUsers: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: mocks.membershipMaybeSingle,
          }),
        }),
      }),
    }),
  },
}));

vi.mock("../../repositories/orderRepository", () => ({
  findOrderById: mocks.findOrderById,
  findOrderItems: mocks.findOrderItems,
  findOrderMessages: mocks.findOrderMessages,
  findOrderStatusHistory: mocks.findOrderStatusHistory,
  findOrdersBySeller: mocks.findOrdersBySeller,
  insertOrderMessage: mocks.insertOrderMessage,
  insertOrderStatusHistory: mocks.insertOrderStatusHistory,
  updateOrderStatus: mocks.updateOrderStatus,
}));

// The customer-facing order routes are mounted in the same app; give them
// harmless mocks so importing app.ts doesn't pull in a real Supabase call.
vi.mock("../../repositories/customerRepository", () => ({
  ensureCustomer: vi.fn(),
  findCustomerById: mocks.findCustomerById,
}));
vi.mock("../../repositories/sellerRepository", () => ({ findSellerById: vi.fn() }));
vi.mock("../../repositories/productRepository", () => ({ findProductsByIds: vi.fn() }));
vi.mock("../../repositories/paymentProofRepository", () => ({
  createPaymentProof: vi.fn(),
  findProofsByOrder: mocks.findProofsByOrder,
}));
vi.mock("../../services/pushService", () => ({ sendPushToUsers: mocks.sendPushToUsers }));

const SELLER_USER = { id: "user-1", phone: "919990001111" };
const SELLER_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getUser.mockResolvedValue({ data: { user: SELLER_USER }, error: null });
  mocks.membershipMaybeSingle.mockResolvedValue({
    data: { seller_id: SELLER_ID, role: "owner" },
    error: null,
  });
});

describe("seller order routes auth", () => {
  it("requires a bearer token", async () => {
    const res = await request(createApp()).get("/api/seller/orders");
    expect(res.status).toBe(401);
  });

  it("requires seller membership", async () => {
    mocks.membershipMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(createApp()).get("/api/seller/orders").set("Authorization", "Bearer good");

    expect(res.status).toBe(403);
  });
});

describe("GET /api/seller/orders", () => {
  it("scopes the query to the caller's seller id", async () => {
    mocks.findOrdersBySeller.mockResolvedValue([{ id: "order-1" }]);

    const res = await request(createApp())
      .get("/api/seller/orders?status=pending_payment&q=Asha")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.findOrdersBySeller).toHaveBeenCalledWith(SELLER_ID, {
      status: "pending_payment",
      q: "Asha",
    });
  });
});

describe("GET /api/seller/orders/:id", () => {
  it("404s for an order belonging to a different seller", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: "someone-elses-store" });

    const res = await request(createApp())
      .get("/api/seller/orders/order-1")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(404);
  });

  it("returns order + items + messages + history + proofs + customer for the owning seller", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      status: "paid",
    });
    mocks.findOrderItems.mockResolvedValue([{ id: "item-1" }]);
    mocks.findOrderMessages.mockResolvedValue([{ id: "msg-1" }]);
    mocks.findOrderStatusHistory.mockResolvedValue([{ id: "hist-1" }]);
    mocks.findProofsByOrder.mockResolvedValue([{ id: "proof-1", review: "pending" }]);
    mocks.findCustomerById.mockResolvedValue({ id: "customer-1", name: "Asha", phone: "919990002222" });

    const res = await request(createApp())
      .get("/api/seller/orders/order-1")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([{ id: "item-1" }]);
    expect(res.body.payment_proofs).toEqual([{ id: "proof-1", review: "pending" }]);
    expect(res.body.customer).toEqual({ id: "customer-1", name: "Asha", phone: "919990002222" });
  });
});

describe("POST /api/seller/orders/:id/messages", () => {
  it("defaults a payment_request's amount to the order total and notifies the customer", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      total_paise: 104700,
      status: "pending_payment",
    });
    mocks.insertOrderMessage.mockResolvedValue({ id: "msg-1" });

    const res = await request(createApp())
      .post("/api/seller/orders/order-1/messages")
      .set("Authorization", "Bearer good")
      .send({ kind: "payment_request", title: "Payment details" });

    expect(res.status).toBe(201);
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "seller",
      kind: "payment_request",
      payload: { title: "Payment details", amount_paise: 104700 },
    });
    expect(mocks.sendPushToUsers).toHaveBeenCalledWith(
      ["customer-1"],
      expect.objectContaining({ title: "Payment request", url: "/o/order-1" })
    );
    // Order was already pending_payment, so no second status transition.
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("sending a payment_request on a new order also moves it to pending_payment", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      total_paise: 104700,
      status: "new",
    });
    mocks.insertOrderMessage.mockResolvedValue({ id: "msg-1" });

    const res = await request(createApp())
      .post("/api/seller/orders/order-1/messages")
      .set("Authorization", "Bearer good")
      .send({ kind: "payment_request", title: "Payment details" });

    expect(res.status).toBe(201);
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith("order-1", "pending_payment");
    expect(mocks.insertOrderStatusHistory).toHaveBeenCalledWith({
      orderId: "order-1",
      from: "new",
      to: "pending_payment",
      changedBy: "user-1",
      note: "Payment request sent",
    });
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "system",
      kind: "status_change",
      payload: { from: "new", to: "pending_payment" },
    });
    // The payment_request message itself is still posted, on top of the status_change one.
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "seller",
      kind: "payment_request",
      payload: { title: "Payment details", amount_paise: 104700 },
    });
  });

  it("a text message on a new order does not change its status", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      status: "new",
    });
    mocks.insertOrderMessage.mockResolvedValue({ id: "msg-1" });

    const res = await request(createApp())
      .post("/api/seller/orders/order-1/messages")
      .set("Authorization", "Bearer good")
      .send({ kind: "text", body: "Hi!" });

    expect(res.status).toBe(201);
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/seller/orders/:id/status", () => {
  it("rejects an invalid transition and makes no writes", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID, status: "new" });

    const res = await request(createApp())
      .patch("/api/seller/orders/order-1/status")
      .set("Authorization", "Bearer good")
      .send({ status: "delivered" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("invalid_status_transition");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejects setting pending_payment directly — only sending a payment request can", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID, status: "new" });

    const res = await request(createApp())
      .patch("/api/seller/orders/order-1/status")
      .set("Authorization", "Bearer good")
      .send({ status: "pending_payment" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("use_payment_request");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejects setting paid directly — only proof review or the manual confirmation can", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID, status: "pending_payment" });

    const res = await request(createApp())
      .patch("/api/seller/orders/order-1/status")
      .set("Authorization", "Bearer good")
      .send({ status: "paid" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("use_payment_review");
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("applies a valid transition and records history + a system message + customer push", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      order_no: "ORD-1000",
      status: "paid",
    });

    const res = await request(createApp())
      .patch("/api/seller/orders/order-1/status")
      .set("Authorization", "Bearer good")
      .send({ status: "shipped" });

    expect(res.status).toBe(200);
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith("order-1", "shipped");
    expect(mocks.sendPushToUsers).toHaveBeenCalledWith(
      ["customer-1"],
      expect.objectContaining({ title: "Order status updated" })
    );
    expect(mocks.insertOrderStatusHistory).toHaveBeenCalledWith({
      orderId: "order-1",
      from: "paid",
      to: "shipped",
      changedBy: "user-1",
      note: undefined,
    });
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "system",
      kind: "status_change",
      payload: { from: "paid", to: "shipped" },
    });
  });
});

describe("POST /api/seller/orders/:id/mark-paid", () => {
  it("requires verified: true", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID, status: "pending_payment" });

    const res = await request(createApp())
      .post("/api/seller/orders/order-1/mark-paid")
      .set("Authorization", "Bearer good")
      .send({ note: "Paid by cash" });

    expect(res.status).toBe(400);
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rejects when the order isn't in a state that can move to paid", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", seller_id: SELLER_ID, status: "new" });

    const res = await request(createApp())
      .post("/api/seller/orders/order-1/mark-paid")
      .set("Authorization", "Bearer good")
      .send({ verified: true });

    expect(res.status).toBe(409);
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("marks the order paid, recording the note and who confirmed it", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      order_no: "ORD-1000",
      status: "pending_payment",
    });

    const res = await request(createApp())
      .post("/api/seller/orders/order-1/mark-paid")
      .set("Authorization", "Bearer good")
      .send({ verified: true, note: "Paid by cash on pickup" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "order-1", status: "paid" });
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith("order-1", "paid");
    expect(mocks.insertOrderStatusHistory).toHaveBeenCalledWith({
      orderId: "order-1",
      from: "pending_payment",
      to: "paid",
      changedBy: "user-1",
      note: "Marked paid manually: Paid by cash on pickup",
    });
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "system",
      kind: "status_change",
      payload: { from: "pending_payment", to: "paid" },
    });
    expect(mocks.sendPushToUsers).toHaveBeenCalledWith(
      ["customer-1"],
      expect.objectContaining({ title: "Payment confirmed" })
    );
  });

  it("works with no note", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      seller_id: SELLER_ID,
      customer_id: "customer-1",
      order_no: "ORD-1000",
      status: "pending_payment",
    });

    const res = await request(createApp())
      .post("/api/seller/orders/order-1/mark-paid")
      .set("Authorization", "Bearer good")
      .send({ verified: true });

    expect(res.status).toBe(200);
    expect(mocks.insertOrderStatusHistory).toHaveBeenCalledWith(
      expect.objectContaining({ note: "Marked paid manually" })
    );
  });
});
