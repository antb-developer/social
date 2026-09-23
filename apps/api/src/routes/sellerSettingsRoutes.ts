import { Router } from "express";
import { getSellerSettings, updateSellerSettings } from "../controllers/sellerSettingsController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireOwner, requireSellerMembership } from "../middleware/auth";

export const sellerSettingsRoutes = Router();

sellerSettingsRoutes.use(requireAuth, requireSellerMembership);

sellerSettingsRoutes.get("/", asyncHandler(getSellerSettings));
sellerSettingsRoutes.patch("/", requireOwner, asyncHandler(updateSellerSettings));
