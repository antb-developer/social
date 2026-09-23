-- Superadmin destructive operations, as single-statement functions so each
-- one runs as one atomic transaction (a single DML statement in Postgres
-- already is one — these just give the API a clean RPC to call instead of
-- composing the delete from the client, and a row count back in one round
-- trip). Both rely on the "on delete cascade" chains already set up in
-- 0001_init.sql:
--   orders.seller_id -> sellers(id)            (delete-store only)
--   order_items/order_messages/payment_proofs/order_status_history
--     .order_id -> orders(id)                  (both)
--   products/templates/seller_members/seller_order_counters.seller_id
--     -> sellers(id)                            (delete-store only)
-- customers are never touched by either: customers.id references auth.users,
-- not sellers, so they're never store-scoped.

create or replace function superadmin_delete_store_orders(p_seller_id uuid)
returns integer as $$
declare
  n integer;
begin
  delete from orders where seller_id = p_seller_id;
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql;

create or replace function superadmin_delete_store(p_seller_id uuid)
returns void as $$
begin
  delete from sellers where id = p_seller_id;
end;
$$ language plpgsql;

notify pgrst, 'reload schema';
