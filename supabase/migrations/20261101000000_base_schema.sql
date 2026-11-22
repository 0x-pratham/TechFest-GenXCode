-- =====================================================================
-- Base schema for the GenXCode Tech Fest platform.
--
-- Every later migration assumes these objects already exist (profiles,
-- registrations, payments, problem_statements, ...) but none of them was ever
-- created in version control, so a fresh database could not run the chain.
-- This file is timestamped BEFORE all other migrations on purpose.
--
-- Fresh project:    `supabase db push` applies it first.
-- Existing project: the tables already exist there. Do NOT re-run this file;
--                   mark it applied instead:
--                   supabase migration repair --status applied 20261101000000
--
-- Everything is idempotent (IF NOT EXISTS / DROP ... IF EXISTS) so a re-run
-- is harmless apart from the REVOKE/GRANT statements, which re-tighten access.
--
-- Promote an admin or volunteer manually (there is no self-service path):
--   update public.profiles set role = 'admin' where lower(email) = lower('you@example.com');
-- =====================================================================

create sequence if not exists public.application_number_seq;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user (id = auth.users.id)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  name text,                       -- kept in sync with full_name (see identity migration)
  phone text,
  college text,
  branch text,
  study_year text,
  city text,
  github_url text,
  linkedin_url text,
  role text not null default 'participant'
    check (role in ('participant', 'volunteer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_staff_role_idx on public.profiles (role) where role <> 'participant';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Admin check used by RLS policies. SECURITY DEFINER so a policy on
-- public.profiles can call it without recursing into its own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Create a profile automatically when someone signs up (email or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill users that signed up before the trigger existed.
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- registrations: one hackathon application per participant
-- Rows are created only by public.submit_hackathon_registration().
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_code text not null unique,
  application_number text unique,            -- e.g. GXC26-0001
  registration_type text not null default 'individual'
    check (registration_type in ('individual', 'team')),
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  base_fee_paise integer not null default 0 check (base_fee_paise >= 0),
  coupon_discount_paise integer not null default 0 check (coupon_discount_paise >= 0),
  amount_due_paise integer not null default 0 check (amount_due_paise >= 0),
  hack2skill_registered boolean not null default false,
  hack2skill_confirmed_at timestamptz,
  name text,                                  -- identity snapshot (filled by trigger)
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists registrations_created_by_idx on public.registrations (created_by);
create index if not exists registrations_email_lower_idx on public.registrations (lower(email));
create index if not exists registrations_status_idx on public.registrations (status);

-- Hard guarantee behind the RPC's advisory lock: at most one live application
-- per user. Skipped (not failed) if legacy data already contains duplicates.
do $$
begin
  if not exists (
    select 1 from public.registrations
    where status <> 'cancelled' and created_by is not null
    group by created_by having count(*) > 1
  ) then
    create unique index if not exists registrations_one_active_per_user_idx
      on public.registrations (created_by) where status <> 'cancelled';
  else
    raise notice 'registrations_one_active_per_user_idx skipped: duplicate active registrations exist';
  end if;
end
$$;

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- payments: historical Razorpay payments (registration is free now).
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists payments_registration_idx on public.payments (registration_id);

-- ---------------------------------------------------------------------
-- problem_statements (hackathon tracks) and the participant's selection
-- ---------------------------------------------------------------------
create table if not exists public.problem_statements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  summary text not null,
  domain text,
  difficulty text,
  max_slots integer check (max_slots is null or max_slots >= 0),
  filled_slots integer not null default 0 check (filled_slots >= 0),
  display_order integer not null default 0,
  is_active boolean not null default true,
  name text,                                  -- optional owner/contact (admin-managed)
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists problem_statements_active_order_idx
  on public.problem_statements (is_active, display_order);

drop trigger if exists problem_statements_set_updated_at on public.problem_statements;
create trigger problem_statements_set_updated_at
before update on public.problem_statements
for each row execute function public.set_updated_at();

create table if not exists public.registration_problem_statements (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  problem_statement_id uuid not null references public.problem_statements(id) on delete restrict,
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists registration_problem_statements_problem_idx
  on public.registration_problem_statements (problem_statement_id);

-- ---------------------------------------------------------------------
-- Legacy tables. Not used by the app code today, but the identity-fields
-- migration alters them, so they must exist. Locked down (no policies).
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_paise integer not null default 0 check (discount_paise >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  redeemed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.seat_assignments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  seat_label text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Hack2Skill confirmation (self-attested gate on the dashboard)
-- ---------------------------------------------------------------------
create or replace function public.confirm_hack2skill_registration()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  select r.id into v_registration_id
  from public.registrations r
  where r.created_by = auth.uid() and r.status <> 'cancelled'
  order by r.created_at desc
  limit 1;

  if v_registration_id is null then
    return false;
  end if;

  update public.registrations
  set hack2skill_registered = true,
      hack2skill_confirmed_at = coalesce(hack2skill_confirmed_at, now())
  where id = v_registration_id;

  return true;
end;
$$;
revoke all on function public.confirm_hack2skill_registration() from public, anon;
grant execute on function public.confirm_hack2skill_registration() to authenticated;

-- ---------------------------------------------------------------------
-- Row level security
-- Supabase grants ALL on new public tables to anon/authenticated by default,
-- so each table is revoked first and then re-granted narrowly.
-- ---------------------------------------------------------------------

-- profiles: read own (admins read all); users may edit their own profile
-- fields but never role/email (column-level grant).
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, name, phone, college, branch, study_year, city, github_url, linkedin_url, updated_at)
  on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- registrations: read own (matched by creator or verified email) or all as
-- admin. The only client-side write is the Hack2Skill confirmation flag.
alter table public.registrations enable row level security;
revoke all on public.registrations from anon, authenticated;
grant select on public.registrations to authenticated;
grant update (hack2skill_registered, hack2skill_confirmed_at) on public.registrations to authenticated;

drop policy if exists registrations_select_own on public.registrations;
create policy registrations_select_own on public.registrations
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or (email is not null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  );
drop policy if exists registrations_select_admin on public.registrations;
create policy registrations_select_admin on public.registrations
  for select to authenticated using (public.is_admin());
drop policy if exists registrations_update_own_hack2skill on public.registrations;
create policy registrations_update_own_hack2skill on public.registrations
  for update to authenticated
  using (
    created_by = (select auth.uid())
    or (email is not null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  )
  with check (
    created_by = (select auth.uid())
    or (email is not null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  );

-- payments: read-only history for the owner and admins.
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.registrations r
    where r.id = registration_id and r.created_by = (select auth.uid())
  ));
drop policy if exists payments_select_admin on public.payments;
create policy payments_select_admin on public.payments
  for select to authenticated using (public.is_admin());

-- problem_statements: the public landing page reads active tracks as `anon`.
-- anon only gets the public columns (no owner contact details). Admin
-- read/write policies are added in 20261105223000.
alter table public.problem_statements enable row level security;
revoke all on public.problem_statements from anon, authenticated;
grant select (id, title, summary, domain, difficulty, max_slots, filled_slots, display_order, is_active)
  on public.problem_statements to anon;
grant select on public.problem_statements to authenticated;

drop policy if exists problem_statements_read_active on public.problem_statements;
create policy problem_statements_read_active on public.problem_statements
  for select to anon, authenticated using (is_active = true);

-- registration_problem_statements: read own selection (admins read all, which
-- the "track in use" delete check relies on). Writes go through
-- public.select_registration_problem_statement().
alter table public.registration_problem_statements enable row level security;
revoke all on public.registration_problem_statements from anon, authenticated;
grant select on public.registration_problem_statements to authenticated;

drop policy if exists registration_problem_statements_select_own on public.registration_problem_statements;
create policy registration_problem_statements_select_own on public.registration_problem_statements
  for select to authenticated
  using (exists (
    select 1 from public.registrations r
    where r.id = registration_id and r.created_by = (select auth.uid())
  ));
drop policy if exists registration_problem_statements_select_admin on public.registration_problem_statements;
create policy registration_problem_statements_select_admin on public.registration_problem_statements
  for select to authenticated using (public.is_admin());

-- Legacy tables: RLS on, no policies => only the service role can touch them.
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.seat_assignments enable row level security;
revoke all on public.coupons, public.coupon_redemptions, public.seat_assignments from anon, authenticated;
