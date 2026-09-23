import { supabaseAdmin } from "../config/supabase";
import type { ProductRecord } from "../services/orderTotalService";

export async function findActiveProductsBySeller(sellerId: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, description, price_paise, images, in_stock, is_active, sort_order")
    .eq("seller_id", sellerId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function findProductsByIds(sellerId: string, ids: string[]): Promise<ProductRecord[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, price_paise, in_stock, is_active")
    .eq("seller_id", sellerId)
    .in("id", ids);

  if (error) throw error;
  return data ?? [];
}

export type ProductInput = {
  name: string;
  description?: string;
  price_paise: number;
  images?: string[];
  in_stock?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

export async function findAllProductsBySeller(sellerId: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createProduct(sellerId: string, input: ProductInput) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({ seller_id: sellerId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProductForSeller(sellerId: string, id: string, patch: Partial<ProductInput>) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("seller_id", sellerId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteProductForSeller(sellerId: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", id)
    .eq("seller_id", sellerId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function reorderProducts(sellerId: string, order: Array<{ id: string; sort_order: number }>) {
  await Promise.all(
    order.map(({ id, sort_order }) =>
      supabaseAdmin.from("products").update({ sort_order }).eq("id", id).eq("seller_id", sellerId)
    )
  );
}
