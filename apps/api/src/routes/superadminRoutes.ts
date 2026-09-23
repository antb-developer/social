import { Router } from "express";
import {
  deleteSuperadminStore,
  deleteSuperadminStoreOrders,
  postSuperadminStoreBackup,
} from "../controllers/superadminActionsController";
import { superadminLogin } from "../controllers/superadminAuthController";
import {
  getSuperadminDashboard,
  getSuperadminStore,
  getSuperadminStoreOrders,
  getSuperadminStoreUsers,
  listSuperadminOrders,
  listSuperadminStores,
} from "../controllers/superadminController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireSuperadmin } from "../middleware/auth";
import { superadminDestructiveRateLimiter, superadminLoginRateLimiter } from "../middleware/rateLimit";

export const superadminRoutes = Router();

// Public — this is how a superadmin token is obtained in the first place.
superadminRoutes.post("/login", superadminLoginRateLimiter, asyncHandler(superadminLogin));

superadminRoutes.use(requireAuth, requireSuperadmin);

superadminRoutes.get("/dashboard", asyncHandler(getSuperadminDashboard));

superadminRoutes.get("/stores", asyncHandler(listSuperadminStores));
superadminRoutes.get("/stores/:id", asyncHandler(getSuperadminStore));
superadminRoutes.get("/stores/:id/orders", asyncHandler(getSuperadminStoreOrders));
superadminRoutes.get("/stores/:id/users", asyncHandler(getSuperadminStoreUsers));

superadminRoutes.get("/orders", asyncHandler(listSuperadminOrders));

superadminRoutes.post(
  "/stores/:id/backup",
  superadminDestructiveRateLimiter,
  asyncHandler(postSuperadminStoreBackup)
);
superadminRoutes.delete(
  "/stores/:id/orders",
  superadminDestructiveRateLimiter,
  asyncHandler(deleteSuperadminStoreOrders)
);
superadminRoutes.delete("/stores/:id", superadminDestructiveRateLimiter, asyncHandler(deleteSuperadminStore));
