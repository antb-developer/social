import { supabase } from "./supabaseClient";

export async function fetchCustomerProfile(userId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveCustomerName(userId: string, phone: string, name: string) {
  const { error } = await supabase.from("customers").upsert({ id: userId, phone, name }, { onConflict: "id" });
  if (error) throw error;
}
