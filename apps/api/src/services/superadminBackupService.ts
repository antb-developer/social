import { ZipArchive, type ArchiverError } from "archiver";
import type { Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { findAllProductsBySeller } from "../repositories/productRepository";
import { findAllTemplatesBySeller } from "../repositories/templateRepository";

const PAYMENT_PROOF_BUCKET = "payment-proofs";

async function gatherOrdersData(sellerId: string) {
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: true });
  if (ordersError) throw ordersError;

  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) {
    return { orders: orders ?? [], orderItems: [], orderMessages: [], paymentProofs: [], statusHistory: [] };
  }

  const [itemsRes, messagesRes, proofsRes, historyRes] = await Promise.all([
    supabaseAdmin.from("order_items").select("*").in("order_id", orderIds),
    supabaseAdmin.from("order_messages").select("*").in("order_id", orderIds).order("created_at", { ascending: true }),
    supabaseAdmin.from("payment_proofs").select("*").in("order_id", orderIds),
    supabaseAdmin.from("order_status_history").select("*").in("order_id", orderIds).order("created_at", { ascending: true }),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (proofsRes.error) throw proofsRes.error;
  if (historyRes.error) throw historyRes.error;

  // The bucket is private, so the raw storage path in image_url is useless
  // outside the API; replace it with a short-lived signed URL for anyone
  // reading the export, without exposing the file directly some other way.
  const paymentProofs = await Promise.all(
    (proofsRes.data ?? []).map(async (proof) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(PAYMENT_PROOF_BUCKET)
        .createSignedUrl(proof.image_url, 3600);
      return { ...proof, signed_url: signed?.signedUrl ?? null };
    })
  );

  return {
    orders: orders ?? [],
    orderItems: itemsRes.data ?? [],
    orderMessages: messagesRes.data ?? [],
    paymentProofs,
    statusHistory: historyRes.data ?? [],
  };
}

async function gatherCustomersData(orders: Array<{ customer_id: string }>) {
  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  if (customerIds.length === 0) return [];

  const { data, error } = await supabaseAdmin.from("customers").select("*").in("id", customerIds);
  if (error) throw error;
  return data ?? [];
}

async function gatherMembersData(sellerId: string) {
  const { data, error } = await supabaseAdmin
    .from("seller_members")
    .select("user_id, role, created_at")
    .eq("seller_id", sellerId);
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (m) => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      return { ...m, phone: userData?.user?.phone ?? null };
    })
  );
}

/** Streams a store-backup ZIP (one JSON file per table) straight into the response. */
export async function streamStoreBackup(res: Response, store: { id: string; name: string; slug: string }) {
  const [members, products, templates, ordersData] = await Promise.all([
    gatherMembersData(store.id),
    findAllProductsBySeller(store.id),
    findAllTemplatesBySeller(store.id),
    gatherOrdersData(store.id),
  ]);
  const customers = await gatherCustomersData(ordersData.orders);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `store-backup-${store.slug}-${dateStamp}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", (err: ArchiverError) => {
    throw err;
  });
  archive.pipe(res);

  archive.append(JSON.stringify(store, null, 2), { name: "store.json" });
  archive.append(JSON.stringify(members, null, 2), { name: "members.json" });
  archive.append(JSON.stringify(products, null, 2), { name: "products.json" });
  archive.append(JSON.stringify(templates, null, 2), { name: "templates.json" });
  archive.append(JSON.stringify(customers, null, 2), { name: "customers.json" });
  archive.append(JSON.stringify(ordersData.orders, null, 2), { name: "orders.json" });
  archive.append(JSON.stringify(ordersData.orderItems, null, 2), { name: "order_items.json" });
  archive.append(JSON.stringify(ordersData.orderMessages, null, 2), { name: "order_messages.json" });
  archive.append(JSON.stringify(ordersData.paymentProofs, null, 2), { name: "payment_proofs.json" });
  archive.append(JSON.stringify(ordersData.statusHistory, null, 2), { name: "order_status_history.json" });

  await archive.finalize();
}
