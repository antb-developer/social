import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  superadminMaybeSingle: vi.fn(),
  countStores: vi.fn(),
  countOrders: vi.fn(),
  listStores: vi.fn(),
  findStoreById: vi.fn(),
  listStoreOrders: vi.fn(),
  listStoreMembers: vi.fn(),
  listAllOrders: vi.fn(),
  deleteStoreOrders: vi.fn(),
  deleteStore: vi.fn(),
  findOrderIdsBySeller: vi.fn(),
  ensureSuperadmin: vi.fn(),
  listCustomers: vi.fn(),
  findCustomerById: vi.fn(),
  listCustomerOrders: vi.fn(),
  findOrderIdsByCustomer: vi.fn(),
  deleteCustomerOrders: vi.fn(),
  deleteCustomer: vi.fn(),
  purgeOrderProofs: vi.fn(),
  recordSuperadminAudit: vi.fn(),
  streamStoreBackup: vi.fn(),
  purgeStoreStorage: vi.fn(),
  findOrCreateAuthUserByPhone: vi.fn(),
  findAuthUserPhoneById: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.superadminMaybeSingle,
        }),
      }),
    }),
  },
}));

vi.mock("../../repositories/superadminRepository", () => ({
  countStores: mocks.countStores,
  countOrders: mocks.countOrders,
  listStores: mocks.listStores,
  findStoreById: mocks.findStoreById,
  listStoreOrders: mocks.listStoreOrders,
  listStoreMembers: mocks.listStoreMembers,
  listAllOrders: mocks.listAllOrders,
  deleteStoreOrders: mocks.deleteStoreOrders,
  deleteStore: mocks.deleteStore,
  findOrderIdsBySeller: mocks.findOrderIdsBySeller,
  ensureSuperadmin: mocks.ensureSuperadmin,
  listCustomers: mocks.listCustomers,
  findCustomerById: mocks.findCustomerById,
  listCustomerOrders: mocks.listCustomerOrders,
  findOrderIdsByCustomer: mocks.findOrderIdsByCustomer,
  deleteCustomerOrders: mocks.deleteCustomerOrders,
  deleteCustomer: mocks.deleteCustomer,
}));

vi.mock("../../repositories/authUserRepository", () => ({
  findOrCreateAuthUserByPhone: mocks.findOrCreateAuthUserByPhone,
  findAuthUserPhoneById: mocks.findAuthUserPhoneById,
}));

vi.mock("../../repositories/auditLogRepository", () => ({
  recordSuperadminAudit: mocks.recordSuperadminAudit,
}));

vi.mock("../../services/superadminBackupService", () => ({
  streamStoreBackup: mocks.streamStoreBackup,
}));

vi.mock("../../services/superadminStorageService", () => ({
  purgeStoreStorage: mocks.purgeStoreStorage,
  purgeOrderProofs: mocks.purgeOrderProofs,
}));

// The limiter's counter is process-wide and shared by every destructive route,
// so once this file makes >10 destructive calls it 429s unrelated tests. Its
// behaviour is covered in middleware/__tests__/rateLimit.test.ts.
vi.mock("../../middleware/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../middleware/rateLimit")>()),
  superadminDestructiveRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const SUPERADMIN_USER = { id: "super-1", phone: "919990003333" };
const NON_SUPERADMIN_USER = { id: "user-2", phone: "919990001111" };
const CUSTOMER = { id: "cust-1", name: "Asha", phone: "919990002222", created_at: "2026-01-01T00:00:00Z" };
const STORE = { id: "store-1", name: "Demo Store", slug: "demo-store" };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
});

function asSuperadmin() {
  mocks.getUser.mockResolvedValue({ data: { user: SUPERADMIN_USER }, error: null });
  mocks.superadminMaybeSingle.mockResolvedValue({ data: { user_id: SUPERADMIN_USER.id }, error: null });
}

function asNonSuperadmin() {
  mocks.getUser.mockResolvedValue({ data: { user: NON_SUPERADMIN_USER }, error: null });
  mocks.superadminMaybeSingle.mockResolvedValue({ data: null, error: null });
}

