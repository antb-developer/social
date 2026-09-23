import { beforeEach, describe, expect, it, vi } from "vitest";
import { cartItemCount, cartTotalPaise, clearCart, loadCart, saveCart, withAddedItem, withQty } from "../cart";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
});

describe("withAddedItem", () => {
  it("adds a new item", () => {
    const items = withAddedItem([], { productId: "p1", name: "Kurti", price_paise: 59900 }, 1);
    expect(items).toEqual([{ productId: "p1", name: "Kurti", price_paise: 59900, qty: 1 }]);
  });

  it("merges qty into an existing line instead of duplicating it", () => {
    const first = withAddedItem([], { productId: "p1", name: "Kurti", price_paise: 59900 }, 1);
    const second = withAddedItem(first, { productId: "p1", name: "Kurti", price_paise: 59900 }, 2);
    expect(second).toEqual([{ productId: "p1", name: "Kurti", price_paise: 59900, qty: 3 }]);
  });
});

describe("withQty", () => {
  const items = [{ productId: "p1", name: "Kurti", price_paise: 59900, qty: 2 }];

  it("updates the quantity", () => {
    expect(withQty(items, "p1", 5)).toEqual([{ ...items[0], qty: 5 }]);
  });

  it("removes the line when qty drops to 0 or below", () => {
    expect(withQty(items, "p1", 0)).toEqual([]);
    expect(withQty(items, "p1", -1)).toEqual([]);
  });
});

describe("cartTotalPaise / cartItemCount", () => {
  const items = [
    { productId: "p1", name: "Kurti", price_paise: 59900, qty: 2 },
    { productId: "p2", name: "Palazzo", price_paise: 44900, qty: 1 },
  ];

  it("computes the total in paise", () => {
    expect(cartTotalPaise(items)).toBe(59900 * 2 + 44900);
  });

  it("computes the item count", () => {
    expect(cartItemCount(items)).toBe(3);
  });
});

describe("loadCart / saveCart / clearCart persistence", () => {
  it("round-trips through localStorage", () => {
    const items = [{ productId: "p1", name: "Kurti", price_paise: 59900, qty: 1 }];
    saveCart("demo-store", items);
    expect(loadCart("demo-store")).toEqual(items);
  });

  it("scopes carts per seller slug", () => {
    saveCart("store-a", [{ productId: "p1", name: "A", price_paise: 100, qty: 1 }]);
    saveCart("store-b", [{ productId: "p2", name: "B", price_paise: 200, qty: 1 }]);
    expect(loadCart("store-a")).toEqual([{ productId: "p1", name: "A", price_paise: 100, qty: 1 }]);
    expect(loadCart("store-b")).toEqual([{ productId: "p2", name: "B", price_paise: 200, qty: 1 }]);
  });

  it("returns an empty array for a slug with nothing saved", () => {
    expect(loadCart("never-visited")).toEqual([]);
  });

  it("clearCart removes only that seller's cart", () => {
    saveCart("store-a", [{ productId: "p1", name: "A", price_paise: 100, qty: 1 }]);
    saveCart("store-b", [{ productId: "p2", name: "B", price_paise: 200, qty: 1 }]);
    clearCart("store-a");
    expect(loadCart("store-a")).toEqual([]);
    expect(loadCart("store-b")).toEqual([{ productId: "p2", name: "B", price_paise: 200, qty: 1 }]);
  });
});
