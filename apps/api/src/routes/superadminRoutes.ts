import { Router } from "express";
import {
  deleteSuperadminCustomer,
  deleteSuperadminCustomerOrders,
  deleteSuperadminCustomersByIds,
  deleteSuperadminOrdersByIds,
  deleteSuperadminStore,
  deleteSuperadminStoreMembers,
  deleteSuperadminStoreOrders,
  deleteSuperadminStoresByIds,
  postSuperadminStoreBackup,
} from "../controllers/superadminActionsController";
import { superadminLogin } from "../controllers/superadminAuthController";
import {
  getSuperadminCustomer,
  getSuperadminCustomerOrders,
  getSuperadminDashboard,
  getSuperadminOrderDetail,
  getSuperadminStore,
  getSuperadminStoreOrders,
  getSuperadminStoreUsers,
  listSuperadminCustomers,
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
superadminRoutes.delete("/stores", superadminDestructiveRateLimiter, asyncHandler(deleteSuperadminStoresByIds));
superadminRoutes.get("/stores/:id", asyncHandler(getSuperadminStore));
superadminRoutes.get("/stores/:id/orders", asyncHandler(getSuperadminStoreOrders));
superadminRoutes.get("/stores/:id/users", asyncHandler(getSuperadminStoreUsers));
superadminRoutes.delete(
  "/stores/:id/members",
  superadminDestructiveRateLimiter,
  asyncHandler(deleteSuperadminStoreMembers)
);

superadminRoutes.get("/orders", asyncHandler(listSuperadminOrders));
superadminRoutes.delete("/orders", superadminDestructiveRateLimiter, asyncHandler(deleteSuperadminOrdersByIds));
superadminRoutes.get("/orders/:id", asyncHandler(getSuperadminOrderDetail));

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

superadminRoutes.get("/customers", asyncHandler(listSuperadminCustomers));
superadminRoutes.delete(
  "/customers",
  superadminDestructiveRateLimiter,
  asyncHandler(deleteSuperadminCustomersByIds)
);
superadminRoutes.get("/customers/:id", asyncHandler(getSuperadminCustomer));
superadminRoutes.get("/customers/:id/orders", asyncHandler(getSuperadminCustomerOrders));
superadminRoutes.delete(
  "/customers/:id/orders",
  superadminDestructiveRateLimiter,
  asyncHandler(deleteSuperadminCustomerOrders)
);
superadminRoutes.delete(
  "/customers/:id",
  superadminDestructiveRateLimiter,
  asyncHandler(deleteSuperadminCustomer)
);
