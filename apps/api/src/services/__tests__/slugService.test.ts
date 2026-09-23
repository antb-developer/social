import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "../slugService";

describe("isValidSlug", () => {
  it.each(["demo-store", "shop123", "a", "my-shop-2"])("accepts %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each([
    "Demo-Store", // uppercase
    "demo_store", // underscore
    "demo store", // space
    "-demo", // leading hyphen
    "demo-", // trailing hyphen
    "demo--store", // double hyphen
    "",
  ])("rejects malformed slug %s", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });

  it.each(["admin", "api", "settings", "dashboard", "www"])("rejects reserved word %s", (slug) => {
    expect(isValidSlug(slug)).toBe(false);
  });
});

describe("slugify", () => {
  it.each([
    ["Demo Store", "demo-store"],
    ["Demo  Store!!", "demo-store"],
    ["  Spaced Out  ", "spaced-out"],
    ["Café Chic", "caf-chic"],
    ["Already-slug-like", "already-slug-like"],
  ])("slugifies %s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("always produces output that passes isValidSlug for realistic store names", () => {
    for (const name of ["My Boutique", "Amit's Kirana Store", "24x7 Mart", "  Trailing Spaces  "]) {
      expect(isValidSlug(slugify(name))).toBe(true);
    }
  });
});
