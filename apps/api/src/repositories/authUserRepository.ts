import { supabaseAdmin } from "../config/supabase";

export async function findOrCreateAuthUserByPhone(phone: string): Promise<string> {
  const normalized = phone.replace(/^\+/, "");
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list.users.find((u) => u.phone === normalized || u.phone === phone);
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    phone: normalized,
    phone_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

export async function findAuthUserPhoneById(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.phone ?? null;
}
