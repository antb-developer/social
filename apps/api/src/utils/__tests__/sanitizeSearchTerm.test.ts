import { describe, expect, it } from "vitest";
import { sanitizeSearchTerm } from "../sanitizeSearchTerm";

describe("sanitizeSearchTerm", () => {
  it("keeps letters, digits, spaces and hyphens", () => {
    expect(sanitizeSearchTerm("ORD-1024")).toBe("ORD-1024");
    expect(sanitizeSearchTerm("Asha Verma")).toBe("Asha Verma");
    expect(sanitizeSearchTerm("9990002222")).toBe("9990002222");
  });

  it("strips characters that are meaningful in a PostgREST .or() filter", () => {
    expect(sanitizeSearchTerm("),status.eq.paid,(")).toBe("statuseqpaid");
    expect(sanitizeSearchTerm("a,b(c)d.e")).toBe("abcde");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeSearchTerm("  hello  ")).toBe("hello");
  });
});
