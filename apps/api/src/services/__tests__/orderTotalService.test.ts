import { describe, expect, it } from "vitest";
import { AppError } from "../../middleware/errors";
import { priceCartLines, sumOrderItemsPaise, type ProductRecord } from "../orderTotalService";

const PRODUCTS: ProductRecord[] = [
  { id: "p1", name: "Kurti", price_paise: 59900, in_stock: true, is_active: true },
  { id: "p2", name: "Dupatta (out of stock)", price_paise: 34900, in_stock: false, is_active: true },
  { id: "p3", name: "Discontinued clutch", price_paise: 54900, in_stock: true, is_active: false },
];

describe("priceCartLines", () => {
  it("prices lines from the DB product record, ignoring any client-supplied price", () => {
    const cartWithSpoofedPrice = [{ product_id: "p1", qty: 2, price_paise: 1 } as any];
    const items = priceCartLines(PRODUCTS, cartWithSpoofedPrice);

    expect(items).toEqual([
      { product_id: "p1", name_snapshot: "Kurti", price_snapshot_paise: 59900, qty: 2 },
    ]);
  });

  it("rejects an empty cart", () => {
    expect(() => priceCartLines(PRODUCTS, [])).toThrow(AppError);
  });

  it("rejects an unknown product", () => {
    try {
      priceCartLines(PRODUCTS, [{ product_id: "nope", qty: 1 }]);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(400);
      expect((err as AppError).code).toBe("invalid_product");
    }
  });

  it("rejects an out-of-stock product", () => {
    try {
      priceCartLines(PRODUCTS, [{ product_id: "p2", qty: 1 }]);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("product_out_of_stock");
    }
  });

  it("rejects an inactive product", () => {
    try {
      priceCartLines(PRODUCTS, [{ product_id: "p3", qty: 1 }]);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("product_unavailable");
    }
  });

  it.each([0, -1, 1.5])("rejects an invalid quantity: %s", (qty) => {
    expect(() => priceCartLines(PRODUCTS, [{ product_id: "p1", qty }])).toThrow(AppError);
  });
});

describe("sumOrderItemsPaise", () => {
  it("sums price * qty across lines", () => {
    const total = sumOrderItemsPaise([
      { price_snapshot_paise: 59900, qty: 2 },
      { price_snapshot_paise: 44900, qty: 1 },
    ]);
    expect(total).toBe(59900 * 2 + 44900);
  });

  it("returns 0 for no items", () => {
    expect(sumOrderItemsPaise([])).toBe(0);
  });
});
