import type { OrderMessage } from "../types/order";

export type OrderStepState = "done" | "current" | "upcoming" | "cancelled";

export type OrderStep = {
  key: string;
  label: string;
  state: OrderStepState;
  time?: string;
};

const MAIN_STATUSES = ["new", "pending_payment", "paid", "shipped", "delivered"];

type Args = {
  status: string;
  createdAt: string;
  addressAt: string | null;
  history: Array<{ to_status: string; created_at: string }>;
  proofSubmittedAt?: string | null;
};

/** Heuristic match for the seed "Shipping address" form: its fields include a `pincode` key. */
export function findAddressResponseTimestamp(messages: OrderMessage[]): string | null {
  const match = messages.find((m) => {
    if (m.kind !== "form_response") return false;
    const fields = m.payload.fields as Record<string, string> | undefined;
    return Boolean(fields && Object.prototype.hasOwnProperty.call(fields, "pincode"));
  });
  return match?.created_at ?? null;
}

export function computeOrderSteps({ status, createdAt, addressAt, history, proofSubmittedAt }: Args): OrderStep[] {
  if (status === "cancelled") {
    const cancelledAt = history.find((h) => h.to_status === "cancelled")?.created_at;
    return [
      { key: "placed", label: "Order placed", state: "done", time: createdAt },
      { key: "cancelled", label: "Order cancelled", state: "cancelled", time: cancelledAt },
    ];
  }

  const idx = MAIN_STATUSES.indexOf(status);
  const timeFor = (s: string) => history.find((h) => h.to_status === s)?.created_at;

  const addressState: OrderStepState = addressAt ? "done" : idx <= 1 ? "current" : "upcoming";

  const paymentState: OrderStepState = idx > 1 ? "done" : idx === 1 ? "current" : "upcoming";
  const paymentLabel =
    paymentState === "done"
      ? "Payment confirmed"
      : paymentState === "current" && proofSubmittedAt
        ? "Payment being verified"
        : "Payment pending";

  const shippedState: OrderStepState = idx > 3 ? "done" : idx === 3 ? "current" : "upcoming";
  const deliveredState: OrderStepState = idx >= 4 ? "done" : "upcoming";

  return [
    { key: "placed", label: "Order placed", state: "done", time: createdAt },
    {
      key: "address",
      label: addressAt ? "Address added" : "Address pending",
      state: addressState,
      time: addressAt ?? undefined,
    },
    {
      key: "payment",
      label: paymentLabel,
      state: paymentState,
      time: paymentState === "done" ? timeFor("paid") : (proofSubmittedAt ?? undefined),
    },
    { key: "shipped", label: "Shipped", state: shippedState, time: timeFor("shipped") },
    { key: "delivered", label: "Delivered", state: deliveredState, time: timeFor("delivered") },
  ];
}
