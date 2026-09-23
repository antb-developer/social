import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/customerProfileController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const customerProfileRoutes = Router();

customerProfileRoutes.get("/", requireAuth, asyncHandler(getMyProfile));
customerProfileRoutes.patch("/", requireAuth, asyncHandler(updateMyProfile));
