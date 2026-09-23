import type { Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../middleware/errors";
import {
  findOrderById,
  insertOrderMessage,
  insertOrderStatusHistory,
  setProofUploaded,
  updateOrderStatus,
} from "../repositories/orderRepository";
import { findProofById, updateProofReview } from "../repositories/paymentProofRepository";
import { assertValidTransition, type OrderStatus } from "../services/orderStatusService";
import { sendPushToUsers } from "../services/pushService";

const PAYMENT_PROOF_BUCKET = "payment-proofs";

function requireSellerContext(req: Request) {
  if (!req.user || !req.sellerId) {
    throw new AppError(401, "unauthorized", "Missing seller session");
  }
  return { userId: req.user.id, sellerId: req.sellerId };
}

async function findProofForSeller(proofId: string, sellerId: string) {
  const proof = await findProofById(proofId);
  if (!proof) {
    throw new AppError(404, "proof_not_found", "No such payment proof");
  }

  const order = await findOrderById(proof.order_id);
  if (!order || order.seller_id !== sellerId) {
    throw new AppError(404, "proof_not_found", "No such payment proof");
  }

  return { proof, order };
}

/**
 * The payment-proofs bucket is private, and the browser only ever holds the
 * dev-OTP bearer token rather than a real Supabase Auth session — a direct
 * createSignedUrl call from the browser would fail the storage RLS select
 * policy's auth.uid() check. So the seller fetches the signed URL through the
 * API (service role) instead.
 */
export async function getProofSignedUrl(req: Request, res: Response) {
  const { sellerId } = requireSellerContext(req);
  const { proof } = await findProofForSeller(req.params.id, sellerId);

  const { data, error } = await supabaseAdmin.storage
    .from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(proof.image_url, 3600);
  if (error) {
    throw new AppError(502, "signed_url_failed", error.message);
  }

  res.json({ url: data.signedUrl });
}

const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export async function reviewPaymentProof(req: Request, res: Response) {
  const { sellerId, userId } = requireSellerContext(req);
  const body = reviewSchema.parse(req.body);
  const { proof, order } = await findProofForSeller(req.params.id, sellerId);

  if (proof.review !== "pending") {
    throw new AppError(409, "proof_already_reviewed", "This proof has already been reviewed");
  }

  await updateProofReview(proof.id, body.decision, userId);

  if (body.decision === "approved") {
    const from = order.status as OrderStatus;
    assertValidTransition(from, "paid");

    await updateOrderStatus(order.id, "paid");
    await insertOrderStatusHistory({
      orderId: order.id,
      from,
      to: "paid",
      changedBy: userId,
      note: "Payment proof approved",
    });
    await insertOrderMessage({
      orderId: order.id,
      sender: "system",
      kind: "status_change",
      payload: { from, to: "paid" },
    });
    await sendPushToUsers([order.customer_id], {
      title: "Payment approved",
      body: `Your payment for order ${order.order_no} was approved.`,
      url: `/o/${order.id}`,
    });
  } else {
    await setProofUploaded(order.id, false);
    await insertOrderMessage({
      orderId: order.id,
      sender: "seller",
      kind: "text",
      payload: { body: "Your payment proof was rejected. Please re-upload it." },
    });
    await sendPushToUsers([order.customer_id], {
      title: "Payment proof rejected",
      body: `Please re-upload your payment proof for order ${order.order_no}.`,
      url: `/o/${order.id}`,
    });
  }

  res.json({ id: proof.id, review: body.decision });
}
