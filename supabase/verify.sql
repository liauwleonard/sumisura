-- Sumisura — post-setup verification
-- Paste into Supabase → SQL Editor → Run. Read-only; changes nothing.

-- 1. Row Level Security must be ON for every table.
--    Any row showing false means that table's data is readable by any logged-in user of the
--    project. If so, re-run schema.sql.
select
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2. Every table must have policies. Zero policies + RLS on = nothing works;
--    zero policies + RLS off = everything leaks.
select
  tablename,
  count(*) as policy_count,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- 3. The new-user trigger must have given your account a shop.
--    Expect one row per user you created. If this is empty, the trigger did not fire and the
--    app will sign in successfully but show nothing, because every policy denies a user who
--    belongs to no shop.
select
  u.email,
  m.role,
  s.id   as shop_id,
  s.name as shop_name
from auth.users u
left join public.shop_members m on m.user_id = u.id
left join public.shops s        on s.id = m.shop_id
order by u.created_at;

-- 4. The trigger itself should exist.
select tgname as trigger_name
from pg_trigger
where tgname = 'on_auth_user_created';
