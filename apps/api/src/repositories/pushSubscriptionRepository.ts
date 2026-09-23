import { supabaseAdmin } from "../config/supabase";

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  keys: Record<string, string>;
}) {
  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert({ user_id: input.userId, endpoint: input.endpoint, keys: input.keys }, { onConflict: "endpoint" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findSubscriptionsForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, keys")
    .in("user_id", userIds);
  if (error) throw error;
  return data ?? [];
}

export async function deleteSubscriptionByEndpoint(endpoint: string) {
  const { error } = await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
