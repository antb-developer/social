import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../middleware/errors";

export async function findSellerBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("id, name, slug, description, address, whatsapp_number, upi_id, upi_name, logo_url, is_accepting_orders")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findSellerById(id: string) {
  const { data, error } = await supabaseAdmin.from("sellers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export type SellerSettingsInput = Partial<{
  name: string;
  slug: string;
  description: string;
  address: string;
  whatsapp_number: string;
  upi_id: string;
  upi_name: string;
  logo_url: string;
  is_accepting_orders: boolean;
}>;

export async function updateSeller(sellerId: string, patch: SellerSettingsInput) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .update(patch)
    .eq("id", sellerId)
    .select()
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new AppError(409, "slug_taken", "That store link is already taken");
    }
    throw error;
  }
  return data;
}

export async function addSellerMember(sellerId: string, userId: string, role: "owner" | "staff") {
  const { data, error } = await supabaseAdmin
    .from("seller_members")
    .upsert({ seller_id: sellerId, user_id: userId, role }, { onConflict: "seller_id,user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createSeller(input: { name: string; slug: string; phone: string }) {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .insert({ name: input.name, slug: input.slug, phone: input.phone })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new AppError(409, "slug_taken", "That store link is already taken");
    }
    throw error;
  }
  return data;
}

export async function findMembersForSeller(sellerId: string) {
  const { data, error } = await supabaseAdmin
    .from("seller_members")
    .select("user_id, role, created_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findMembershipForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("seller_members")
    .select("seller_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
