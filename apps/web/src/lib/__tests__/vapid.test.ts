import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "../vapid";

describe("urlBase64ToUint8Array", () => {
  it("round-trips arbitrary bytes through base64url encoding", () => {
    const original = new Uint8Array([0, 1, 2, 253, 254, 255, 16, 32]);
    const standardBase64 = btoa(String.fromCharCode(...original));
    const base64url = standardBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    expect(urlBase64ToUint8Array(base64url)).toEqual(original);
  });

  it("restores stripped padding correctly for a single-byte value", () => {
    // Standard base64 for byte [0] is "AA==" (2 padding chars); URL-safe
    // form has that padding stripped, which is what the function has to
    // reconstruct.
    expect(urlBase64ToUint8Array("AA")).toEqual(new Uint8Array([0]));
  });
});
