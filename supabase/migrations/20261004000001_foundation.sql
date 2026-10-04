-- =====================================================================
-- MASAR Rehabilitation Platform — 01 Foundation
-- Identity, roles, patients, reference data, private helper functions.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated, anon;

-- ---------- Enums ----------
create type public.app_role as enum ('patient','provider','supervisor','admin','content_reviewer','super_admin');
create type public.account_status as enum ('active','invited','disabled');
create type public.episode_status as enum ('draft','active','on_hold','completed','discharged','cancelled');
create type public.care_role as enum ('primary','secondary','covering','supervisor');
create type public.program_status as enum ('draft','scheduled','active','paused','completed','superseded','cancelled');
create type public.program_version_status as enum ('draft','published','superseded');
create type public.exercise_status as enum ('draft','in_review','approved','rejected','changes_requested','archived');
create type public.schedule_status as enum ('scheduled','completed','cancelled','paused');
create type public.appointment_status as enum ('requested','pending_confirmation','confirmed','checked_in','completed','no_show','cancelled','rescheduled');
create type public.request_status as enum ('new','under_review','need_information','accepted','scheduled','rejected','closed');
create type public.thread_category as enum ('exercise_question','pain','appointment','general');
create type public.issue_reason as enum ('pain','hard','unclear','cannot','other');
create type public.difficulty_level as enum ('very_easy','easy','appropriate','difficult','very_difficult');
create type public.feeling as enum ('better','same','worse');
create type public.flag_status as enum ('open','resolved');
create type public.flag_severity as enum ('low','medium','high');

-- ---------- Generic updated_at ----------
create or replace function private.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- Reference: specialties ----------
create table public.specialties (
  code text primary key,
  name text not null,
  name_en text not null,
  sort smallint not null default 0
);

-- ---------- Identity ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  full_name text not null,
  full_name_en text,
  email text,
  phone text,
  status public.account_status not null default 'active',
  locale text not null default 'ar' check (locale in ('ar','en')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();

create table public.staff_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  employee_id text unique,
  specialty_code text references public.specialties(code),
  title text,
  title_en text,
  capacity integer not null default 20 check (capacity between 0 and 500),
  mfa_required boolean not null default true,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_touch before update on public.staff_profiles for each row execute function private.touch_updated_at();

-- Patient profile is separate from the login account (one profile, many episodes — BR-001)
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  mrn text not null unique,
  access_id text not null unique,
  national_id text,
  full_name text not null,
  full_name_en text,
  date_of_birth date,
  sex text check (sex in ('male','female')),
  phone text,
  phone_verified boolean not null default false,
  status public.account_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patients_national_id_idx on public.patients(national_id);
create index patients_phone_idx on public.patients(phone);
create trigger trg_patients_touch before update on public.patients for each row execute function private.touch_updated_at();

-- ---------- Settings ----------
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- ---------- Private helpers (not exposed through the API) ----------
create or replace function private.today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Riyadh')::date $$;

create or replace function private.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.my_role() in ('provider','supervisor','admin','content_reviewer','super_admin'), false)
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.my_role() in ('admin','super_admin'), false)
$$;

create or replace function private.is_supervisor_plus() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.my_role() in ('supervisor','admin','super_admin'), false)
$$;

create or replace function private.is_content_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.my_role() in ('content_reviewer','admin','super_admin'), false)
$$;

create or replace function private.my_patient_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.patients p
  join public.profiles pr on pr.id = p.user_id and pr.status = 'active'
  where p.user_id = auth.uid() and p.status = 'active'
$$;

create or replace function private.setting(p_key text, p_default jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.system_settings where key = p_key), p_default)
$$;

grant execute on all functions in schema private to authenticated, anon;
