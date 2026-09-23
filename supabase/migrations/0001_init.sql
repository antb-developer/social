-- Seller Order Desk: initial schema
create extension if not exists pgcrypto;

create type order_status as enum (
  'new',
  'pending_payment',
  'paid',
  'shipped',
  'delivered',
  'cancelled'
);

-- sellers -------------------------------------------------------------

create table sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone text not null,
  whatsapp_number text,
  upi_id text,
  upi_name text,
  logo_url text,
  is_accepting_orders boolean not null default true,
  created_at timestamptz not null default now()
);

create table seller_members (
  seller_id uuid not null references sellers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (seller_id, user_id)
);

-- per-seller counter backing human-readable order numbers
create table seller_order_counters (
  seller_id uuid primary key references sellers (id) on delete cascade,
  next_no integer not null default 1000
);

-- products --------------------------------------------------------------

create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  name text not null,
  description text,
  price_paise integer not null check (price_paise >= 0),
  images text[] not null default '{}',
  in_stock boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index products_seller_id_idx on products (seller_id);

-- customers ---------------------------------------------------------------

create table customers (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique,
  name text,
  created_at timestamptz not null default now()
);

-- orders ------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  seller_id uuid not null references sellers (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  status order_status not null default 'new',
  total_paise integer not null default 0 check (total_paise >= 0),
  address jsonb,
  proof_uploaded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, order_no)
);

create index orders_seller_id_status_idx on orders (seller_id, status);
create index orders_customer_id_idx on orders (customer_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  name_snapshot text not null,
  price_snapshot_paise integer not null check (price_snapshot_paise >= 0),
  qty integer not null check (qty > 0)
);

create index order_items_order_id_idx on order_items (order_id);

-- templates -----------------------------------------------------------------

create table templates (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers (id) on delete cascade,
  kind text not null check (kind in ('text', 'payment_request', 'form_request')),
  title text not null,
  body text,
  fields jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index templates_seller_id_idx on templates (seller_id);

-- order thread --------------------------------------------------------------

create table order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  sender text not null check (sender in ('seller', 'customer', 'system')),
  kind text not null check (
    kind in (
      'text',
      'payment_request',
      'form_request',
      'form_response',
      'payment_proof',
      'status_change'
    )
  ),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index order_messages_order_id_created_at_idx on order_messages (order_id, created_at);

create table payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  image_url text not null,
  utr text not null,
  amount_paise integer not null check (amount_paise >= 0),
  review text not null default 'pending' check (review in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index payment_proofs_order_id_idx on payment_proofs (order_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  changed_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);

create index order_status_history_order_id_idx on order_status_history (order_id);

-- push notifications ----------------------------------------------------------

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions (user_id);

-- triggers ----------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function set_updated_at();

-- assigns a human-readable order_no ("ORD-1024") scoped to the seller
create or replace function assign_order_no()
returns trigger as $$
declare
  n integer;
begin
  if new.order_no is not null then
    return new;
  end if;

  insert into seller_order_counters (seller_id)
  values (new.seller_id)
  on conflict (seller_id) do nothing;

  update seller_order_counters
  set next_no = next_no + 1
  where seller_id = new.seller_id
  returning next_no - 1 into n;

  new.order_no = 'ORD-' || n;
  return new;
end;
$$ language plpgsql;

create trigger orders_assign_order_no
  before insert on orders
  for each row
  execute function assign_order_no();
