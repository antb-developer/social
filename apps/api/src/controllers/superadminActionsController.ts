import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errors";
import { recordSuperadminAudit } from "../repositories/auditLogRepository";
import {
  countOwners,
  deleteCustomer,
  deleteCustomerOrders,
  deleteOrdersByIds,
  deleteStore,
  deleteStoreMembers,
  deleteStoreOrders,
  findCustomerById,
  findOrderIdsByCustomer,
  findOrderIdsBySeller,
  findStoreById,
  listStoreMembers,
} from "../repositories/superadminRepository";
import { streamStoreBackup } from "../services/superadminBackupService";
import { purgeOrderProofs, purgeStoreStorage } from "../services/superadminStorageService";

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

async function requireCustomer(id: string) {
  const customer = await findCustomerById(id);
  if (!customer) {
    throw new AppError(404, "customer_not_found", "No such customer");
  }
  return customer;
}

export async function deleteSuperadminCustomerOrders(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const customer = await requireCustomer(req.params.id);
  deleteOrdersSchema.parse(req.body);

  const orderIds = await findOrderIdsByCustomer(customer.id);
  const deletedCount = await deleteCustomerOrders(customer.id);

  try {
    await purgeOrderProofs(orderIds);
  } catch (err) {
    console.error(`Failed to purge proofs for customer ${customer.id}:`, err);
  }

  await recordSuperadminAudit({
    actorUserId,
    action: "customer_orders_deleted",
    targetType: "customer",
    targetId: customer.id,
    metadata: { deletedCount },
  });

  res.json({ deletedCount });
}

export async function deleteSuperadminCustomer(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const customer = await requireCustomer(req.params.id);

  const deleteCustomerSchema = z.object({
    confirm: z.literal(`DELETE CUSTOMER ${customer.phone}`, {
      errorMap: () => ({ message: `Type "DELETE CUSTOMER ${customer.phone}" to confirm` }),
    }),
  });
  deleteCustomerSchema.parse(req.body);

  const orderIds = await findOrderIdsByCustomer(customer.id);
  await deleteCustomer(customer.id);

  try {
    await purgeOrderProofs(orderIds);
  } catch (err) {
    console.error(`Failed to purge proofs for deleted customer ${customer.id}:`, err);
  }

  await recordSuperadminAudit({
    actorUserId,
    action: "customer_deleted",
    targetType: "customer",
    targetId: customer.id,
    metadata: { name: customer.name, phone: customer.phone, orderCount: orderIds.length },
  });

  res.json({ ok: true });
}

const idsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one row").max(200),
});

/** Deletes specific orders (from any seller/customer) picked via row selection. */
export async function deleteSuperadminOrdersByIds(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const { ids } = idsSchema.parse(req.body);

  const deletedCount = await deleteOrdersByIds(ids);

  try {
    await purgeOrderProofs(ids);
  } catch (err) {
    console.error(`Failed to purge proofs for deleted orders ${ids.join(",")}:`, err);
  }

  await recordSuperadminAudit({
    actorUserId,
    action: "orders_deleted",
    targetType: "order",
    metadata: { ids, deletedCount },
  });

  res.json({ deletedCount });
}

/** Deletes whole stores picked via row selection, one at a time so each keeps its own audit entry. */
export async function deleteSuperadminStoresByIds(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const { ids } = idsSchema.parse(req.body);

  let deletedCount = 0;
  for (const storeId of ids) {
    const store = await findStoreById(storeId);
    if (!store) continue;

    const orderIds = await findOrderIdsBySeller(store.id);
    await deleteStore(store.id);
    deletedCount += 1;

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
  }

  res.json({ deletedCount });
}

/** Deletes whole customers (and their orders, via cascade) picked via row selection. */
export async function deleteSuperadminCustomersByIds(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const { ids } = idsSchema.parse(req.body);

  let deletedCount = 0;
  for (const customerId of ids) {
    const customer = await findCustomerById(customerId);
    if (!customer) continue;

    const orderIds = await findOrderIdsByCustomer(customer.id);
    await deleteCustomer(customer.id);
    deletedCount += 1;

    try {
      await purgeOrderProofs(orderIds);
    } catch (err) {
      console.error(`Failed to purge proofs for deleted customer ${customer.id}:`, err);
    }

    await recordSuperadminAudit({
      actorUserId,
      action: "customer_deleted",
      targetType: "customer",
      targetId: customer.id,
      metadata: { name: customer.name, phone: customer.phone, orderCount: orderIds.length },
    });
  }

  res.json({ deletedCount });
}

const memberIdsSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Select at least one member").max(200),
});

/** Removes members from a store, refusing to leave the store with zero owners. */
export async function deleteSuperadminStoreMembers(req: Request, res: Response) {
  const actorUserId = requireSuperadminUserId(req);
  const store = await requireStore(req.params.id);
  const { userIds } = memberIdsSchema.parse(req.body);

  const [members, ownerCount] = await Promise.all([listStoreMembers(store.id), countOwners(store.id)]);

  const ownersBeingRemoved = members.filter((m) => userIds.includes(m.user_id) && m.role === "owner").length;
  if (ownersBeingRemoved >= ownerCount) {
    throw new AppError(400, "cannot_remove_all_owners", "A store must keep at least one owner");
  }

  const deletedCount = await deleteStoreMembers(store.id, userIds);

  await recordSuperadminAudit({
    actorUserId,
    action: "member_removed",
    targetType: "store_member",
    targetId: store.id,
    sellerId: store.id,
    metadata: { userIds, deletedCount },
  });

  res.json({ deletedCount });
}
