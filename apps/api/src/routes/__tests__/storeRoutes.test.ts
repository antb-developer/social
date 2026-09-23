import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";

const { findSellerBySlug } = vi.hoisted(() => ({ findSellerBySlug: vi.fn() }));
const { findActiveProductsBySeller } = vi.hoisted(() => ({ findActiveProductsBySeller: vi.fn() }));

vi.mock("../../repositories/sellerRepository", () => ({ findSellerBySlug }));
vi.mock("../../repositories/productRepository", () => ({ findActiveProductsBySeller }));

beforeEach(() => {
  findSellerBySlug.mockReset();
  findActiveProductsBySeller.mockReset();
});

describe("GET /api/stores/:slug", () => {
  it("returns the store for a known slug", async () => {
    findSellerBySlug.mockResolvedValue({ id: "seller-1", slug: "demo-store", name: "Demo Store" });

    const res = await request(createApp()).get("/api/stores/demo-store");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "seller-1", slug: "demo-store", name: "Demo Store" });
  });

  it("404s for an unknown slug", async () => {
    findSellerBySlug.mockResolvedValue(null);

    const res = await request(createApp()).get("/api/stores/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("store_not_found");
  });
});

describe("GET /api/stores/:slug/products", () => {
  it("returns the seller's active products", async () => {
    findSellerBySlug.mockResolvedValue({ id: "seller-1", slug: "demo-store" });
    findActiveProductsBySeller.mockResolvedValue([{ id: "p1", name: "Kurti", in_stock: true }]);

    const res = await request(createApp()).get("/api/stores/demo-store/products");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "p1", name: "Kurti", in_stock: true }]);
    expect(findActiveProductsBySeller).toHaveBeenCalledWith("seller-1");
  });

  it("404s for an unknown slug instead of listing products", async () => {
    findSellerBySlug.mockResolvedValue(null);

    const res = await request(createApp()).get("/api/stores/does-not-exist/products");

    expect(res.status).toBe(404);
    expect(findActiveProductsBySeller).not.toHaveBeenCalled();
  });
});
