import { Router } from "express";
import {
  createSellerTemplate,
  deleteSellerTemplate,
  listSellerTemplates,
  updateSellerTemplate,
} from "../controllers/sellerTemplateController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireSellerMembership } from "../middleware/auth";

export const sellerTemplateRoutes = Router();

sellerTemplateRoutes.use(requireAuth, requireSellerMembership);

sellerTemplateRoutes.get("/", asyncHandler(listSellerTemplates));
sellerTemplateRoutes.post("/", asyncHandler(createSellerTemplate));
sellerTemplateRoutes.patch("/:id", asyncHandler(updateSellerTemplate));
sellerTemplateRoutes.delete("/:id", asyncHandler(deleteSellerTemplate));
