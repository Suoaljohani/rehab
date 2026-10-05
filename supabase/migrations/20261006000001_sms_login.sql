-- =====================================================================
-- 14 Patient sign-in codes by SMS (Supabase Auth phone OTP · Twilio Verify)
--
-- The patient types only their national ID. The database resolves the
-- registered mobile, asks Supabase Auth to text the code, and verifies it —
-- the phone number never reaches the browser or the web server, and the
-- response is identical whether or not an ID is registered (no enumeration).
-- =====================================================================
create extension if not exists http with schema extensions;

-- Where the database reaches Supabase Auth. Holds the project URL and the
-- *publishable* key only (both public values). Not reachable through the API.
create table if not exists private.auth_gateway (
  id boolean primary key default true check (id),
  url text not null,
  api_key text not null
);
revoke all on private.auth_gateway from public, anon, authenticated;
-- Configure once per project (not committed with real values):
--   insert into private.auth_gateway(url, api_key) values ('https://<ref>.supabase.co', 'sb_publishable_…')
--   on conflict (id) do update set url = excluded.url, api_key = excluded.api_key;

-- Seeded example patients carry invented numbers: they must never be texted.
alter table public.patients add column if not exists is_sample boolean not null default false;
update public.patients set is_sample = true where created_by is null and not is_sample;

-- Delivery log so staff can answer "the code never arrived".
create table if not exists public.sms_deliveries (
  id bigint generated always as identity primary key,
  patient_id uuid references public.patients(id),
  purpose text not null default 'login',
  event text not null check (event in ('sent', 'suppressed', 'failed', 'rate_limited', 'verified', 'rejected', 'no_phone', 'phone_conflict')),
  http_status int,
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists sms_deliveries_patient_idx on public.sms_deliveries(patient_id, created_at desc);
create index if not exists sms_deliveries_created_idx on public.sms_deliveries(created_at desc);
alter table public.sms_deliveries enable row level security;
create policy sms_deliveries_read on public.sms_deliveries for select using (private.is_supervisor_plus());
revoke insert, update, delete, truncate on public.sms_deliveries from anon, authenticated;

create or replace function private.to_e164(p text) returns text
language sql immutable set search_path = public as $$
  select case when private.normalize_phone(p) ~ '^05\d{8}$' then '+966' || substr(private.normalize_phone(p), 2) end
$$;

-- POSTs to Supabase Auth from inside the database. Network errors never raise.
create or replace function private.auth_api(p_path text, p_body jsonb, out status int, out body jsonb)
language plpgsql security definer set search_path = public, extensions as $$
declare g private.auth_gateway; r extensions.http_response;
begin
  select * into g from private.auth_gateway where id;
  if not found then status := 503; body := '{"error_code":"gateway_not_configured"}'; return; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '10000');
  r := extensions.http(('POST', g.url || '/auth/v1/' || p_path,
        array[extensions.http_header('apikey', g.api_key)], 'application/json', p_body::text)::extensions.http_request);
  status := r.status;
  begin
    body := r.content::jsonb;
  exception when others then
    body := jsonb_build_object('raw', left(coalesce(r.content, ''), 200));
  end;
exception when others then
  status := 599; body := jsonb_build_object('error_code', 'network', 'msg', left(sqlerrm, 200));
end $$;

-- Keeps the patient's sign-in account bound to their registered mobile.
create or replace function private.ensure_auth_phone(p_user uuid, p_phone text) returns text
language plpgsql security definer set search_path = public as $$
declare v_e164 text := private.to_e164(p_phone); v_digits text;
begin
  if p_user is null or v_e164 is null then return null; end if;
  v_digits := substr(v_e164, 2);
  if exists (select 1 from auth.users where phone = v_digits and id <> p_user) then return 'conflict'; end if;
  update auth.users set phone = v_digits, phone_confirmed_at = coalesce(phone_confirmed_at, now()), updated_at = now()
   where id = p_user and phone is distinct from v_digits;
  return v_e164;