describe("POST /api/superadmin/login", () => {
  it("rejects the wrong password", async () => {
    const res = await request(createApp())
      .post("/api/superadmin/login")
      .send({ username: "superadmin", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_credentials");
    expect(mocks.findOrCreateAuthUserByPhone).not.toHaveBeenCalled();
  });

  it("rejects the wrong username", async () => {
    const res = await request(createApp())
      .post("/api/superadmin/login")
      .send({ username: "not-superadmin", password: "Superadmin@123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("invalid_credentials");
  });

  it("issues a token, provisioning the identity, on correct credentials", async () => {
    mocks.findOrCreateAuthUserByPhone.mockResolvedValue("superadmin-user-1");

    const res = await request(createApp())
      .post("/api/superadmin/login")
      .send({ username: "superadmin", password: "Superadmin@123" });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.startsWith("superadmin:")).toBe(true);
    expect(mocks.ensureSuperadmin).toHaveBeenCalledWith("superadmin-user-1");
  });

  it("the issued token then passes requireSuperadmin", async () => {
    mocks.findOrCreateAuthUserByPhone.mockResolvedValue("superadmin-user-1");
    mocks.findAuthUserPhoneById.mockResolvedValue("919990003333");
    mocks.superadminMaybeSingle.mockResolvedValue({ data: { user_id: "superadmin-user-1" }, error: null });
    mocks.countStores.mockResolvedValue(1);
    mocks.countOrders.mockResolvedValue(2);

    const loginRes = await request(createApp())
      .post("/api/superadmin/login")
      .send({ username: "superadmin", password: "Superadmin@123" });

    const dashboardRes = await request(createApp())
      .get("/api/superadmin/dashboard")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body).toEqual({ storeCount: 1, orderCount: 2 });
  });
});

describe("superadmin routes auth", () => {
  it("requires a bearer token", async () => {
    const res = await request(createApp()).get("/api/superadmin/dashboard");
    expect(res.status).toBe(401);
  });

  it("rejects an authenticated user with no superadmins row", async () => {
    asNonSuperadmin();

    const res = await request(createApp()).get("/api/superadmin/dashboard").set("Authorization", "Bearer good");

    expect(res.status).toBe(403);
  });
});

describe("GET /api/superadmin/dashboard", () => {
  it("returns store and order counts", async () => {
    asSuperadmin();
    mocks.countStores.mockResolvedValue(12);
    mocks.countOrders.mockResolvedValue(340);

    const res = await request(createApp()).get("/api/superadmin/dashboard").set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ storeCount: 12, orderCount: 340 });
  });
});

describe("GET /api/superadmin/stores", () => {
  it("lists stores with pagination defaults", async () => {
    asSuperadmin();
    mocks.listStores.mockResolvedValue({ data: [{ id: "store-1" }], total: 1 });

    const res = await request(createApp()).get("/api/superadmin/stores").set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.listStores).toHaveBeenCalledWith({ page: 1, pageSize: 20, q: undefined });
    expect(res.body).toEqual({ data: [{ id: "store-1" }], total: 1, page: 1, pageSize: 20 });
  });

  it("passes through search and pagination params", async () => {
    asSuperadmin();
    mocks.listStores.mockResolvedValue({ data: [], total: 0 });

    const res = await request(createApp())
      .get("/api/superadmin/stores?q=abc&page=2&pageSize=5")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.listStores).toHaveBeenCalledWith({ page: 2, pageSize: 5, q: "abc" });
  });

  it("caps pageSize at the max", async () => {
    asSuperadmin();
    mocks.listStores.mockResolvedValue({ data: [], total: 0 });

    const res = await request(createApp())
      .get("/api/superadmin/stores?pageSize=500")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(400);
  });
});

describe("GET /api/superadmin/stores/:id", () => {
  it("404s for an unknown store", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(null);

    const res = await request(createApp()).get("/api/superadmin/stores/store-1").set("Authorization", "Bearer good");

    expect(res.status).toBe(404);
  });

  it("returns the store and records a store_viewed audit entry", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(STORE);

    const res = await request(createApp()).get("/api/superadmin/stores/store-1").set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(STORE);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith({
      actorUserId: SUPERADMIN_USER.id,
      action: "store_viewed",
      targetType: "store",
      targetId: STORE.id,
      sellerId: STORE.id,
    });
  });
});

