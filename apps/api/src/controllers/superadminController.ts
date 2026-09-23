import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { recordSuperadminAudit } from "../repositories/auditLogRepository";
import {
  countOrders,
  countStores,
  findStoreById,
  listAllOrders,
  listStoreMembers,
  listStoreOrders,
  listStores,
} from "../repositories/superadminRepository";
import { paginationSchema } from "../utils/pagination";

function requireSuperadminUserId(req: Request) {
  if (!req.user) {
    throw new AppError(401, "unauthorized", "Missing superadmin session");
  }
  return req.user.id;
}

export async function getSuperadminDashboard(req: Request, res: Response) {
  requireSuperadminUserId(req);
  const [storeCount, orderCount] = await Promise.all([countStores(), countOrders()]);
  res.json({ storeCount, orderCount });
}

const listStoresSchema = paginationSchema.extend({
  q: z.string().optional(),
});

export async function listSuperadminStores(req: Request, res: Response) {
  requireSuperadminUserId(req);
  const { page, pageSize, q } = listStoresSchema.parse(req.query);
  const result = await listStores({ page, pageSize, q });
  res.json({ ...result, page, pageSize });
}

export async function getSuperadminStore(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const store = await findStoreById(req.params.id);
  if (!store) {
    throw new AppError(404, "store_not_found", "No such store");
  }

  await recordSuperadminAudit({
    actorUserId,
    action: "store_viewed",
    targetType: "store",
    targetId: store.id,
    sellerId: store.id,
  });

  res.json(store);
}

export async function getSuperadminStoreOrders(req: Request, res: Response) {
  requireSuperadminUserId(req);
  const { page, pageSize } = paginationSchema.parse(req.query);

  const store = await findStoreById(req.params.id);
  if (!store) {
    throw new AppError(404, "store_not_found", "No such store");
  }

  const result = await listStoreOrders(store.id, { page, pageSize });
  res.json({ ...result, page, pageSize });
}

export async function getSuperadminStoreUsers(req: Request, res: Response) {
  requireSuperadminUserId(req);

  const store = await findStoreById(req.params.id);
  if (!store) {
    throw new AppError(404, "store_not_found", "No such store");
  }

  const members = await listStoreMembers(store.id);
  res.json(members);
}

const listOrdersSchema = paginationSchema.extend({
  sellerId: z.string().uuid().optional(),
  q: z.string().optional(),
  status: z.enum(["new", "pending_payment", "paid", "shipped", "delivered", "cancelled"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function listSuperadminOrders(req: Request, res: Response) {
  requireSuperadminUserId(req);
  const filters = listOrdersSchema.parse(req.query);
  const result = await listAllOrders(filters);
  res.json({ ...result, page: filters.page, pageSize: filters.pageSize });
}
