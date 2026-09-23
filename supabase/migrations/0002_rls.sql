-- Seller Order Desk: Row Level Security
-- The Express API (service role) bypasses RLS for authoritative writes.
-- These policies govern what customers/sellers can see and do when
-- talking to Supabase directly (Realtime subscriptions, Storage-adjacent
-- reads), so anon/customer/seller sessions never see or touch rows
-- outside what they're entitled to.

create or replace function is_seller_member(target_seller_id uuid)
returns boolean as $$
  select exists (
    select 1
    from seller_members sm
    where sm.seller_id = target_seller_id
      and sm.user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create or replace function is_order_participant(target_order_id uuid)
returns boolean as $$
  select exists (
    select 1
    from orders o
    where o.id = target_order_id
      and (o.customer_id = auth.uid() or is_seller_member(o.seller_id))
  );
$$ language sql stable security definer set search_path = public;

-- sellers ---------------------------------------------------------------

alter table sellers enable row level security;

create policy sellers_public_read on sellers
  for select
  using (true);

create policy sellers_member_update on sellers
  for update
  using (is_seller_member(id));

-- seller_members ----------------------------------------------------------

alter table seller_members enable row level security;

create policy seller_members_read on seller_members
  for select
  using (is_seller_member(seller_id));

create policy seller_members_owner_write on seller_members
  for all
  using (
    exists (
      select 1 from seller_members sm
      where sm.seller_id = seller_members.seller_id
        and sm.user_id = auth.uid()
        and sm.role = 'owner'
    )
  );

-- products ------------------------------------------------------------------

alter table products enable row level security;

create policy products_public_read on products
  for select
  using (is_active = true or is_seller_member(seller_id));

create policy products_member_write on products
  for insert
  with check (is_seller_member(seller_id));

create policy products_member_update on products
  for update
  using (is_seller_member(seller_id));

create policy products_member_delete on products
  for delete
  using (is_seller_member(seller_id));

-- customers -----------------------------------------------------------------

alter table customers enable row level security;

create policy customers_self_read on customers
  for select
  using (id = auth.uid());

create policy customers_self_insert on customers
  for insert
  with check (id = auth.uid());

create policy customers_self_update on customers
  for update
  using (id = auth.uid());

-- orders ----------------------------------------------------------------

alter table orders enable row level security;

create policy orders_participant_read on orders
  for select
  using (customer_id = auth.uid() or is_seller_member(seller_id));

create policy orders_customer_insert on orders
  for insert
  with check (customer_id = auth.uid());

create policy orders_seller_update on orders
  for update
  using (is_seller_member(seller_id));

-- order_items -------------------------------------------------------------

alter table order_items enable row level security;

create policy order_items_participant_read on order_items
  for select
  using (is_order_participant(order_id));

create policy order_items_customer_insert on order_items
  for insert
  with check (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.customer_id = auth.uid()
    )
  );

-- templates -----------------------------------------------------------------

alter table templates enable row level security;

create policy templates_member_all on templates
  for all
  using (is_seller_member(seller_id));

-- order_messages --------------------------------------------------------

alter table order_messages enable row level security;

create policy order_messages_participant_read on order_messages
  for select
  using (is_order_participant(order_id));

create policy order_messages_customer_insert on order_messages
  for insert
  with check (
    sender = 'customer'
    and exists (
      select 1 from orders o
      where o.id = order_messages.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy order_messages_seller_insert on order_messages
  for insert
  with check (
    sender = 'seller'
    and exists (
      select 1 from orders o
      where o.id = order_messages.order_id
        and is_seller_member(o.seller_id)
    )
  );

-- payment_proofs ------------------------------------------------------------

alter table payment_proofs enable row level security;

create policy payment_proofs_participant_read on payment_proofs
  for select
  using (is_order_participant(order_id));

create policy payment_proofs_customer_insert on payment_proofs
  for insert
  with check (
    exists (
      select 1 from orders o
      where o.id = payment_proofs.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy payment_proofs_seller_review on payment_proofs
  for update
  using (
    exists (
      select 1 from orders o
      where o.id = payment_proofs.order_id
        and is_seller_member(o.seller_id)
    )
  );

-- order_status_history -------------------------------------------------------

alter table order_status_history enable row level security;

create policy order_status_history_participant_read on order_status_history
  for select
  using (is_order_participant(order_id));

-- push_subscriptions ----------------------------------------------------------

alter table push_subscriptions enable row level security;

create policy push_subscriptions_self_all on push_subscriptions
  for all
  using (user_id = auth.uid());

-- seller_order_counters -------------------------------------------------------
-- internal bookkeeping only; no client access, service role bypasses RLS.

alter table seller_order_counters enable row level security;
