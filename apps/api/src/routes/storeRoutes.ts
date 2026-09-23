import { Router } from "express";
import { getStoreBySlug, getStoreProducts } from "../controllers/storeController";
import { asyncHandler } from "../middleware/asyncHandler";

export const storeRoutes = Router();

storeRoutes.get("/:slug", asyncHandler(getStoreBySlug));
storeRoutes.get("/:slug/products", asyncHandler(getStoreProducts));
