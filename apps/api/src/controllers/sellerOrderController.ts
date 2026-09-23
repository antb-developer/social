import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { findCustomerById } from "../repositories/customerRepository";
import {
  findOrderById,
  findOrderItems,
  findOrderMessages,
  findOrderStatusHistory,
  findOrdersBySeller,
  insertOrderMessage,
  insertOrderStatusHistory,
  updateOrderStatus,
} from "../repositories/orderRepository";
import { findProofsByOrder } from "../repositories/paymentProofRepository";
import { assertValidTransition, type OrderStatus } from "../services/orderStatusService";
import { sendPushToUsers } from "../services/pushService";

function requireSellerContext(req: Request) {
  if (!req.user || !req.sellerId) {
    throw new AppError(401, "unauthorized", "Missing seller session");
  }
  return { userId: req.user.id, sellerId: req.sellerId };
}

async function findSellerOwnedOrder(orderId: string, sellerId: string) {
  const order = await findOrderById(orderId);
  if (!order || order.seller_id !== sellerId) {
    throw new AppError(404, "order_not_found", "No such order");
  }
  return order;
}

const listOrdersSchema = z.object({
  status: z.enum(["new", "pending_payment", "paid", "shipped", "delivered", "cancelled"]).optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function listSellerOrders(req: Request, res: Response) {
  const { sellerId } = requireSellerContext(req);
  const filters = listOrdersSchema.parse(req.query);
  const orders = await findOrdersBySeller(sellerId, filters);
  res.json(orders);
}

export async function getSellerOrderDetail(req: Request, res: Response) {
  const { sellerId } = requireSellerContext(req);
  const order = await findSellerOwnedOrder(req.params.id, sellerId);

  const [items, messages, statusHistory, paymentProofs, customer] = await Promise.all([
    findOrderItems(order.id),
    findOrderMessages(order.id),
    findOrderStatusHistory(order.id),
    findProofsByOrder(order.id),
    findCustomerById(order.customer_id),
  ]);

  res.json({
    ...order,
    items,
    messages,
    status_history: statusHistory,
    payment_proofs: paymentProofs,
    customer,
  });
}

const sellerMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string().min(1) }),
  z.object({
    kind: z.literal("payment_request"),
    title: z.string().min(1),
    amount_paise: z.number().int().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal("form_request"),
    title: z.string().min(1),
    fields: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(["text", "textarea", "phone", "pincode", "select"]),
        options: z.array(z.string()).optional(),
        required: z.boolean().optional(),
      })
    ),
  }),
]);

export async function createSellerOrderMessage(req: Request, res: Response) {
  const { sellerId, userId } = requireSellerContext(req);
  const order = await findSellerOwnedOrder(req.params.id, sellerId);
  const body = sellerMessageSchema.parse(req.body);

  let payload: Record<string, unknown>;
  if (body.kind === "text") {
    payload = { body: body.body };
  } else if (body.kind === "payment_request") {
    payload = { title: body.title, amount_paise: body.amount_paise ?? order.total_paise };
  } else {
    payload = { title: body.title, fields: body.fields };
  }

  // Sending a payment request is what moves a fresh order into "awaiting
  // payment" — there is no separate button for this transition (see
  // patchSellerOrderStatus below, which refuses to set pending_payment
  // directly). Re-sending later, once the order has moved on, just posts
  // another message with no further status change.
  if (body.kind === "payment_request" && order.status === "new") {
    const from = order.status as OrderStatus;
    const to: OrderStatus = "pending_payment";
    await updateOrderStatus(order.id, to);
    await insertOrderStatusHistory({ orderId: order.id, from, to, changedBy: userId, note: "Payment request sent" });
    await insertOrderMessage({ orderId: order.id, sender: "system", kind: "status_change", payload: { from, to } });
  }

  const message = await insertOrderMessage({
    orderId: order.id,
    sender: "seller",
    kind: body.kind,
    payload,
  });

  const notificationTitle =
    body.kind === "text" ? "New message" : body.kind === "payment_request" ? "Payment request" : "Form request";
  const notificationBody = body.kind === "text" ? body.body : body.title;
  await sendPushToUsers([order.customer_id], {
    title: notificationTitle,
    body: notificationBody,
    url: `/o/${order.id}`,
  });

  res.status(201).json(message);
}

const patchStatusSchema = z.object({
  status: z.enum(["new", "pending_payment", "paid", "shipped", "delivered", "cancelled"]),
  note: z.string().optional(),
});

export async function patchSellerOrderStatus(req: Request, res: Response) {
  const { sellerId, userId } = requireSellerContext(req);
  const order = await findSellerOwnedOrder(req.params.id, sellerId);
  const body = patchStatusSchema.parse(req.body);

  const from = order.status as OrderStatus;
  const to = body.status as OrderStatus;

  // pending_payment and paid each now have one dedicated, gated way in:
  // sending the payment-request template (above), and either proof review
  // or the manual paid confirmation (below). This generic endpoint no
  // longer sets either directly, so there's exactly one path into each.
  if (to === "pending_payment") {
    throw new AppError(
      409,
      "use_payment_request",
      "Send a payment request to move this order to Awaiting payment."
    );
  }
  if (to === "paid") {
    throw new AppError(
      409,
      "use_payment_review",
      "Mark this order paid by reviewing the payment proof, or confirming payment manually."
    );
  }

  assertValidTransition(from, to);

  await updateOrderStatus(order.id, to);
  await insertOrderStatusHistory({ orderId: order.id, from, to, changedBy: userId, note: body.note });
  await insertOrderMessage({
    orderId: order.id,
    sender: "system",
    kind: "status_change",
    payload: { from, to },
  });

  await sendPushToUsers([order.customer_id], {
    title: "Order status updated",
    body: `Your order ${order.order_no} is now ${to.replace("_", " ")}.`,
    url: `/o/${order.id}`,
  });

  res.json({ id: order.id, status: to });
}

const markPaidManuallySchema = z.object({
  verified: z.literal(true, { errorMap: () => ({ message: "Confirm you verified the payment before marking it paid" }) }),
  note: z.string().trim().max(500).optional(),
});

/**
 * The deliberate escape hatch for payments with no proof to review (cash,
 * a bank transfer confirmed by phone, etc). Gated the same way proof
 * approval is — an explicit confirmation, recorded on the order — so
 * "paid" always has a reason attached, never just clicked without either
 * check happening.
 */
export async function markSellerOrderPaidManually(req: Request, res: Response) {
  const { sellerId, userId } = requireSellerContext(req);
  const order = await findSellerOwnedOrder(req.params.id, sellerId);
  const body = markPaidManuallySchema.parse(req.body);

  const from = order.status as OrderStatus;
  assertValidTransition(from, "paid");

  await updateOrderStatus(order.id, "paid");
  await insertOrderStatusHistory({
    orderId: order.id,
    from,
    to: "paid",
    changedBy: userId,
    note: body.note ? `Marked paid manually: ${body.note}` : "Marked paid manually",
  });
  await insertOrderMessage({
    orderId: order.id,
    sender: "system",
    kind: "status_change",
    payload: { from, to: "paid" },
  });

  await sendPushToUsers([order.customer_id], {
    title: "Payment confirmed",
    body: `Your payment for order ${order.order_no} was confirmed.`,
    url: `/o/${order.id}`,
  });

  res.json({ id: order.id, status: "paid" });
}
