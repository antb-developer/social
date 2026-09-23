import { Router } from "express";
import { subscribeToPush } from "../controllers/pushController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const pushRoutes = Router();

pushRoutes.post("/subscribe", requireAuth, asyncHandler(subscribeToPush));
