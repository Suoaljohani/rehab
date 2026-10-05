-- =====================================================================
-- 15 Admin control over every record.
--   * People (staff, admins, patients) are edited in full and "removed":
--     the account is closed and hidden everywhere, its email / ID number is
--     freed for reuse, and the clinical history stays intact and restorable.
--   * Content tables are already writable by admins through RLS.
--   * Audit history remains append-only.
-- =====================================================================
alter table public.profiles add column if not exists removed_at timestamptz,
  add column if not exists removed_email text,
  add column if not exists removed_reason text;
alter table public.patients add column if not exists removed_at timestamptz,
  add column if not exists removed_national_id text;

create or replace function private.valid_email(p text) returns boolean
language sql immutable set search_path = public as $$ select coalesce(p, '') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' $$;

create or replace function private.set_login_email(p_user uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update auth.users set email = p_email, updated_at = now() where id = p_user;
  update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(p_email)), updated_at = now()
   where user_id = p_user and provider = 'email';
end $$;

-- ---------- Staff & admins (including the admin's own account) ----------
create or replace function public.admin_update_staff(p_user uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v public.profiles; v_email text; v_phone text;
begin
  perform private.require(private.is_admin(), 'forbidden');
  select * into v from public.profiles where id = p_user and role <> 'patient';
  perform private.require(found, 'not_found');
  perform private.require(v.removed_at is null, 'removed');
  perform private.require(v.role <> 'super_admin' or private.my_role() = 'super_admin', 'forbidden');
  if p ? 'full_name' then perform private.require(char_length(trim(p->>'full_name')) >= 3, 'invalid_name'); end if;
  v_email := lower(trim(coalesce(nullif(trim(p->>'email'), ''), v.email)));
  perform private.require(private.valid_email(v_email), 'invalid_email');
  if v_email is distinct from v.email then
    perform private.require(not exists (select 1 from auth.users where lower(email) = v_email and id <> p_user), 'email_exists');
    perform private.set_login_email(p_user, v_email);
  end if;
  v_phone := case when p ? 'phone' then private.normalize_phone(nullif(trim(p->>'phone'), '')) else v.phone end;
  perform private.require(v_phone is null or v_phone ~ '^05\d{8}$', 'invalid_phone');
  update public.profiles set
    full_name = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
    full_name_en = case when p ? 'full_name_en' then nullif(trim(p->>'full_name_en'), '') else full_name_en end,
    email = v_email, phone = v_phone
   where id = p_user;
  insert into public.staff_profiles(user_id) values (p_user) on conflict (user_id) do nothing;
  update public.staff_profiles set
    title = case when p ? 'title' then nullif(trim(p->>'title'), '') else title end,
    employee_id = case when p ? 'employee_id' then nullif(trim(p->>'employee_id'), '') else employee_id end,
    specialty_code = case when p ? 'specialty_code' then nullif(p->>'specialty_code', '') else specialty_code end,
    capacity = case when p ? 'capacity' then greatest(0, coalesce(nullif(p->>'capacity', '')::int, capacity)) else capacity end
   where user_id = p_user;
end $$;

-- Any staff member edits their own name, phone and title.
create or replace function public.update_my_details(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_phone text;
begin
  perform private.require(private.is_staff(), 'forbidden');
  if p ? 'full_name' then perform private.require(char_length(trim(p->>'full_name')) >= 3, 'invalid_name'); end if;
  v_phone := private.normalize_phone(nullif(trim(p->>'phone'), ''));
  perform private.require(not (p ? 'phone') or v_phone is null or v_phone ~ '^05\d{8}$', 'invalid_phone');
  update public.profiles set
    full_name = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
    full_name_en = case when p ? 'full_name_en' then nullif(trim(p->>'full_name_en'), '') else full_name_en end,
    phone = case when p ? 'phone' then v_phone else phone end
   where id = auth.uid();
  if p ? 'title' then
    insert into public.staff_profiles(user_id) values (auth.uid()) on conflict (user_id) do nothing;
    update public.staff_profiles set title = nullif(trim(p->>'title'), '') where user_id = auth.uid();
  end if;
end $$;

create or replace function public.admin_remove_account(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.profiles; v_eps uuid[]; r uuid;
begin
  perform private.require(private.is_admin(), 'forbidden');
  select * into v from public.profiles where id = p_user and role <> 'patient';
  perform private.require(found, 'not_found');
  perform private.require(v.removed_at is null, 'removed');
  perform private.require(v.role <> 'super_admin' or private.my_role() = 'super_admin', 'forbidden');
  perform private.require(char_length(trim(coalesce(p_reason, ''))) >= 3, 'reason_required');
  if v.role in ('admin', 'super_admin') then
    perform private.require(exists (select 1 from public.profiles where role in ('admin', 'super_admin') and status = 'active'
      and removed_at is null and id <> p_user), 'last_admin');
  end if;
  -- primary assignments this person held in open journeys
  select array_agg(distinct m.episode_id) into v_eps from public.care_team_members m join public.episodes e on e.id = m.episode_id
   where m.provider_id = p_user and m.ended_at is null and m.role = 'primary' and e.status in ('active', 'on_hold', 'draft');
  update public.care_team_members set ended_at = now(), end_date = private.today(), end_reason = 'إزالة الحساب: ' || trim(p_reason)
   where provider_id = p_user and ended_at is null;
  perform private.set_login_email(p_user, 'removed+' || p_user || '@removed.invalid');
  update auth.users set phone = null, banned_until = 'infinity' where id = p_user;
  update public.profiles set status = 'disabled', removed_at = now(), removed_reason = trim(p_reason), removed_email = email, email = null
   where id = p_user;
  foreach r in array coalesce(v_eps, '{}') loop
    perform private.raise_flag(r, 'unassigned', 'medium', 'رحلة بدون مقدم رعاية رئيسي', 'أُزيل حساب مقدم الرعاية', r);
  end loop;
  perform private.audit('remove', 'profiles', p_user::text, trim(p_reason));
end $$;

create or replace function public.admin_restore_account(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.profiles;
begin
  perform private.require(private.is_admin(), 'forbidden');
  select * into v from public.profiles where id = p_user and role <> 'patient';
  perform private.require(found and v.removed_at is not null, 'not_removed');
  perform private.require(v.role <> 'super_admin' or private.my_role() = 'super_admin', 'forbidden');
  perform private.require(not exists (select 1 from auth.users where lower(email) = lower(v.removed_email) and id <> p_user), 'email_exists');
  perform private.set_login_email(p_user, v.removed_email);
  update auth.users set banned_until = null where id = p_user;
  update public.profiles set status = 'active', email = removed_email, removed_email = null, removed_at = null, removed_reason = null,
         must_change_password = true
   where id = p_user;
  perform private.audit('restore', 'profiles', p_user::text, 'استعادة الحساب');
end $$;

-- ---------- Patients ----------
create or replace function public.admin_update_patient(p_patient uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare pt public.patients; v_nid text; v_dob date;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select * into pt from public.patients where id = p_patient;
  perform private.require(found, 'not_found');
  perform private.require(pt.removed_at is null, 'removed');
  if p ? 'full_name' then perform private.require(char_length(trim(p->>'full_name')) >= 3, 'invalid_name'); end if;
  if p ? 'national_id' then
    v_nid := private.normalize_identifier(p->>'national_id');
    perform private.require(v_nid ~ '^[12]\d{9}$', 'invalid_national_id');
    perform private.require(not exists (select 1 from public.patients where national_id = v_nid and id <> p_patient), 'duplicate_national_id');
  end if;
  if p ? 'date_of_birth' then
    v_dob := nullif(p->>'date_of_birth', '')::date;
    perform private.require(v_dob is null or (v_dob >= date '1900-01-01' and v_dob <= private.today()), 'invalid_dob');
  end if;
  perform private.require(not (p ? 'sex') or coalesce(p->>'sex', '') in ('', 'male', 'female'), 'invalid_sex');
  update public.patients set
    full_name = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
    full_name_en = case when p ? 'full_name_en' then nullif(trim(p->>'full_name_en'), '') else full_name_en end,
    national_id = case when p ? 'national_id' then v_nid else national_id end,
    date_of_birth = case when p ? 'date_of_birth' then v_dob else date_of_birth end,
    sex = case when p ? 'sex' then nullif(p->>'sex', '') else sex end
   where id = p_patient;
  update public.profiles set full_name = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
         full_name_en = case when p ? 'full_name_en' then nullif(trim(p->>'full_name_en'), '') else full_name_en end
   where id = pt.user_id;
end $$;

create or replace function public.admin_remove_patient(p_patient uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare pt public.patients; r record; v_reason text := trim(coalesce(p_reason, ''));
begin
  perform private.require(private.is_admin(), 'forbidden');
  select * into pt from public.patients where id = p_patient;
  perform private.require(found, 'not_found');
  perform private.require(pt.removed_at is null, 'removed');
  perform private.require(char_length(v_reason) >= 3, 'reason_required');
  for r in select id from public.episodes where patient_id = p_patient and status in ('active', 'on_hold', 'draft') loop
    perform public.set_episode_status(r.id, 'cancelled', 'إزالة ملف المراجع: ' || v_reason);
  end loop;
  update public.care_team_members set ended_at = now(), end_date = private.today(), end_reason = 'إزالة ملف المراجع'
   where ended_at is null and episode_id in (select id from public.episodes where patient_id = p_patient);
  update public.appointments set status = 'cancelled'
   where patient_id = p_patient and starts_at > now() and status in ('requested', 'pending_confirmation', 'confirmed', 'rescheduled');
  update public.patients set status = 'disabled', removed_at = now(), removed_national_id = national_id, national_id = null where id = p_patient;
  if pt.user_id is not null then
    perform private.set_login_email(pt.user_id, 'removed+' || pt.user_id || '@removed.invalid');
    update auth.users set phone = null, banned_until = 'infinity' where id = pt.user_id;
    update public.profiles set status = 'disabled', removed_at = now(), removed_reason = v_reason where id = pt.user_id;
  end if;
  perform private.audit('remove', 'patients', p_patient::text, v_reason);
end $$;

create or replace function public.admin_restore_patient(p_patient uuid)
returns void language plpgsql security definer set search_path = public as $$
declare pt public.patients;
begin
  perform private.require(private.is_admin(), 'forbidden');
  select * into pt from public.patients where id = p_patient;
  perform private.require(found and pt.removed_at is not null, 'not_removed');
  perform private.require(pt.removed_national_id is null or not exists (select 1 from public.patients where national_id = pt.removed_national_id), 'duplicate_national_id');
  update public.patients set status = 'active', removed_at = null, national_id = removed_national_id, removed_national_id = null where id = p_patient;
  if pt.user_id is not null then
    perform private.set_login_email(pt.user_id, lower(pt.access_id) || '@patients.masar.health');
    update auth.users set banned_until = null where id = pt.user_id;
    update public.profiles set status = 'active', removed_at = null, removed_reason = null where id = pt.user_id;
    perform private.ensure_auth_phone(pt.user_id, pt.phone);
  end if;
  perform private.audit('restore', 'patients', p_patient::text, 'استعادة ملف المراجع');
end $$;

-- ---------- Journeys ----------
create or replace function public.admin_update_episode(p_episode uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare e public.episodes; v_start date; v_end date;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select * into e from public.episodes where id = p_episode;
  perform private.require(found, 'not_found');
  if p ? 'title' then perform private.require(char_length(trim(p->>'title')) >= 3, 'invalid_title'); end if;
  if p ? 'specialty_code' then perform private.require(exists (select 1 from public.specialties where code = p->>'specialty_code'), 'invalid_specialty'); end if;
  v_start := coalesce(nullif(p->>'start_date', '')::date, e.start_date);
  v_end := case when p ? 'end_date' then nullif(p->>'end_date', '')::date else e.end_date end;
  perform private.require(v_end is null or v_end >= v_start, 'invalid_dates');
  update public.episodes set
    title = coalesce(nullif(trim(p->>'title'), ''), title),
    specialty_code = coalesce(nullif(p->>'specialty_code', ''), specialty_code),
    referral_reason = case when p ? 'referral_reason' then nullif(trim(p->>'referral_reason'), '') else referral_reason end,
    referral_source = case when p ? 'referral_source' then nullif(trim(p->>'referral_source'), '') else referral_source end,
    diagnosis_summary = case when p ? 'diagnosis_summary' then nullif(trim(p->>'diagnosis_summary'), '') else diagnosis_summary end,
    main_goal = case when p ? 'main_goal' then nullif(trim(p->>'main_goal'), '') else main_goal end,
    start_date = v_start, end_date = v_end
   where id = p_episode;
end $$;

revoke execute on function public.admin_update_staff(uuid, jsonb), public.update_my_details(jsonb), public.admin_remove_account(uuid, text),
  public.admin_restore_account(uuid), public.admin_update_patient(uuid, jsonb), public.admin_remove_patient(uuid, text),
  public.admin_restore_patient(uuid), public.admin_update_episode(uuid, jsonb) from anon, public;
grant execute on function public.admin_update_staff(uuid, jsonb), public.update_my_details(jsonb), public.admin_remove_account(uuid, text),
  public.admin_restore_account(uuid), public.admin_update_patient(uuid, jsonb), public.admin_remove_patient(uuid, text),
  public.admin_restore_patient(uuid), public.admin_update_episode(uuid, jsonb) to authenticated;
revoke execute on function private.set_login_email(uuid, text) from anon, authenticated, public;
