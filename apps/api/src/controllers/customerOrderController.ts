import type { Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../middleware/errors";
import { ensureCustomer } from "../repositories/customerRepository";
import {
  createOrderWithItems,
  findOrderById,
  findOrderItems,
  findOrderMessages,
  findOrderStatusHistory,
  findOrdersByCustomer,
  insertOrderMessage,
  setProofUploaded,
  updateOrderAddress,
} from "../repositories/orderRepository";
import { createPaymentProof } from "../repositories/paymentProofRepository";
import { findProductsByIds } from "../repositories/productRepository";
import { findMembersForSeller, findSellerById } from "../repositories/sellerRepository";
import { priceCartLines, sumOrderItemsPaise } from "../services/orderTotalService";
import { sendPushToUsers } from "../services/pushService";

async function notifySellerMembers(sellerId: string, payload: { title: string; body: string; url: string }) {
  const members = await findMembersForSeller(sellerId);
  await sendPushToUsers(
    members.map((m) => m.user_id),
    payload
  );
}

async function findOwnedOrder(orderId: string, customerId: string) {
  const order = await findOrderById(orderId);
  if (!order || order.customer_id !== customerId) {
    throw new AppError(404, "order_not_found", "No such order");
  }
  return order;
}

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, "unauthorized", "Missing bearer token");
  }
  return req.user;
}

const createOrderSchema = z.object({
  seller_id: z.string().uuid(),
  items: z.array(z.object({ product_id: z.string().uuid(), qty: z.number().int().positive() })).min(1),
  address: z.record(z.unknown()).optional(),
});

export async function createOrder(req: Request, res: Response) {
  const user = requireUser(req);
  const body = createOrderSchema.parse(req.body);

  await ensureCustomer(user.id, user.phone);

  const seller = await findSellerById(body.seller_id);
  if (!seller) {
    throw new AppError(404, "store_not_found", "No store with this id");
  }
  if (!seller.is_accepting_orders) {
    throw new AppError(409, "store_not_accepting_orders", "This store isn't accepting orders right now");
  }

  const products = await findProductsByIds(
    body.seller_id,
    body.items.map((i) => i.product_id)
  );
  const pricedItems = priceCartLines(products, body.items);
  const totalPaise = sumOrderItemsPaise(pricedItems);

  const order = await createOrderWithItems({
    sellerId: body.seller_id,
    customerId: user.id,
    address: body.address,
    items: pricedItems,
    totalPaise,
  });

  await notifySellerMembers(body.seller_id, {
    title: "New order",
    body: `Order ${order.order_no} was just placed.`,
    url: `/dashboard/orders/${order.id}`,
  });

  res.status(201).json(order);
}

const listMyOrdersSchema = z.object({
  status: z.enum(["new", "pending_payment", "paid", "shipped", "delivered", "cancelled"]).optional(),
});

export async function listMyOrders(req: Request, res: Response) {
  const user = requireUser(req);
  const { status } = listMyOrdersSchema.parse(req.query);
  const orders = await findOrdersByCustomer(user.id, status);
  res.json(orders);
}

export async function getOrderDetail(req: Request, res: Response) {
  const user = requireUser(req);
  const order = await findOwnedOrder(req.params.id, user.id);

  const [items, messages, statusHistory, seller] = await Promise.all([
    findOrderItems(order.id),
    findOrderMessages(order.id),
    findOrderStatusHistory(order.id),
    findSellerById(order.seller_id),
  ]);

  res.json({
    ...order,
    items,
    messages,
    status_history: statusHistory,
    seller: seller
      ? {
          id: seller.id,
          name: seller.name,
          whatsapp_number: seller.whatsapp_number,
          upi_id: seller.upi_id,
          upi_name: seller.upi_name,
        }
      : null,
  });
}

const createMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string().min(1) }),
  z.object({
    kind: z.literal("form_response"),
    fields: z.record(z.string()),
    is_address_form: z.boolean().optional(),
  }),
]);

export async function createOrderMessage(req: Request, res: Response) {
  const user = requireUser(req);
  const order = await findOwnedOrder(req.params.id, user.id);
  const body = createMessageSchema.parse(req.body);

  const payload = body.kind === "text" ? { body: body.body } : { fields: body.fields };
  const message = await insertOrderMessage({
    orderId: order.id,
    sender: "customer",
    kind: body.kind,
    payload,
  });

  if (body.kind === "form_response" && body.is_address_form) {
    await updateOrderAddress(order.id, body.fields);
  }

  await notifySellerMembers(order.seller_id, {
    title: body.kind === "text" ? "New message" : "Form submitted",
    body: body.kind === "text" ? body.body : `Customer submitted a form for order ${order.order_no}.`,
    url: `/dashboard/orders/${order.id}`,
  });

  res.status(201).json(message);
}

const PAYMENT_PROOF_BUCKET = "payment-proofs";

const submitProofSchema = z.object({
  utr: z.string().regex(/^\d{12}$/, "UTR must be exactly 12 digits"),
});

export async function submitPaymentProof(req: Request, res: Response) {
  const user = requireUser(req);
  const order = await findOwnedOrder(req.params.id, user.id);
  const body = submitProofSchema.parse(req.body);

  if (order.status !== "pending_payment") {
    throw new AppError(409, "invalid_order_status", "This order is not awaiting payment");
  }

  const file = req.file;
  if (!file) {
    throw new AppError(400, "missing_file", "No payment screenshot was uploaded");
  }
  if (!file.mimetype.startsWith("image/")) {
    throw new AppError(400, "invalid_file", "Only image uploads are allowed");
  }

  // Stored as a Storage object path (e.g. "<order_id>/167..-proof.jpg") in the
  // private payment-proofs bucket, not a public URL — the bucket is private,
  // so viewers fetch a short-lived signed URL for this path on read instead
  // of a durable URL being stored here.
  const imagePath = `${order.id}/${Date.now()}-${file.originalname}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(imagePath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (uploadError) {
    throw new AppError(502, "upload_failed", uploadError.message);
  }

  const proof = await createPaymentProof({
    orderId: order.id,
    imageUrl: imagePath,
    utr: body.utr,
    amountPaise: order.total_paise,
  });

  await setProofUploaded(order.id, true);
  await insertOrderMessage({
    orderId: order.id,
    sender: "customer",
    kind: "payment_proof",
    payload: { proof_id: proof.id, utr: proof.utr },
  });

  await notifySellerMembers(order.seller_id, {
    title: "Payment proof uploaded",
    body: `Order ${order.order_no} has a new payment proof to review.`,
    url: `/dashboard/orders/${order.id}`,
  });

  res.status(201).json(proof);
}
