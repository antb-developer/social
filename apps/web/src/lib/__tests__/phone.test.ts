import { describe, expect, it } from "vitest";
import { normalizeIndianPhone } from "../phone";

describe("normalizeIndianPhone", () => {
  it("prefixes a bare 10-digit number with +91", () => {
    expect(normalizeIndianPhone("9990002222")).toBe("+919990002222");
  });

  it("handles a number typed with spaces or hyphens", () => {
    expect(normalizeIndianPhone("999 000 2222")).toBe("+919990002222");
    expect(normalizeIndianPhone("999-000-2222")).toBe("+919990002222");
  });

  it("leaves an already-prefixed +91 number as-is", () => {
    expect(normalizeIndianPhone("+919990002222")).toBe("+919990002222");
  });

  it("adds + to a bare 91-prefixed number", () => {
    expect(normalizeIndianPhone("919990002222")).toBe("+919990002222");
  });

  it("strips a leading 0 trunk prefix", () => {
    expect(normalizeIndianPhone("09990002222")).toBe("+919990002222");
  });
});
