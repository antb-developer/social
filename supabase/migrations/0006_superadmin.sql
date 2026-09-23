-- Superadmin: platform staff who can see and manage every store, plus an
-- audit trail of what they did. Neither table has a client-facing use —
-- everything superadmin goes through the API (service role), so RLS is
-- enabled with no policies at all: same deny-all pattern as
-- seller_order_counters in 0002_rls.sql.

-- superadmins -----------------------------------------------------------------
-- Membership, not a role column: existence of a row for a user id is what
-- "is a superadmin" means. Kept separate from seller_members, which is
-- store-scoped, since a superadmin isn't tied to any one store.

create table superadmins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table superadmins enable row level security;

-- superadmin_audit_logs ---------------------------------------------------------
-- One row per sensitive superadmin action (store viewed, backup created,
-- orders deleted, store deleted, ...). seller_id is nullable because not
-- every action is scoped to a store (e.g. viewing the cross-store orders list).

create table superadmin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id),
  action text not null,
  target_type text not null,
  target_id text,
  seller_id uuid references sellers (id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index superadmin_audit_logs_created_at_idx on superadmin_audit_logs (created_at desc);
create index superadmin_audit_logs_seller_id_idx on superadmin_audit_logs (seller_id);
create index superadmin_audit_logs_actor_user_id_idx on superadmin_audit_logs (actor_user_id);

alter table superadmin_audit_logs enable row level security;

notify pgrst, 'reload schema';
