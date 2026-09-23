import { Router } from "express";
import multer from "multer";
import {
  createSellerProduct,
  deleteSellerProduct,
  listSellerProducts,
  reorderSellerProducts,
  updateSellerProduct,
  uploadSellerProductImage,
} from "../controllers/sellerProductController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireSellerMembership } from "../middleware/auth";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const sellerProductRoutes = Router();

sellerProductRoutes.use(requireAuth, requireSellerMembership);

sellerProductRoutes.get("/", asyncHandler(listSellerProducts));
sellerProductRoutes.post("/", asyncHandler(createSellerProduct));
// Both must come before "/:id" or Express would treat them as an :id.
sellerProductRoutes.patch("/reorder", asyncHandler(reorderSellerProducts));
sellerProductRoutes.post("/images", upload.single("image"), asyncHandler(uploadSellerProductImage));
sellerProductRoutes.patch("/:id", asyncHandler(updateSellerProduct));
sellerProductRoutes.delete("/:id", asyncHandler(deleteSellerProduct));
