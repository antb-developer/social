import { Router } from "express";
import multer from "multer";
import {
  createOrder,
  createOrderMessage,
  getOrderDetail,
  listMyOrders,
  submitPaymentProof,
} from "../controllers/customerOrderController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { orderCreationRateLimiter } from "../middleware/rateLimit";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const orderRoutes = Router();

orderRoutes.post("/orders", orderCreationRateLimiter, requireAuth, asyncHandler(createOrder));
orderRoutes.get("/me/orders", requireAuth, asyncHandler(listMyOrders));
orderRoutes.get("/orders/:id", requireAuth, asyncHandler(getOrderDetail));
orderRoutes.post("/orders/:id/messages", requireAuth, asyncHandler(createOrderMessage));
orderRoutes.post("/orders/:id/proof", requireAuth, upload.single("image"), asyncHandler(submitPaymentProof));