end $$;

create or replace function private.find_login_patient(p_identifier text) returns public.patients
language plpgsql stable security definer set search_path = public as $$
declare v text := private.normalize_identifier(p_identifier); r public.patients;
begin
  if v ~ '^[12]\d{9}$' then
    select p.* into r from public.patients p join public.profiles pr on pr.id = p.user_id
     where p.national_id = v and p.status = 'active' and pr.status = 'active' and not p.is_sample;
  end if;
  return r;
end $$;

-- Step 1: always answers the same way; texts the code only to a registered, active patient.
create or replace function public.request_patient_otp(p_access_id text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text := private.normalize_identifier(p_access_id);
  v_patient public.patients; v_phone text; v_last timestamptz; r record;
  v_ok constant jsonb := jsonb_build_object('ok', true, 'cooldown', 60);
begin
  if v_key !~ '^[12]\d{9}$' then return jsonb_build_object('ok', false, 'error', 'invalid_identifier'); end if;
  if private.throttled('otp:' || v_key, 5, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_patient := private.find_login_patient(v_key);
  if v_patient.id is null then return v_ok; end if;

  -- one message per minute per patient (the screen enforces the same wait)
  select max(created_at) into v_last from public.sms_deliveries
   where patient_id = v_patient.id and purpose = 'login' and event = 'sent';
  if v_last is not null and v_last > now() - interval '60 seconds' then
    insert into public.sms_deliveries(patient_id, event) values (v_patient.id, 'suppressed');
    return v_ok;
  end if;

  v_phone := private.ensure_auth_phone(v_patient.user_id, v_patient.phone);
  if v_phone is null or v_phone = 'conflict' then
    insert into public.sms_deliveries(patient_id, event) values (v_patient.id, case when v_phone is null then 'no_phone' else 'phone_conflict' end);
    return v_ok;
  end if;

  select * into r from private.auth_api('otp', jsonb_build_object('phone', v_phone, 'create_user', false, 'channel', 'sms'));
  insert into public.sms_deliveries(patient_id, event, http_status, error_code)
  values (v_patient.id, case when r.status = 200 then 'sent' when r.status = 429 then 'rate_limited' else 'failed' end,
          r.status, case when r.status <> 200 then left(coalesce(r.body->>'error_code', r.body->>'msg', 'unknown'), 80) end);
  return v_ok;
end $$;

-- Step 2: verifies with Supabase Auth and hands back the session for the server to set.
create or replace function public.verify_patient_otp(p_access_id text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text := private.normalize_identifier(p_access_id);
  v_code text := regexp_replace(private.normalize_identifier(p_code), '\D', '', 'g');
  v_patient public.patients; v_phone text; r record;
begin
  if v_key !~ '^[12]\d{9}$' or v_code !~ '^\d{4,10}$' then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if private.throttled('verify:' || v_key, 10, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_patient := private.find_login_patient(v_key);
  if v_patient.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  v_phone := private.to_e164(v_patient.phone);
  if v_phone is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;

  select * into r from private.auth_api('verify', jsonb_build_object('type', 'sms', 'phone', v_phone, 'token', v_code));
  if r.status = 200 and r.body ? 'access_token' then
    insert into public.sms_deliveries(patient_id, event, http_status) values (v_patient.id, 'verified', 200);
    update public.patients set phone_verified = true where id = v_patient.id and not phone_verified;
    return jsonb_build_object('ok', true, 'access_token', r.body->>'access_token', 'refresh_token', r.body->>'refresh_token');
  end if;
  insert into public.sms_deliveries(patient_id, event, http_status, error_code)
  values (v_patient.id, case when r.status = 429 then 'rate_limited' else 'rejected' end, r.status, left(coalesce(r.body->>'error_code', 'unknown'), 80));
  insert into public.audit_events(actor_id, actor_role, action, entity_type, entity_id, summary)
  values (v_patient.user_id, 'patient', 'login_failed', 'patients', v_patient.id::text, 'رمز تحقق غير صحيح أو منتهٍ');
  return jsonb_build_object('ok', false, 'error', case when r.status = 429 then 'rate_limited' when r.status between 400 and 499 then 'invalid_code' else 'verify_failed' end);
end $$;

-- Registration binds the patient's mobile to their sign-in account (one mobile per patient).
create or replace function public.admin_create_patient(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_patient uuid; v_user uuid; v_access text; v_mrn text; v_episode uuid; v_phone text; v_name text; v_nid text;
begin
  perform private.require(private.is_admin() or private.my_role() = 'supervisor', 'forbidden');
  v_name := trim(coalesce(p->>'full_name',''));
  v_phone := private.normalize_phone(p->>'phone');
  v_nid := private.normalize_identifier(p->>'national_id');
  perform private.require(char_length(v_name) >= 3, 'invalid_name');
  perform private.require(v_phone ~ '^05\d{8}$', 'invalid_phone');
  perform private.require(v_nid ~ '^[12]\d{9}$', 'invalid_national_id');
  perform private.require(not exists (select 1 from public.patients where national_id = v_nid), 'duplicate_national_id');
  perform private.require(not exists (select 1 from auth.users where phone = substr(private.to_e164(v_phone), 2)), 'phone_in_use');
  v_access := private.new_access_id();
  v_mrn := 'MRN-' || nextval('public.mrn_seq');
  if coalesce((p->>'create_access')::boolean, true) then
    v_user := private.create_auth_user(lower(v_access) || '@patients.masar.health', private.random_secret(), jsonb_build_object('kind','patient'));
    insert into public.profiles(id, role, full_name, full_name_en, phone, email) values (v_user, 'patient', v_name, nullif(p->>'full_name_en',''), v_phone, null);
    insert into public.notification_preferences(user_id) values (v_user);
    perform private.ensure_auth_phone(v_user, v_phone);
  end if;
  insert into public.patients(user_id, mrn, access_id, national_id, full_name, full_name_en, date_of_birth, sex, phone, created_by)
  values (v_user, v_mrn, v_access, v_nid, v_name, nullif(p->>'full_name_en',''), nullif(p->>'date_of_birth','')::date,
          nullif(p->>'sex',''), v_phone, auth.uid())
  returning id into v_patient;
  if nullif(p->>'specialty_code','') is not null then
    v_episode := public.admin_create_episode(v_patient, p);
  end if;
  return jsonb_build_object('ok', true, 'patient_id', v_patient, 'access_id', v_access, 'mrn', v_mrn, 'episode_id', v_episode);
end $$;

-- Staff correct a patient's registered mobile (the only number codes go to).
create or replace function public.admin_update_patient_phone(p_patient uuid, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare v_phone text := private.normalize_phone(p_phone); pt public.patients;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select * into pt from public.patients where id = p_patient;
  perform private.require(found, 'not_found');
  perform private.require(v_phone ~ '^05\d{8}$', 'invalid_phone');
  perform private.require(not exists (select 1 from auth.users where phone = substr(private.to_e164(v_phone), 2) and id is distinct from pt.user_id), 'phone_in_use');
  update public.patients set phone = v_phone, phone_verified = false where id = p_patient;
  update public.profiles set phone = v_phone where id = pt.user_id;
  perform private.ensure_auth_phone(pt.user_id, v_phone);
end $$;

revoke execute on function public.admin_update_patient_phone(uuid, text) from anon, public;
grant execute on function public.admin_update_patient_phone(uuid, text) to authenticated;
revoke execute on function private.auth_api(text, jsonb), private.ensure_auth_phone(uuid, text) from public, anon, authenticated;

-- The on-screen demo code is retired: codes are only ever delivered by SMS.
update public.system_settings set value = 'false', description = 'متوقف نهائيًا — رموز الدخول تُرسل برسائل SMS فقط' where key = 'demo_mode';
