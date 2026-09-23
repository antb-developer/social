import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  ensureCustomer: vi.fn(),
  findSellerById: vi.fn(),
  findMembersForSeller: vi.fn(),
  findProductsByIds: vi.fn(),
  createOrderWithItems: vi.fn(),
  findOrderById: vi.fn(),
  findOrderItems: vi.fn(),
  findOrderMessages: vi.fn(),
  findOrderStatusHistory: vi.fn(),
  findOrdersByCustomer: vi.fn(),
  insertOrderMessage: vi.fn(),
  updateOrderAddress: vi.fn(),
  setProofUploaded: vi.fn(),
  createPaymentProof: vi.fn(),
  storageUpload: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    storage: { from: () => ({ upload: mocks.storageUpload }) },
  },
}));
vi.mock("../../repositories/customerRepository", () => ({ ensureCustomer: mocks.ensureCustomer }));
vi.mock("../../repositories/sellerRepository", () => ({
  findSellerById: mocks.findSellerById,
  findMembersForSeller: mocks.findMembersForSeller,
}));
vi.mock("../../repositories/productRepository", () => ({ findProductsByIds: mocks.findProductsByIds }));
vi.mock("../../repositories/orderRepository", () => ({
  createOrderWithItems: mocks.createOrderWithItems,
  findOrderById: mocks.findOrderById,
  findOrderItems: mocks.findOrderItems,
  findOrderMessages: mocks.findOrderMessages,
  findOrderStatusHistory: mocks.findOrderStatusHistory,
  findOrdersByCustomer: mocks.findOrdersByCustomer,
  insertOrderMessage: mocks.insertOrderMessage,
  updateOrderAddress: mocks.updateOrderAddress,
  setProofUploaded: mocks.setProofUploaded,
}));
vi.mock("../../repositories/paymentProofRepository", () => ({ createPaymentProof: mocks.createPaymentProof }));

const CUSTOMER = { id: "customer-1", phone: "919990002222" };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getUser.mockResolvedValue({ data: { user: CUSTOMER }, error: null });
  mocks.findMembersForSeller.mockResolvedValue([]);
  mocks.storageUpload.mockResolvedValue({ error: null });
});

describe("POST /api/orders", () => {
  it("requires auth", async () => {
    const res = await request(createApp()).post("/api/orders").send({});
    expect(res.status).toBe(401);
  });

  it("re-prices from the DB and creates the order", async () => {
    mocks.findSellerById.mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111", is_accepting_orders: true });
    mocks.findProductsByIds.mockResolvedValue([
      { id: "22222222-2222-2222-2222-222222222222", name: "Kurti", price_paise: 59900, in_stock: true, is_active: true },
    ]);
    mocks.createOrderWithItems.mockResolvedValue({ id: "order-1", order_no: "ORD-1000", status: "new" });

    const res = await request(createApp())
      .post("/api/orders")
      .set("Authorization", "Bearer good")
      .send({
        seller_id: "11111111-1111-1111-1111-111111111111",
        items: [{ product_id: "22222222-2222-2222-2222-222222222222", qty: 2, price_paise: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "order-1", order_no: "ORD-1000", status: "new" });
    expect(mocks.createOrderWithItems).toHaveBeenCalledWith(
      expect.objectContaining({ totalPaise: 59900 * 2 })
    );
    // Proves orderCreationRateLimiter is actually wired on this route,
    // without tripping the module-level shared limiter across test cases.
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    // Proves the "new order" seller push-notification trigger actually
    // fires (looks up the right seller's members), not just that the
    // request doesn't crash.
    expect(mocks.findMembersForSeller).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111"
    );
  });

  it("rejects a store that isn't accepting orders", async () => {
    mocks.findSellerById.mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111", is_accepting_orders: false });

    const res = await request(createApp())
      .post("/api/orders")
      .set("Authorization", "Bearer good")
      .send({ seller_id: "11111111-1111-1111-1111-111111111111", items: [{ product_id: "22222222-2222-2222-2222-222222222222", qty: 1 }] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("store_not_accepting_orders");
    expect(mocks.createOrderWithItems).not.toHaveBeenCalled();
  });
});

describe("GET /api/me/orders", () => {
  it("requires auth", async () => {
    const res = await request(createApp()).get("/api/me/orders");
    expect(res.status).toBe(401);
  });

  it("lists the caller's own orders", async () => {
    mocks.findOrdersByCustomer.mockResolvedValue([{ id: "order-1" }]);

    const res = await request(createApp())
      .get("/api/me/orders?status=paid")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.findOrdersByCustomer).toHaveBeenCalledWith("customer-1", "paid");
  });
});

describe("GET /api/orders/:id", () => {
  it("404s when the order belongs to a different customer", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", customer_id: "someone-else" });

    const res = await request(createApp()).get("/api/orders/order-1").set("Authorization", "Bearer good");

    expect(res.status).toBe(404);
    expect(mocks.findOrderItems).not.toHaveBeenCalled();
  });

  it("returns order + items + messages + history + seller for the owning customer", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      customer_id: "customer-1",
      seller_id: "seller-1",
      status: "paid",
    });
    mocks.findOrderItems.mockResolvedValue([{ id: "item-1" }]);
    mocks.findOrderMessages.mockResolvedValue([{ id: "msg-1" }]);
    mocks.findOrderStatusHistory.mockResolvedValue([{ id: "hist-1" }]);
    mocks.findSellerById.mockResolvedValue({
      id: "seller-1",
      name: "Demo Store",
      whatsapp_number: "+919990001111",
      upi_id: "demostore@upi",
      upi_name: "Demo Store",
    });

    const res = await request(createApp()).get("/api/orders/order-1").set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "order-1",
      customer_id: "customer-1",
      seller_id: "seller-1",
      status: "paid",
      items: [{ id: "item-1" }],
      messages: [{ id: "msg-1" }],
      status_history: [{ id: "hist-1" }],
      seller: {
        id: "seller-1",
        name: "Demo Store",
        whatsapp_number: "+919990001111",
        upi_id: "demostore@upi",
        upi_name: "Demo Store",
      },
    });
  });
});

