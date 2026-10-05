-- =====================================================================
-- 13 Patient sign-in by national ID / Iqama, admin-issued staff
--    credentials with mandatory first-login change, hospital brand assets.
-- =====================================================================

-- ---------- Patients sign in with their national ID / Iqama number ----------
create unique index if not exists patients_national_id_key on public.patients(national_id) where national_id is not null;

-- Accepts Arabic-Indic or Latin digits and ignores spaces/dashes.
create or replace function private.normalize_identifier(p text) returns text
language sql immutable set search_path = public as $$
  select upper(regexp_replace(translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[\s-]', '', 'g'))
$$;

-- Resolves the identifier a patient types: a 10-digit national ID / Iqama
-- (primary) or, for continuity, an issued Access ID.
create or replace function private.find_login_patient(p_identifier text) returns public.patients
language plpgsql stable security definer set search_path = public as $$
declare v text := private.normalize_identifier(p_identifier); r public.patients;
begin
  if v ~ '^[12]\d{9}$' then
    select p.* into r from public.patients p join public.profiles pr on pr.id = p.user_id
     where p.national_id = v and p.status = 'active' and pr.status = 'active';
  elsif v ~ '^P\d{6}$' or v ~ '^P-\d{6}$' then
    select p.* into r from public.patients p join public.profiles pr on pr.id = p.user_id
     where upper(replace(p.access_id, '-', '')) = replace(v, '-', '') and p.status = 'active' and pr.status = 'active';
  end if;
  return r;
end $$;

create or replace function public.request_patient_otp(p_access_id text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_patient public.patients; v_code text; v_demo boolean; v_key text := private.normalize_identifier(p_access_id);
begin
  if v_key !~ '^([12]\d{9}|P-?\d{6})$' then return jsonb_build_object('ok', false, 'error', 'invalid_identifier'); end if;
  if private.throttled('otp:' || v_key, 5, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_patient := private.find_login_patient(v_key);
  if v_patient.id is null then
    -- same response shape: never reveal whether an ID is registered
    return jsonb_build_object('ok', true, 'masked_phone', null);
  end if;
  update public.patient_otp_challenges set consumed_at = now() where patient_id = v_patient.id and consumed_at is null;
  v_code := lpad(((('x' || encode(gen_random_bytes(4),'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into public.patient_otp_challenges(patient_id, code_hash, expires_at)
  values (v_patient.id, crypt(v_code, gen_salt('bf', 8)), now() + interval '5 minutes');
  v_demo := coalesce((private.setting('demo_mode', 'true'::jsonb))::text::boolean, false);
  return jsonb_build_object('ok', true,
    'masked_phone', case when v_patient.phone is null then null else '•••• ' || right(v_patient.phone, 3) end,
    'demo_code', case when v_demo then v_code else null end);
end $$;

create or replace function public.verify_patient_otp(p_access_id text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_patient public.patients; ch public.patient_otp_challenges; v_secret text; v_email text; v_key text := private.normalize_identifier(p_access_id);
begin
  if private.throttled('verify:' || v_key, 10, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_patient := private.find_login_patient(v_key);
  if v_patient.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  select * into ch from public.patient_otp_challenges
   where patient_id = v_patient.id and consumed_at is null order by created_at desc limit 1;
  if not found or ch.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if ch.attempts >= 5 then
    update public.patient_otp_challenges set consumed_at = now() where id = ch.id;
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  if crypt(private.normalize_identifier(p_code), ch.code_hash) <> ch.code_hash then
    update public.patient_otp_challenges set attempts = attempts + 1 where id = ch.id;
    insert into public.audit_events(actor_id, actor_role, action, entity_type, entity_id, summary)
    values (v_patient.user_id, 'patient', 'login_failed', 'patients', v_patient.id::text, 'رمز تحقق غير صحيح');
    return jsonb_build_object('ok', false, 'error', 'invalid_code', 'remaining', 4 - ch.attempts);
  end if;
  update public.patient_otp_challenges set consumed_at = now() where id = ch.id;
  v_secret := private.random_secret();
  update auth.users set encrypted_password = crypt(v_secret, gen_salt('bf')), updated_at = now()
   where id = v_patient.user_id returning email into v_email;
  update public.patients set phone_verified = true where id = v_patient.id and not phone_verified;
  return jsonb_build_object('ok', true, 'email', v_email, 'secret', v_secret);
end $$;

-- Registration: the national ID / Iqama is now the patient's sign-in key, so it is required.
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
  v_access := private.new_access_id();
  v_mrn := 'MRN-' || nextval('public.mrn_seq');
  if coalesce((p->>'create_access')::boolean, true) then
    v_user := private.create_auth_user(lower(v_access) || '@patients.masar.health', private.random_secret(), jsonb_build_object('kind','patient'));
    insert into public.profiles(id, role, full_name, full_name_en, phone, email) values (v_user, 'patient', v_name, nullif(p->>'full_name_en',''), v_phone, null);
    insert into public.notification_preferences(user_id) values (v_user);
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

-- ---------- Staff: credentials are issued by an admin, changed at first sign-in ----------
alter table public.profiles add column if not exists must_change_password boolean not null default false;

create or replace function private.strong_password(p text) returns boolean
language sql immutable set search_path = public as $$
  select char_length(coalesce(p, '')) >= 10 and p ~ '[A-Za-z]' and p ~ '\d'
$$;

create or replace function public.admin_create_staff(p jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_user uuid; v_role public.app_role; v_email text := lower(trim(coalesce(p->>'email', '')));
begin
  perform private.require(private.is_admin(), 'forbidden');
  v_role := (p->>'role')::public.app_role;
  perform private.require(v_role <> 'patient', 'invalid_role');
  perform private.require(v_role <> 'super_admin' or private.my_role() = 'super_admin', 'forbidden');
  perform private.require(v_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$', 'invalid_email');
  perform private.require(private.strong_password(p->>'password'), 'weak_password');
  perform private.require(not exists (select 1 from auth.users where lower(email) = v_email), 'email_exists');
  v_user := private.create_auth_user(v_email, p->>'password', jsonb_build_object('kind','staff'));
  insert into public.profiles(id, role, full_name, full_name_en, email, phone, must_change_password)
  values (v_user, v_role, trim(p->>'full_name'), nullif(p->>'full_name_en',''), v_email, private.normalize_phone(nullif(p->>'phone','')), true);
  insert into public.staff_profiles(user_id, employee_id, specialty_code, title, capacity)
  values (v_user, nullif(p->>'employee_id',''), nullif(p->>'specialty_code',''), nullif(p->>'title',''), coalesce(nullif(p->>'capacity','')::int, 20));
  insert into public.notification_preferences(user_id) values (v_user);
  return v_user;
end $$;

create or replace function public.admin_reset_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.require(private.is_admin(), 'forbidden');
  perform private.require(private.strong_password(p_password), 'weak_password');
  perform private.require(exists (select 1 from public.profiles where id = p_user and role <> 'patient'), 'not_staff');
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  update public.profiles set must_change_password = true where id = p_user;
  perform private.audit('password_reset', 'profiles', p_user::text, 'إعادة تعيين كلمة المرور بواسطة الإدارة');
end $$;

-- A staff member replaces their admin-issued (or current) password.
create or replace function public.change_my_password(p_current text, p_new text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  perform private.require(private.is_staff(), 'forbidden');
  select encrypted_password into v_hash from auth.users where id = auth.uid();
  perform private.require(v_hash is not null and crypt(coalesce(p_current, ''), v_hash) = v_hash, 'wrong_password');
  perform private.require(private.strong_password(p_new), 'weak_password');
  perform private.require(p_new <> p_current, 'same_password');
  update auth.users set encrypted_password = crypt(p_new, gen_salt('bf')), updated_at = now() where id = auth.uid();
  update public.profiles set must_change_password = false where id = auth.uid();
  perform private.audit('password_change', 'profiles', auth.uid()::text, 'غيّر المستخدم كلمة المرور');
end $$;

revoke execute on function public.change_my_password(text, text) from anon, public;
grant execute on function public.change_my_password(text, text) to authenticated;
revoke execute on function private.find_login_patient(text) from anon, authenticated, public;

-- ---------- Hospital identity (official logo) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', true, 1048576, array['image/svg+xml','image/png','image/webp'])
on conflict (id) do nothing;

-- Uploads are versioned by file name (never overwritten); only admins can add brand assets.
create policy brand_upload on storage.objects for insert with check (bucket_id = 'brand' and private.is_admin());

insert into public.cms_blocks(key, content) values
  ('brand', jsonb_build_object('hospital_name', null, 'hospital_name_en', null, 'logo_url', null, 'logo_mark_url', null))
on conflict (key) do nothing;
