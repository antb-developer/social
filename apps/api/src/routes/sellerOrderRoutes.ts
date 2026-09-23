import { Router } from "express";
import {
  createSellerOrderMessage,
  getSellerOrderDetail,
  listSellerOrders,
  markSellerOrderPaidManually,
  patchSellerOrderStatus,
} from "../controllers/sellerOrderController";
import { getProofSignedUrl, reviewPaymentProof } from "../controllers/sellerProofController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireSellerMembership } from "../middleware/auth";

export const sellerOrderRoutes = Router();

sellerOrderRoutes.use(requireAuth, requireSellerMembership);

sellerOrderRoutes.get("/orders", asyncHandler(listSellerOrders));
sellerOrderRoutes.get("/orders/:id", asyncHandler(getSellerOrderDetail));
sellerOrderRoutes.post("/orders/:id/messages", asyncHandler(createSellerOrderMessage));
sellerOrderRoutes.patch("/orders/:id/status", asyncHandler(patchSellerOrderStatus));
sellerOrderRoutes.post("/orders/:id/mark-paid", asyncHandler(markSellerOrderPaidManually));
sellerOrderRoutes.get("/proofs/:id/signed-url", asyncHandler(getProofSignedUrl));
sellerOrderRoutes.post("/proofs/:id/review", asyncHandler(reviewPaymentProof));
