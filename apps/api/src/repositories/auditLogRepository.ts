import { supabaseAdmin } from "../config/supabase";

export type SuperadminAuditAction = "store_viewed" | "backup_created" | "orders_deleted" | "store_deleted";

export async function recordSuperadminAudit(input: {
  actorUserId: string;
  action: SuperadminAuditAction;
  targetType: string;
  targetId?: string;
  sellerId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("superadmin_audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    seller_id: input.sellerId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
