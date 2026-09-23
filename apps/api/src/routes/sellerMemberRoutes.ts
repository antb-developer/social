import { Router } from "express";
import { addSellerMemberHandler, listSellerMembersHandler } from "../controllers/sellerSettingsController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireOwner, requireSellerMembership } from "../middleware/auth";

export const sellerMemberRoutes = Router();

sellerMemberRoutes.use(requireAuth, requireSellerMembership);

sellerMemberRoutes.get("/", asyncHandler(listSellerMembersHandler));
sellerMemberRoutes.post("/", requireOwner, asyncHandler(addSellerMemberHandler));
