import { Router } from "express";
import { devLogin, devSetCustomerName } from "../controllers/devAuthController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const devAuthRoutes = Router();

devAuthRoutes.post("/login", asyncHandler(devLogin));
devAuthRoutes.post("/customer-name", requireAuth, asyncHandler(devSetCustomerName));
