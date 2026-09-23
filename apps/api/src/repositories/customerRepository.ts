import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../middleware/errors";

export async function ensureCustomer(id: string, phone: string | null) {
  if (!phone) {
    throw new AppError(400, "phone_required", "Your account has no phone number on file");
  }

  const { error } = await supabaseAdmin
    .from("customers")
    .upsert({ id, phone }, { onConflict: "id", ignoreDuplicates: true });

  if (error) throw error;
}

export async function updateCustomerName(id: string, name: string) {
  const { error } = await supabaseAdmin.from("customers").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function findCustomerById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
