import { Router } from "express";
import { sellerSignup } from "../controllers/sellerAuthController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const sellerSignupRoutes = Router();

sellerSignupRoutes.post("/", requireAuth, asyncHandler(sellerSignup));
