import { supabaseAdmin } from "../config/supabase";
import type { OrderStatus } from "../services/orderStatusService";
import type { PricedOrderItem } from "../services/orderTotalService";
import { sanitizeSearchTerm } from "../utils/sanitizeSearchTerm";

export async function createOrderWithItems(opts: {
  sellerId: string;
  customerId: string;
  address?: Record<string, unknown>;
  items: PricedOrderItem[];
  totalPaise: number;
}) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      seller_id: opts.sellerId,
      customer_id: opts.customerId,
      total_paise: opts.totalPaise,
      address: opts.address ?? null,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
    opts.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      name_snapshot: item.name_snapshot,
      price_snapshot_paise: item.price_snapshot_paise,
      qty: item.qty,
    }))
  );
  if (itemsError) throw itemsError;

  const { error: messageError } = await supabaseAdmin.from("order_messages").insert({
    order_id: order.id,
    sender: "system",
    kind: "status_change",
    payload: { body: `Order ${order.order_no} placed.` },
  });
  if (messageError) throw messageError;

  return order;
}

export async function findOrderById(id: string) {
  const { data, error } = await supabaseAdmin.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findOrderItems(orderId: string) {
  const { data, error } = await supabaseAdmin.from("order_items").select("*").eq("order_id", orderId);
  if (error) throw error;
  return data ?? [];
}

export async function findOrderMessages(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("order_messages")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findOrderStatusHistory(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertOrderMessage(input: {
  orderId: string;
  sender: "customer" | "seller" | "system";
  kind: string;
  payload: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin
    .from("order_messages")
    .insert({ order_id: input.orderId, sender: input.sender, kind: input.kind, payload: input.payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrderAddress(orderId: string, address: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("orders").update({ address }).eq("id", orderId);
  if (error) throw error;
}

export async function setProofUploaded(orderId: string, uploaded: boolean) {
  const { error } = await supabaseAdmin.from("orders").update({ proof_uploaded: uploaded }).eq("id", orderId);
  if (error) throw error;
}

export async function findOrdersByCustomer(customerId: string, status?: string) {
  let query = supabaseAdmin
    .from("orders")
    .select("*, seller:sellers(id, name, slug, logo_url)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function findOrdersBySeller(
  sellerId: string,
  filters: { status?: string; q?: string; from?: string; to?: string }
) {
  let query = supabaseAdmin.from("orders").select("*").eq("seller_id", sellerId);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  const term = filters.q ? sanitizeSearchTerm(filters.q) : "";
  if (term) {
    const orClauses = [`order_no.ilike.%${term}%`];

    const { data: matchingCustomers, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id")
      .or(`phone.ilike.%${term}%,name.ilike.%${term}%`);
    if (customerError) throw customerError;

    const customerIds = (matchingCustomers ?? []).map((c) => c.id);
    if (customerIds.length > 0) {
      orClauses.push(`customer_id.in.(${customerIds.join(",")})`);
    }

    query = query.or(orClauses.join(","));
  }

  if (filters.status === "pending_payment") {
    query = query.order("proof_uploaded", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabaseAdmin.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}

export async function insertOrderStatusHistory(input: {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  changedBy: string;
  note?: string;
}) {
  const { error } = await supabaseAdmin.from("order_status_history").insert({
    order_id: input.orderId,
    from_status: input.from,
    to_status: input.to,
    changed_by: input.changedBy,
    note: input.note ?? null,
  });
  if (error) throw error;
}
