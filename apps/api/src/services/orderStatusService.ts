import { AppError } from "../middleware/errors";

export type OrderStatus = "new" | "pending_payment" | "paid" | "shipped" | "delivered" | "cancelled";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["pending_payment", "cancelled"],
  pending_payment: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function getAllowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  if (!isValidTransition(from, to)) {
    throw new AppError(
      409,
      "invalid_status_transition",
      `Cannot move an order from "${from}" to "${to}"`
    );
  }
}