describe("GET /api/superadmin/orders", () => {
  it("filters cross-store orders by seller, status and date range", async () => {
    asSuperadmin();
    mocks.listAllOrders.mockResolvedValue({ data: [], total: 0 });

    const res = await request(createApp())
      .get("/api/superadmin/orders?sellerId=33333333-3333-3333-3333-333333333333&status=paid&from=2026-01-01&to=2026-02-01")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.listAllOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      sellerId: "33333333-3333-3333-3333-333333333333",
      status: "paid",
      from: "2026-01-01",
      to: "2026-02-01",
      q: undefined,
    });
  });
});

describe("POST /api/superadmin/stores/:id/backup", () => {
  it("404s for an unknown store without generating a backup", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/superadmin/stores/store-1/backup")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(404);
    expect(mocks.streamStoreBackup).not.toHaveBeenCalled();
  });

  it("streams the backup and records a backup_created audit entry", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(STORE);
    mocks.streamStoreBackup.mockImplementation(async (res) => {
      res.status(200).end("zip-bytes");
    });

    const res = await request(createApp())
      .post("/api/superadmin/stores/store-1/backup")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.streamStoreBackup).toHaveBeenCalledWith(expect.anything(), STORE);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith({
      actorUserId: SUPERADMIN_USER.id,
      action: "backup_created",
      targetType: "store",
      targetId: STORE.id,
      sellerId: STORE.id,
    });
  });
});

describe("DELETE /api/superadmin/stores/:id/orders", () => {
  it("rejects without the exact typed confirmation", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(STORE);

    const res = await request(createApp())
      .delete("/api/superadmin/stores/store-1/orders")
      .set("Authorization", "Bearer good")
      .send({ confirm: "delete orders" });

    expect(res.status).toBe(400);
    expect(mocks.deleteStoreOrders).not.toHaveBeenCalled();
  });

  it("deletes orders, records the audit entry with the count, and returns it", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(STORE);
    mocks.deleteStoreOrders.mockResolvedValue(7);

    const res = await request(createApp())
      .delete("/api/superadmin/stores/store-1/orders")
      .set("Authorization", "Bearer good")
      .send({ confirm: "DELETE ORDERS" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deletedCount: 7 });
    expect(mocks.deleteStoreOrders).toHaveBeenCalledWith(STORE.id);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith({
      actorUserId: SUPERADMIN_USER.id,
      action: "orders_deleted",
      targetType: "store",
      targetId: STORE.id,
      sellerId: STORE.id,
      metadata: { deletedCount: 7 },
    });
  });
});

describe("DELETE /api/superadmin/stores/:id", () => {
  it("rejects a confirmation that doesn't match this store's slug", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(STORE);

    const res = await request(createApp())
      .delete("/api/superadmin/stores/store-1")
      .set("Authorization", "Bearer good")
      .send({ confirm: "DELETE STORE some-other-store" });

    expect(res.status).toBe(400);
    expect(mocks.deleteStore).not.toHaveBeenCalled();
  });

  it("deletes the store, purges its storage, and records the audit entry with no seller_id (the store is gone)", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(STORE);
    mocks.findOrderIdsBySeller.mockResolvedValue(["order-1", "order-2"]);

    const res = await request(createApp())
      .delete("/api/superadmin/stores/store-1")
      .set("Authorization", "Bearer good")
      .send({ confirm: "DELETE STORE demo-store" });

    expect(res.status).toBe(200);
    expect(mocks.deleteStore).toHaveBeenCalledWith(STORE.id);
    expect(mocks.purgeStoreStorage).toHaveBeenCalledWith(STORE.id, ["order-1", "order-2"]);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith({
      actorUserId: SUPERADMIN_USER.id,
      action: "store_deleted",
      targetType: "store",
      targetId: STORE.id,
      metadata: { name: STORE.name, slug: STORE.slug },
    });
  });

  it("still succeeds and still audits if the storage purge fails (the DB delete already committed)", async () => {
    asSuperadmin();
    mocks.findStoreById.mockResolvedValue(STORE);
    mocks.findOrderIdsBySeller.mockResolvedValue([]);
    mocks.purgeStoreStorage.mockRejectedValue(new Error("storage unavailable"));

    const res = await request(createApp())
      .delete("/api/superadmin/stores/store-1")
      .set("Authorization", "Bearer good")
      .send({ confirm: "DELETE STORE demo-store" });

    expect(res.status).toBe(200);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "store_deleted" })
    );
  });
});

