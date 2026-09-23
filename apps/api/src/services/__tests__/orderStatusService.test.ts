import { describe, expect, it } from "vitest";
import { AppError } from "../../middleware/errors";
import {
  assertValidTransition,
  getAllowedNextStatuses,
  isValidTransition,
  type OrderStatus,
} from "../orderStatusService";

const ALL_STATUSES: OrderStatus[] = ["new", "pending_payment", "paid", "shipped", "delivered", "cancelled"];

describe("isValidTransition", () => {
  it.each([
    ["new", "pending_payment"],
    ["new", "cancelled"],
    ["pending_payment", "paid"],
    ["pending_payment", "cancelled"],
    ["paid", "shipped"],
    ["paid", "cancelled"],
    ["shipped", "delivered"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it.each([
    ["new", "paid"],
    ["new", "shipped"],
    ["new", "delivered"],
    ["pending_payment", "shipped"],
    ["pending_payment", "delivered"],
    ["paid", "delivered"],
    ["shipped", "cancelled"],
    ["shipped", "paid"],
    ["delivered", "cancelled"],
    ["cancelled", "new"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  it("delivered and cancelled are terminal", () => {
    expect(getAllowedNextStatuses("delivered")).toEqual([]);
    expect(getAllowedNextStatuses("cancelled")).toEqual([]);
  });

  it("every status is covered by the transition table", () => {
    for (const status of ALL_STATUSES) {
      expect(getAllowedNextStatuses(status)).toBeInstanceOf(Array);
    }
  });
});

describe("assertValidTransition", () => {
  it("does not throw for a valid transition", () => {
    expect(() => assertValidTransition("new", "pending_payment")).not.toThrow();
  });

  it("throws a 409 AppError for an invalid transition", () => {
    try {
      assertValidTransition("delivered", "new");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(409);
      expect((err as AppError).code).toBe("invalid_status_transition");
    }
  });
});
