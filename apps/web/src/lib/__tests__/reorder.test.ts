import { describe, expect, it } from "vitest";
import { moveItem } from "../reorder";

describe("moveItem", () => {
  it("moves an item earlier in the list", () => {
    expect(moveItem(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("moves an item later in the list", () => {
    expect(moveItem(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
  });

  it("is a no-op when from and to are the same", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, "b", "b")).toEqual(items);
  });

  it("is a no-op when either id is missing from the list", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, "x", "b")).toEqual(items);
    expect(moveItem(items, "a", "x")).toEqual(items);
  });

  it("does not mutate the original array", () => {
    const items = ["a", "b", "c"];
    moveItem(items, "a", "c");
    expect(items).toEqual(["a", "b", "c"]);
  });
});
