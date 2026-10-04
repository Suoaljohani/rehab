-- 08 Business logic: patients, episodes, care teams, staff accounts
-- =====================================================================
-- Patients, episodes & care teams (admin)
-- =====================================================================
create or replace function public.find_patient_duplicates(p_national_id text default null, p_phone text default null, p_name text default null, p_dob date default null)
returns table(id uuid, full_name text, mrn text, phone text, date_of_birth date, match_reason text)
language plpgsql security definer set search_path = public as $$
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  return query
  select p.id, p.full_name, p.mrn, p.phone, p.date_of_birth,
    case when p.national_id is not null and p.national_id = nullif(trim(p_national_id),'') then 'رقم الهوية مطابق'
         when p.phone = private.normalize_phone(p_phone) and p.date_of_birth = p_dob then 'الجوال وتاريخ الميلاد'
         when p.phone = private.normalize_phone(p_phone) then 'رقم الجوال مطابق'
         else 'الاسم وتاريخ الميلاد' end
  from public.patients p
  where (nullif(trim(p_national_id),'') is not null and p.national_id = trim(p_national_id))
     or (nullif(p_phone,'') is not null and p.phone = private.normalize_phone(p_phone))
     or (p_dob is not null and p.date_of_birth = p_dob and nullif(trim(p_name),'') is not null and p.full_name ilike '%' || split_part(trim(p_name),' ',1) || '%')
  limit 10;
end $$;