describe("POST /api/orders/:id/messages", () => {
  it("404s for an order that isn't the caller's", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", customer_id: "someone-else" });

    const res = await request(createApp())
      .post("/api/orders/order-1/messages")
      .set("Authorization", "Bearer good")
      .send({ kind: "text", body: "hi" });

    expect(res.status).toBe(404);
    expect(mocks.insertOrderMessage).not.toHaveBeenCalled();
  });

  it("inserts a text message as sender=customer", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", customer_id: "customer-1" });
    mocks.insertOrderMessage.mockResolvedValue({ id: "msg-1", sender: "customer", kind: "text" });

    const res = await request(createApp())
      .post("/api/orders/order-1/messages")
      .set("Authorization", "Bearer good")
      .send({ kind: "text", body: "when will it ship?" });

    expect(res.status).toBe(201);
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "customer",
      kind: "text",
      payload: { body: "when will it ship?" },
    });
    expect(mocks.updateOrderAddress).not.toHaveBeenCalled();
  });

  it("syncs orders.address when a form_response is flagged as the address form", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", customer_id: "customer-1" });
    mocks.insertOrderMessage.mockResolvedValue({ id: "msg-1" });
    const fields = { name: "Asha", phone: "9990002222", city: "Pune" };

    const res = await request(createApp())
      .post("/api/orders/order-1/messages")
      .set("Authorization", "Bearer good")
      .send({ kind: "form_response", fields, is_address_form: true });

    expect(res.status).toBe(201);
    expect(mocks.updateOrderAddress).toHaveBeenCalledWith("order-1", fields);
  });

  it("does not sync address for a non-address form_response", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", customer_id: "customer-1" });
    mocks.insertOrderMessage.mockResolvedValue({ id: "msg-1" });

    await request(createApp())
      .post("/api/orders/order-1/messages")
      .set("Authorization", "Bearer good")
      .send({ kind: "form_response", fields: { size: "M" } });

    expect(mocks.updateOrderAddress).not.toHaveBeenCalled();
  });
});

describe("POST /api/orders/:id/proof", () => {
  it("404s for an order that isn't the caller's", async () => {
    mocks.findOrderById.mockResolvedValue({ id: "order-1", customer_id: "someone-else" });

    const res = await request(createApp())
      .post("/api/orders/order-1/proof")
      .set("Authorization", "Bearer good")
      .send({ image_url: "https://example.com/proof.jpg", utr: "123456789012" });

    expect(res.status).toBe(404);
  });

  it("rejects a UTR that isn't exactly 12 digits", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      customer_id: "customer-1",
      status: "pending_payment",
      total_paise: 1000,
    });

    const res = await request(createApp())
      .post("/api/orders/order-1/proof")
      .set("Authorization", "Bearer good")
      .field("utr", "123");

    expect(res.status).toBe(400);
    expect(mocks.createPaymentProof).not.toHaveBeenCalled();
  });

  it("rejects proof upload when the order isn't pending_payment", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      customer_id: "customer-1",
      status: "new",
      total_paise: 1000,
    });

    const res = await request(createApp())
      .post("/api/orders/order-1/proof")
      .set("Authorization", "Bearer good")
      .field("utr", "123456789012");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("invalid_order_status");
  });

  it("creates the proof using the order's own total, not a client-supplied amount", async () => {
    mocks.findOrderById.mockResolvedValue({
      id: "order-1",
      customer_id: "customer-1",
      status: "pending_payment",
      total_paise: 104700,
    });
    mocks.createPaymentProof.mockResolvedValue({ id: "proof-1", utr: "123456789012" });

    const res = await request(createApp())
      .post("/api/orders/order-1/proof")
      .set("Authorization", "Bearer good")
      .field("utr", "123456789012")
      .field("amount_paise", "1")
      .attach("image", Buffer.from("fake-image-bytes"), "proof.jpg");

    expect(res.status).toBe(201);
    expect(mocks.storageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^order-1\/\d+-proof\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/jpeg" })
    );
    expect(mocks.createPaymentProof).toHaveBeenCalledWith({
      orderId: "order-1",
      imageUrl: expect.stringMatching(/^order-1\/\d+-proof\.jpg$/),
      utr: "123456789012",
      amountPaise: 104700,
    });
    expect(mocks.setProofUploaded).toHaveBeenCalledWith("order-1", true);
    expect(mocks.insertOrderMessage).toHaveBeenCalledWith({
      orderId: "order-1",
      sender: "customer",
      kind: "payment_proof",
      payload: { proof_id: "proof-1", utr: "123456789012" },
    });
  });
});