describe("superadmin customers", () => {
  it("rejects non-superadmins", async () => {
    asNonSuperadmin();
    const res = await request(createApp()).get("/api/superadmin/customers").set("Authorization", "Bearer good");
    expect(res.status).toBe(403);
    expect(mocks.listCustomers).not.toHaveBeenCalled();
  });

  it("lists customers with search and pagination", async () => {
    asSuperadmin();
    mocks.listCustomers.mockResolvedValue({ data: [CUSTOMER], total: 1 });

    const res = await request(createApp())
      .get("/api/superadmin/customers?q=asha&page=2&pageSize=5")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.listCustomers).toHaveBeenCalledWith({ page: 2, pageSize: 5, q: "asha" });
    expect(res.body).toEqual({ data: [CUSTOMER], total: 1, page: 2, pageSize: 5 });
  });

  it("returns a customer and audits the view; 404s an unknown one", async () => {
    asSuperadmin();
    mocks.findCustomerById.mockResolvedValueOnce(CUSTOMER).mockResolvedValueOnce(null);

    const ok = await request(createApp()).get("/api/superadmin/customers/cust-1").set("Authorization", "Bearer good");
    expect(ok.status).toBe(200);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith({
      actorUserId: SUPERADMIN_USER.id,
      action: "customer_viewed",
      targetType: "customer",
      targetId: CUSTOMER.id,
    });

    const missing = await request(createApp()).get("/api/superadmin/customers/nope").set("Authorization", "Bearer good");
    expect(missing.status).toBe(404);
  });

  it("lists a customer's orders", async () => {
    asSuperadmin();
    mocks.findCustomerById.mockResolvedValue(CUSTOMER);
    mocks.listCustomerOrders.mockResolvedValue({ data: [{ id: "o1" }], total: 1 });

    const res = await request(createApp())
      .get("/api/superadmin/customers/cust-1/orders")
      .set("Authorization", "Bearer good");

    expect(res.status).toBe(200);
    expect(mocks.listCustomerOrders).toHaveBeenCalledWith(CUSTOMER.id, { page: 1, pageSize: 20 });
  });

  it("DELETE orders requires the typed confirmation, then deletes, purges proofs and audits", async () => {
    asSuperadmin();
    mocks.findCustomerById.mockResolvedValue(CUSTOMER);
    mocks.findOrderIdsByCustomer.mockResolvedValue(["o1", "o2"]);
    mocks.deleteCustomerOrders.mockResolvedValue(2);

    const bad = await request(createApp())
      .delete("/api/superadmin/customers/cust-1/orders")
      .set("Authorization", "Bearer good")
      .send({ confirm: "nope" });
    expect(bad.status).toBe(400);
    expect(mocks.deleteCustomerOrders).not.toHaveBeenCalled();

    const res = await request(createApp())
      .delete("/api/superadmin/customers/cust-1/orders")
      .set("Authorization", "Bearer good")
      .send({ confirm: "DELETE ORDERS" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deletedCount: 2 });
    expect(mocks.purgeOrderProofs).toHaveBeenCalledWith(["o1", "o2"]);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith({
      actorUserId: SUPERADMIN_USER.id,
      action: "customer_orders_deleted",
      targetType: "customer",
      targetId: CUSTOMER.id,
      metadata: { deletedCount: 2 },
    });
  });

  it("DELETE customer needs the phone-specific confirmation and still succeeds if proof purge fails", async () => {
    asSuperadmin();
    mocks.findCustomerById.mockResolvedValue(CUSTOMER);
    mocks.findOrderIdsByCustomer.mockResolvedValue(["o1"]);
    mocks.purgeOrderProofs.mockRejectedValue(new Error("storage unavailable"));

    const bad = await request(createApp())
      .delete("/api/superadmin/customers/cust-1")
      .set("Authorization", "Bearer good")
      .send({ confirm: "DELETE CUSTOMER 000" });
    expect(bad.status).toBe(400);
    expect(mocks.deleteCustomer).not.toHaveBeenCalled();

    const res = await request(createApp())
      .delete("/api/superadmin/customers/cust-1")
      .set("Authorization", "Bearer good")
      .send({ confirm: `DELETE CUSTOMER ${CUSTOMER.phone}` });

    expect(res.status).toBe(200);
    expect(mocks.deleteCustomer).toHaveBeenCalledWith(CUSTOMER.id);
    expect(mocks.recordSuperadminAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "customer_deleted", targetId: CUSTOMER.id })
    );
  });
});