create or replace function public.admin_create_patient(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_patient uuid; v_user uuid; v_access text; v_mrn text; v_episode uuid; v_phone text; v_name text;
begin
  perform private.require(private.is_admin() or private.my_role() = 'supervisor', 'forbidden');
  v_name := trim(coalesce(p->>'full_name',''));
  v_phone := private.normalize_phone(p->>'phone');
  perform private.require(char_length(v_name) >= 3, 'invalid_name');
  perform private.require(v_phone ~ '^05\d{8}$', 'invalid_phone');
  perform private.require(coalesce(p->>'national_id','') = '' or (p->>'national_id') ~ '^[12]\d{9}$', 'invalid_national_id');
  perform private.require(coalesce(p->>'national_id','') = '' or not exists (select 1 from public.patients where national_id = p->>'national_id'), 'duplicate_national_id');
  v_access := private.new_access_id();
  v_mrn := 'MRN-' || nextval('public.mrn_seq');
  if coalesce((p->>'create_access')::boolean, true) then
    v_user := private.create_auth_user(lower(v_access) || '@patients.masar.health', private.random_secret(), jsonb_build_object('kind','patient'));
    insert into public.profiles(id, role, full_name, full_name_en, phone, email) values (v_user, 'patient', v_name, nullif(p->>'full_name_en',''), v_phone, null);
    insert into public.notification_preferences(user_id) values (v_user);
  end if;
  insert into public.patients(user_id, mrn, access_id, national_id, full_name, full_name_en, date_of_birth, sex, phone, created_by)
  values (v_user, v_mrn, v_access, nullif(p->>'national_id',''), v_name, nullif(p->>'full_name_en',''), nullif(p->>'date_of_birth','')::date,
          nullif(p->>'sex',''), v_phone, auth.uid())
  returning id into v_patient;
  if nullif(p->>'specialty_code','') is not null then
    v_episode := public.admin_create_episode(v_patient, p);
  end if;
  return jsonb_build_object('ok', true, 'patient_id', v_patient, 'access_id', v_access, 'mrn', v_mrn, 'episode_id', v_episode);
end $$;

create or replace function public.admin_create_episode(p_patient uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text; v_provider uuid;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  perform private.require(exists (select 1 from public.specialties where code = p->>'specialty_code'), 'invalid_specialty');
  v_code := 'EP-' || to_char(private.today(), 'YYYY') || '-' || lpad(nextval('public.episode_seq')::text, 4, '0');
  insert into public.episodes(code, patient_id, specialty_code, title, referral_reason, referral_source, diagnosis_summary, main_goal, status, start_date, created_by)
  values (v_code, p_patient, p->>'specialty_code', coalesce(nullif(trim(p->>'episode_title'),''), 'رحلة تأهيلية'),
          nullif(p->>'referral_reason',''), nullif(p->>'referral_source',''), nullif(p->>'diagnosis_summary',''), nullif(p->>'main_goal',''),
          'active', coalesce(nullif(p->>'start_date','')::date, private.today()), auth.uid())
  returning id into v_id;
  perform private.add_timeline(v_id, 'EPISODE_CREATED', 'بدأت رحلة تأهيلية جديدة', coalesce(nullif(trim(p->>'episode_title'),''), null), v_id, true);
  v_provider := nullif(p->>'primary_provider_id','')::uuid;
  if v_provider is not null then
    perform public.assign_care_member(v_id, v_provider, 'primary', 'تعيين عند إنشاء الرحلة');
  else
    perform private.raise_flag(v_id, 'unassigned', 'medium', 'رحلة بدون مقدم رعاية رئيسي', v_code, v_id);  -- BR-003
  end if;
  return v_id;
end $$;

create or replace function public.set_episode_status(p_episode uuid, p_status public.episode_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare e public.episodes; r record;
begin
  select * into e from public.episodes where id = p_episode for update;
  perform private.require(found and private.staff_can_access_episode(p_episode) and private.my_role() in ('provider','supervisor','admin','super_admin'), 'forbidden');
  perform private.require(e.status <> p_status, 'no_change');
  if e.status in ('completed','discharged','cancelled') then
    perform private.require(private.is_supervisor_plus(), 'reopen_requires_supervisor');
  end if;
  perform private.via_rpc();
  if p_status in ('completed','discharged','cancelled') then
    for r in select id from public.home_programs where episode_id = p_episode and status in ('active','scheduled','paused','draft') loop
      perform public.set_program_status(r.id, case when p_status = 'cancelled' then 'cancelled'::public.program_status else 'completed'::public.program_status end, 'إغلاق الرحلة');
    end loop;
    update public.attention_flags set status = 'resolved', resolved_at = now(), resolved_by = auth.uid(), resolution_note = 'أُغلقت الرحلة'
     where episode_id = p_episode and status = 'open';
  elsif p_status = 'on_hold' then
    for r in select id from public.home_programs where episode_id = p_episode and status in ('active','scheduled') loop
      perform public.set_program_status(r.id, 'paused', 'تعليق الرحلة');
    end loop;
  end if;
  update public.episodes set status = p_status, closed_reason = coalesce(nullif(trim(p_reason),''), closed_reason),
         end_date = case when p_status in ('completed','discharged','cancelled') then private.today() else null end
   where id = p_episode;
  perform private.add_timeline(p_episode,
    case p_status when 'completed' then 'EPISODE_COMPLETED' when 'discharged' then 'EPISODE_DISCHARGED' when 'on_hold' then 'EPISODE_ON_HOLD'
                  when 'cancelled' then 'EPISODE_CANCELLED' else 'EPISODE_REOPENED' end,
    case p_status when 'completed' then 'اكتملت الرحلة التأهيلية' when 'discharged' then 'تم الخروج من الرحلة التأهيلية'
                  when 'on_hold' then 'تم تعليق الرحلة التأهيلية مؤقتًا' when 'cancelled' then 'أُلغيت الرحلة التأهيلية' else 'أُعيد تفعيل الرحلة التأهيلية' end,
    p_reason, p_episode, true);
end $$;

create or replace function public.assign_care_member(p_episode uuid, p_provider uuid, p_role public.care_role default 'primary', p_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_old public.care_team_members; v_id uuid; v_name text; e public.episodes; v_pname text;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select * into e from public.episodes where id = p_episode;
  perform private.require(found, 'not_found');
  perform private.require(exists (select 1 from public.profiles where id = p_provider and role in ('provider','supervisor') and status = 'active'), 'invalid_provider');
  select full_name into v_name from public.profiles where id = p_provider;
  select full_name into v_pname from public.patients where id = e.patient_id;
  -- the same provider already active → just change role
  select * into v_old from public.care_team_members where episode_id = p_episode and provider_id = p_provider and ended_at is null;
  if found then
    if v_old.role = p_role then return v_old.id; end if;
    update public.care_team_members set ended_at = now(), end_date = private.today(), end_reason = 'تغيير الدور' where id = v_old.id;
  end if;
  if p_role = 'primary' then
    select * into v_old from public.care_team_members where episode_id = p_episode and role = 'primary' and ended_at is null;
    if found then
      perform private.require(nullif(trim(p_reason),'') is not null, 'transfer_reason_required');
      update public.care_team_members set ended_at = now(), end_date = private.today(), end_reason = p_reason where id = v_old.id;
      perform private.notify(v_old.provider_id, 'assignment', 'تم نقل مراجع من قائمتك', v_pname || ' — ' || p_reason, '/provider/patients');
    end if;
  end if;
  insert into public.care_team_members(episode_id, provider_id, role, assigned_by, reason)
  values (p_episode, p_provider, p_role, auth.uid(), nullif(trim(p_reason),'')) returning id into v_id;
  perform private.notify(p_provider, 'assignment', 'تم إسناد مراجع إليك', v_pname || ' — ' || e.title, '/provider/patients/' || p_episode);
  perform private.add_timeline(p_episode, 'CARE_TEAM_UPDATED',
    case when p_role = 'primary' then 'مقدم الرعاية الرئيسي: ' else 'انضم لفريق الرعاية: ' end || v_name, p_reason, v_id, true);
  update public.attention_flags set status = 'resolved', resolved_at = now(), resolved_by = auth.uid(), resolution_note = 'تم التعيين'
   where episode_id = p_episode and kind = 'unassigned' and status = 'open' and p_role = 'primary';
  return v_id;
end $$;

create or replace function public.end_care_member(p_member uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare m public.care_team_members;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select * into m from public.care_team_members where id = p_member and ended_at is null;
  perform private.require(found, 'not_found');
  perform private.require(nullif(trim(p_reason),'') is not null, 'reason_required');
  update public.care_team_members set ended_at = now(), end_date = private.today(), end_reason = p_reason where id = p_member;
  if m.role = 'primary' then
    perform private.raise_flag(m.episode_id, 'unassigned', 'medium', 'رحلة بدون مقدم رعاية رئيسي', p_reason, m.episode_id);
  end if;
  perform private.add_timeline(m.episode_id, 'CARE_TEAM_UPDATED', 'تغيير في فريق الرعاية', p_reason, m.id, false);
end $$;

-- =====================================================================
-- Staff & accounts (admin)
-- =====================================================================
create or replace function public.admin_create_staff(p jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_user uuid; v_role public.app_role;
begin
  perform private.require(private.is_admin(), 'forbidden');
  v_role := (p->>'role')::public.app_role;
  perform private.require(v_role <> 'patient', 'invalid_role');
  perform private.require(v_role <> 'super_admin' or private.my_role() = 'super_admin', 'forbidden');
  perform private.require((p->>'email') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$', 'invalid_email');
  perform private.require(char_length(coalesce(p->>'password','')) >= 10, 'weak_password');
  perform private.require(not exists (select 1 from auth.users where email = lower(p->>'email')), 'email_exists');
  v_user := private.create_auth_user(p->>'email', p->>'password', jsonb_build_object('kind','staff'));
  insert into public.profiles(id, role, full_name, full_name_en, email, phone)
  values (v_user, v_role, trim(p->>'full_name'), nullif(p->>'full_name_en',''), lower(p->>'email'), private.normalize_phone(nullif(p->>'phone','')));
  insert into public.staff_profiles(user_id, employee_id, specialty_code, title, capacity)
  values (v_user, nullif(p->>'employee_id',''), nullif(p->>'specialty_code',''), nullif(p->>'title',''), coalesce(nullif(p->>'capacity','')::int, 20));
  insert into public.notification_preferences(user_id) values (v_user);
  return v_user;
end $$;

create or replace function public.admin_update_account(p_user uuid, p_role public.app_role default null, p_status public.account_status default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_cur public.profiles;
begin
  perform private.require(private.is_admin(), 'forbidden');
  select * into v_cur from public.profiles where id = p_user;
  perform private.require(found, 'not_found');
  perform private.require(p_user <> auth.uid() or (p_status is distinct from 'disabled' and (p_role is null or p_role = v_cur.role)), 'cannot_change_self');
  perform private.require(p_role is null or (p_role <> 'patient' and v_cur.role <> 'patient'), 'invalid_role');
  perform private.require(p_role is distinct from 'super_admin' or private.my_role() = 'super_admin', 'forbidden');
  update public.profiles set role = coalesce(p_role, role), status = coalesce(p_status, status) where id = p_user;
  if p_status = 'disabled' then
    -- ban at the auth layer: sign-in and token refresh stop immediately;
    -- RLS already denies everything because the profile is no longer active.
    update auth.users set banned_until = 'infinity' where id = p_user;
    update public.patients set status = 'disabled' where user_id = p_user;
  elsif p_status = 'active' then
    update auth.users set banned_until = null where id = p_user;
    update public.patients set status = 'active' where user_id = p_user;
  end if;
end $$;

create or replace function public.admin_reset_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform private.require(private.is_admin(), 'forbidden');
  perform private.require(char_length(p_password) >= 10, 'weak_password');
  perform private.require(exists (select 1 from public.profiles where id = p_user and role <> 'patient'), 'not_staff');
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  perform private.audit('password_reset', 'profiles', p_user::text, 'إعادة تعيين كلمة المرور بواسطة الإدارة');
end $$;

create or replace function public.update_my_profile(p_phone text default null, p_locale text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set locale = coalesce(nullif(p_locale,''), locale) where id = auth.uid();
end $$;

