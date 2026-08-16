-- Sumisura — Supabase schema and security rules
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- It is safe to re-run: every statement is guarded.
--
-- Design notes:
--  * Timestamps are epoch milliseconds (bigint), matching the local Dexie records exactly.
--    Converting to timestamptz here would mean two representations of "when" and a class of
--    off-by-timezone sync bugs. The database is a mirror, not a second source of truth.
--  * Nested structures (items, measurements, payments) stay as jsonb so a row round-trips to
--    the local model without reassembly.
--  * Nothing is ever hard-deleted. deleted_at is set instead, so a delete can sync like any
--    other edit rather than silently reappearing from another device.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.shops (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'My Shop',
  created_at bigint not null
);

-- Membership is what makes "add an assistant later" a row insert rather than a migration.
create table if not exists public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role    text not null default 'owner',
  primary key (shop_id, user_id)
);

create table if not exists public.customers (
  id         uuid primary key,
  shop_id    uuid not null references public.shops (id) on delete cascade,
  code       text,
  name       text not null,
  phone      text,
  address    text,
  notes      text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table if not exists public.orders (
  id                 uuid primary key,
  shop_id            uuid not null references public.shops (id) on delete cascade,
  customer_id        uuid not null,
  number             integer not null,
  type               text not null,
  status             text not null,
  items              jsonb not null default '[]'::jsonb,
  measurements       jsonb not null default '{}'::jsonb,
  measurement_source jsonb not null default '{}'::jsonb,
  posture            jsonb not null default '[]'::jsonb,
  posture_notes      text,
  material           jsonb not null default '{}'::jsonb,
  price              numeric not null default 0,
  payments           jsonb not null default '[]'::jsonb,
  due_date           bigint,
  notes              text,
  created_at         bigint not null,
  updated_at         bigint not null,
  deleted_at         bigint
);

-- Append-only. There is no update or delete policy for this table further down, on purpose:
-- an audit trail that can be quietly rewritten is not an audit trail.
create table if not exists public.change_log (
  id          uuid primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  order_id    uuid,
  customer_id uuid,
  section     text not null,
  field       text not null,
  old_value   text,
  new_value   text,
  reason      text,
  at          bigint not null,
  by          text not null
);

-- Sync pulls "everything in my shop changed since X", so index exactly that.
create index if not exists customers_shop_updated_idx on public.customers (shop_id, updated_at);
create index if not exists orders_shop_updated_idx    on public.orders (shop_id, updated_at);
create index if not exists change_log_shop_at_idx     on public.change_log (shop_id, at);
create index if not exists orders_customer_idx        on public.orders (customer_id);

-- ---------------------------------------------------------------------------
-- Membership check
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so this function can read shop_members without being subject to
-- shop_members' own RLS policy — otherwise the policy would call the function, which would
-- query the table, which would evaluate the policy again, and Postgres would error out on
-- infinite recursion.
create or replace function public.is_shop_member(target_shop uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.shop_members
    where shop_id = target_shop
      and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- This is the whole privacy model. With RLS enabled and no matching policy, a query returns
-- zero rows — the safe default. Every policy below is scoped to the caller's shop, and it is
-- enforced by Postgres, so it cannot be bypassed from the browser.
-- ---------------------------------------------------------------------------

alter table public.shops        enable row level security;
alter table public.shop_members enable row level security;
alter table public.customers    enable row level security;
alter table public.orders       enable row level security;
alter table public.change_log   enable row level security;

-- shops
drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops
  for select using (public.is_shop_member(id));

drop policy if exists shops_update on public.shops;
create policy shops_update on public.shops
  for update using (public.is_shop_member(id))
  with check (public.is_shop_member(id));

-- shop_members: read your own rows only. Deliberately does not use is_shop_member() —
-- a plain user_id comparison keeps this policy free of any recursion risk.
drop policy if exists shop_members_select on public.shop_members;
create policy shop_members_select on public.shop_members
  for select using (user_id = auth.uid());

-- customers
drop policy if exists customers_all on public.customers;
create policy customers_all on public.customers
  for all using (public.is_shop_member(shop_id))
  with check (public.is_shop_member(shop_id));

-- orders
drop policy if exists orders_all on public.orders;
create policy orders_all on public.orders
  for all using (public.is_shop_member(shop_id))
  with check (public.is_shop_member(shop_id));

-- change_log: readable and appendable, never updatable or deletable.
drop policy if exists change_log_select on public.change_log;
create policy change_log_select on public.change_log
  for select using (public.is_shop_member(shop_id));

drop policy if exists change_log_insert on public.change_log;
create policy change_log_insert on public.change_log
  for insert with check (public.is_shop_member(shop_id));

-- ---------------------------------------------------------------------------
-- Give every new account its own shop
-- ---------------------------------------------------------------------------

-- Without this, a tailor signing in for the first time would have an account but belong to no
-- shop, so every policy above would deny them and the app would look empty and broken.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_shop uuid;
begin
  insert into public.shops (name, created_at)
  values ('My Shop', (extract(epoch from now()) * 1000)::bigint)
  returning id into new_shop;

  insert into public.shop_members (shop_id, user_id, role)
  values (new_shop, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
