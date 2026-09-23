import { supabaseAdmin } from "../config/supabase";
import { sanitizeSearchTerm } from "../utils/sanitizeSearchTerm";

export type Pagination = { page: number; pageSize: number };

function rangeFor({ page, pageSize }: Pagination): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

/** Idempotent — grants superadmin access to userId if it doesn't already have it. */
export async function ensureSuperadmin(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("superadmins").upsert({ user_id: userId }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function countStores() {
  const { count, error } = await supabaseAdmin.from("sellers").select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function countOrders() {
  const { count, error } = await supabaseAdmin.from("orders").select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function listStores(opts: { q?: string } & Pagination) {
  let query = supabaseAdmin
    .from("sellers")
    .select("id, name, slug, phone, whatsapp_number, is_accepting_orders, created_at", { count: "exact" });

  const term = opts.q ? sanitizeSearchTerm(opts.q) : "";
  if (term) {
    query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const [from, to] = rangeFor(opts);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;

  const sellerIds = (data ?? []).map((s) => s.id);
  const orderCounts = await countOrdersBySellerIds(sellerIds);

  return {
    data: (data ?? []).map((s) => ({ ...s, order_count: orderCounts[s.id] ?? 0 })),
    total: count ?? 0,
  };
}

async function countOrdersBySellerIds(sellerIds: string[]): Promise<Record<string, number>> {
  if (sellerIds.length === 0) return {};

  const { data, error } = await supabaseAdmin.from("orders").select("seller_id").in("seller_id", sellerIds);
  if (error) throw error;

  const tally: Record<string, number> = {};
  for (const row of data ?? []) {
    tally[row.seller_id] = (tally[row.seller_id] ?? 0) + 1;
  }
  return tally;
}

export async function findStoreById(id: string) {
  const { data, error } = await supabaseAdmin.from("sellers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listStoreOrders(sellerId: string, pagination: Pagination) {
  const [from, to] = rangeFor(pagination);
  const { data, error, count } = await supabaseAdmin
    .from("orders")
    .select("id, order_no, status, total_paise, created_at", { count: "exact" })
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function listStoreMembers(sellerId: string) {
  const { data, error } = await supabaseAdmin
    .from("seller_members")
    .select("user_id, role, created_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const members = data ?? [];
  const withPhones = await Promise.all(
    members.map(async (m) => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      return { ...m, phone: userData?.user?.phone ?? null };
    })
  );
  return withPhones;
}

export type SuperadminOrderFilters = {
  sellerId?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
};

export async function listAllOrders(filters: SuperadminOrderFilters & Pagination) {
  let query = supabaseAdmin
    .from("orders")
    .select("id, order_no, status, total_paise, created_at, seller:sellers(id, name, slug)", { count: "exact" });

  if (filters.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }
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

  const [from, to] = rangeFor(filters);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function findOrderIdsBySeller(sellerId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("orders").select("id").eq("seller_id", sellerId);
  if (error) throw error;
  return (data ?? []).map((o) => o.id);
}

export async function deleteStoreOrders(sellerId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("superadmin_delete_store_orders", { p_seller_id: sellerId });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function deleteStore(sellerId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc("superadmin_delete_store", { p_seller_id: sellerId });
  if (error) throw error;
}
