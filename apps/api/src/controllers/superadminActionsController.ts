import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { recordSuperadminAudit } from "../repositories/auditLogRepository";
import {
  deleteStore,
  deleteStoreOrders,
  findOrderIdsBySeller,
  findStoreById,
} from "../repositories/superadminRepository";
import { streamStoreBackup } from "../services/superadminBackupService";
import { purgeStoreStorage } from "../services/superadminStorageService";

function requireSuperadminUserId(req: Request) {
  if (!req.user) {
    throw new AppError(401, "unauthorized", "Missing superadmin session");
  }
  return req.user.id;
}

async function requireStore(id: string) {
  const store = await findStoreById(id);
  if (!store) {
    throw new AppError(404, "store_not_found", "No such store");
  }
  return store;
}

export async function postSuperadminStoreBackup(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const store = await requireStore(req.params.id);

  await streamStoreBackup(res, store);

  await recordSuperadminAudit({
    actorUserId,
    action: "backup_created",
    targetType: "store",
    targetId: store.id,
    sellerId: store.id,
  });
}

const deleteOrdersSchema = z.object({
  confirm: z.literal("DELETE ORDERS", { errorMap: () => ({ message: 'Type "DELETE ORDERS" to confirm' }) }),
});

export async function deleteSuperadminStoreOrders(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const store = await requireStore(req.params.id);
  deleteOrdersSchema.parse(req.body);

  const deletedCount = await deleteStoreOrders(store.id);

  await recordSuperadminAudit({
    actorUserId,
    action: "orders_deleted",
    targetType: "store",
    targetId: store.id,
    sellerId: store.id,
    metadata: { deletedCount },
  });

  res.json({ deletedCount });
}

export async function deleteSuperadminStore(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const store = await requireStore(req.params.id);

  const deleteStoreSchema = z.object({
    confirm: z.literal(`DELETE STORE ${store.slug}`, {
      errorMap: () => ({ message: `Type "DELETE STORE ${store.slug}" to confirm` }),
    }),
  });
  deleteStoreSchema.parse(req.body);

  const orderIds = await findOrderIdsBySeller(store.id);
  await deleteStore(store.id);

  // The DB delete already committed and can't be undone, so a storage
  // cleanup failure here is logged, not surfaced as a failed request — the
  // store is gone either way, and orphaned files can be swept up later.
  try {
    await purgeStoreStorage(store.id, orderIds);
  } catch (err) {
    console.error(`Failed to purge storage for deleted store ${store.id}:`, err);
  }

  await recordSuperadminAudit({
    actorUserId,
    action: "store_deleted",
    targetType: "store",
    targetId: store.id,
    metadata: { name: store.name, slug: store.slug },
  });

  res.json({ ok: true });
}
