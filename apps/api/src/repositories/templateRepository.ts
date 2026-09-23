import { supabaseAdmin } from "../config/supabase";

export type TemplateFieldInput = {
  key: string;
  label: string;
  type: "text" | "textarea" | "phone" | "pincode" | "select";
  options?: string[];
  required?: boolean;
};

export type TemplateInput = {
  kind: "text" | "payment_request" | "form_request";
  title: string;
  body?: string;
  fields?: TemplateFieldInput[];
};

export async function findAllTemplatesBySeller(sellerId: string) {
  const { data, error } = await supabaseAdmin
    .from("templates")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(sellerId: string, input: TemplateInput) {
  const { data, error } = await supabaseAdmin
    .from("templates")
    .insert({ seller_id: sellerId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplateForSeller(sellerId: string, id: string, patch: Partial<TemplateInput>) {
  const { data, error } = await supabaseAdmin
    .from("templates")
    .update(patch)
    .eq("id", id)
    .eq("seller_id", sellerId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteTemplateForSeller(sellerId: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("seller_id", sellerId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
