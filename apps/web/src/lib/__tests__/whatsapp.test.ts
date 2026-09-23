import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "../whatsapp";

describe("buildWhatsAppUrl", () => {
  it("strips non-digit characters from the number", () => {
    const url = buildWhatsAppUrl("+91 99900 02222", "hi");
    expect(url).toBe("https://wa.me/919990002222?text=hi");
  });

  it("URL-encodes the message", () => {
    const url = buildWhatsAppUrl("919990002222", "Order ORD-1000 & more?");
    expect(url).toBe("https://wa.me/919990002222?text=Order%20ORD-1000%20%26%20more%3F");
  });
});
