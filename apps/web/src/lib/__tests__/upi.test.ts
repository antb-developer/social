import { describe, expect, it } from "vitest";
import { buildUpiUri } from "../upi";

describe("buildUpiUri", () => {
  it("builds a upi://pay deep link with pa/pn/am/tn", () => {
    const uri = buildUpiUri({
      payeeVpa: "demo@upi",
      payeeName: "Demo Store",
      amountPaise: 104700,
      note: "ORD-1000",
    });
    expect(uri).toBe("upi://pay?pa=demo%40upi&pn=Demo+Store&am=1047.00&tn=ORD-1000");
  });

  it("formats the amount to 2 decimal places even for round rupee amounts", () => {
    const uri = buildUpiUri({ payeeVpa: "a@b", payeeName: "A", amountPaise: 50000, note: "x" });
    expect(uri).toContain("am=500.00");
  });
});
