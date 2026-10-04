-- =====================================================================
-- 06 Business logic (security definer RPCs with explicit authorization)
-- Every function re-checks role + resource scope; transactions guarantee
-- that publishing, assignment and completion are all-or-nothing (§113).
-- =====================================================================

create sequence if not exists public.mrn_seq start 10240;
create sequence if not exists public.episode_seq start 1;
create sequence if not exists public.exercise_seq start 1;

-- ---------- Guards: state transitions only through RPCs ----------
create or replace function private.via_rpc() returns void language sql as $$ select set_config('app.via_rpc','on', true) $$;
create or replace function private.is_via_rpc() returns boolean language sql stable as $$ select coalesce(current_setting('app.via_rpc', true),'') = 'on' $$;

create or replace function private.guard_episode() returns trigger language plpgsql as $$
begin
  if new.patient_id <> old.patient_id or new.code <> old.code then raise exception 'immutable_field'; end if;
  if new.status <> old.status and not private.is_via_rpc() then raise exception 'use_set_episode_status'; end if;
  return new;
end $$;
create trigger trg_guard_episode before update on public.episodes for each row execute function private.guard_episode();

create or replace function private.guard_program() returns trigger language plpgsql as $$
begin
  if new.episode_id <> old.episode_id or new.patient_id <> old.patient_id then raise exception 'immutable_field'; end if;
  if (new.status <> old.status or new.current_version_id is distinct from old.current_version_id) and not private.is_via_rpc() then
    raise exception 'use_program_rpc';
  end if;
  return new;
end $$;
create trigger trg_guard_program before update on public.home_programs for each row execute function private.guard_program();

create or replace function private.guard_exercise_version() returns trigger language plpgsql as $$
begin
  if new.status <> old.status and not private.is_via_rpc() then raise exception 'use_review_workflow'; end if;
  if new.exercise_id <> old.exercise_id or new.version <> old.version then raise exception 'immutable_field'; end if;
  return new;
end $$;
create trigger trg_guard_exv before update on public.exercise_versions for each row execute function private.guard_exercise_version();

-- ---------- Helpers ----------
create or replace function private.require(p_ok boolean, p_err text) returns void language plpgsql as $$
begin if not coalesce(p_ok,false) then raise exception '%', p_err using errcode = 'P0001'; end if; end $$;

create or replace function private.throttled(p_bucket text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.auth_throttle where bucket = p_bucket and created_at > now() - p_window;
  if n >= p_max then return true; end if;
  insert into public.auth_throttle(bucket) values (p_bucket);
  return false;
end $$;

create or replace function private.normalize_phone(p text) returns text language sql immutable as $$
  select case
    when p is null then null
    when regexp_replace(p,'\D','','g') ~ '^9665\d{8}$' then '0' || substr(regexp_replace(p,'\D','','g'), 4)
    when regexp_replace(p,'\D','','g') ~ '^5\d{8}$' then '0' || regexp_replace(p,'\D','','g')
    else regexp_replace(p,'\D','','g') end
$$;

create or replace function private.create_auth_user(p_email text, p_password text, p_meta jsonb default '{}')
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, p_meta, now(), now(),
    '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true), 'email', now(), now(), now());
  return v_id;
end $$;

create or replace function private.random_secret() returns text language sql volatile as $$
  select encode(extensions.gen_random_bytes(24), 'hex')
$$;

create or replace function private.new_access_id() returns text language plpgsql volatile as $$
declare v text;
begin
  loop
    v := 'P-' || lpad(((('x' || encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    exit when not exists (select 1 from public.patients where access_id = v);
  end loop;
  return v;
end $$;

-- Notifications respect preferences for non-mandatory kinds (§80).
create or replace function private.notify(p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
declare pref public.notification_preferences;
begin
  if p_user is null then return; end if;
  select * into pref from public.notification_preferences where user_id = p_user;
  if found then
    if p_kind = 'exercise_reminder' and not pref.exercise_reminders then return; end if;
    if p_kind = 'appointment_reminder' and not pref.appointment_reminders then return; end if;
    if p_kind = 'message' and not pref.messages then return; end if;
    if p_kind = 'announcement' and not pref.announcements then return; end if;
  end if;
  insert into public.notifications(user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link);
end $$;

create or replace function private.notify_patient(p_patient uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform private.notify((select user_id from public.patients where id = p_patient), p_kind, p_title, p_body, p_link);
end $$;

create or replace function private.notify_care_team(p_episode uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select provider_id from public.care_team_members where episode_id = p_episode and ended_at is null loop
    perform private.notify(r.provider_id, p_kind, p_title, p_body, p_link);
  end loop;
end $$;

create or replace function private.raise_flag(p_episode uuid, p_kind text, p_severity public.flag_severity, p_title text, p_detail text default null, p_source uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_patient uuid;
begin
  select patient_id into v_patient from public.episodes where id = p_episode;
  insert into public.attention_flags(patient_id, episode_id, kind, severity, title, detail, source_id)
  values (v_patient, p_episode, p_kind, p_severity, p_title, p_detail, p_source)
  on conflict do nothing;
end $$;

-- =====================================================================
-- Authentication support
-- =====================================================================

-- Patient Access ID + one-time code (AUTH-01). Without an SMS gateway the
-- code is returned only when the department enables demo mode.
create or replace function public.request_patient_otp(p_access_id text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_patient public.patients; v_code text; v_demo boolean;
begin
  if p_access_id is null or length(p_access_id) > 20 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if private.throttled('otp:' || upper(trim(p_access_id)), 5, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select p.* into v_patient from public.patients p join public.profiles pr on pr.id = p.user_id
   where upper(p.access_id) = upper(trim(p_access_id)) and p.status = 'active' and pr.status = 'active';
  if not found then
    -- same response shape: never reveal whether an Access ID exists
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
declare v_patient public.patients; ch public.patient_otp_challenges; v_secret text; v_email text;
begin
  if private.throttled('verify:' || upper(trim(coalesce(p_access_id,''))), 10, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select p.* into v_patient from public.patients p join public.profiles pr on pr.id = p.user_id
   where upper(p.access_id) = upper(trim(p_access_id)) and p.status = 'active' and pr.status = 'active';
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  select * into ch from public.patient_otp_challenges
   where patient_id = v_patient.id and consumed_at is null order by created_at desc limit 1;
  if not found or ch.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if ch.attempts >= 5 then
    update public.patient_otp_challenges set consumed_at = now() where id = ch.id;
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  if crypt(trim(p_code), ch.code_hash) <> ch.code_hash then
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

-- After a patient session is established the one-time secret is destroyed.
create or replace function public.rotate_my_patient_secret()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if private.my_role() <> 'patient' then return; end if;
  update auth.users set encrypted_password = crypt(private.random_secret(), gen_salt('bf')) where id = auth.uid();
end $$;

create or replace function public.record_login(p_success boolean, p_identifier text default null, p_channel text default 'staff')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role public.app_role; v_status public.account_status;
begin
  if p_success then
    select role, status into v_role, v_status from public.profiles where id = auth.uid();
    if v_role is null then return jsonb_build_object('ok', false, 'error', 'no_profile'); end if;
    if v_status <> 'active' then
      perform private.audit('login_blocked', 'profiles', auth.uid()::text, 'محاولة دخول لحساب موقوف');
      return jsonb_build_object('ok', false, 'error', 'disabled');
    end if;
    update public.profiles set last_login_at = now() where id = auth.uid();
    perform private.audit('login', 'profiles', auth.uid()::text, null, null, null, jsonb_build_object('channel', p_channel));
    return jsonb_build_object('ok', true, 'role', v_role);
  else
    if private.throttled('loginfail:' || lower(coalesce(p_identifier,'')), 20, interval '15 minutes') then
      return jsonb_build_object('ok', false, 'error', 'rate_limited');
    end if;
    insert into public.audit_events(action, entity_type, summary, metadata)
    values ('login_failed', 'auth', 'فشل تسجيل الدخول', jsonb_build_object('identifier', left(coalesce(p_identifier,''), 3) || '***', 'channel', p_channel));
    return jsonb_build_object('ok', true);
  end if;
end $$;

-- =====================================================================
-- Public portal
-- =====================================================================
create or replace function public.submit_appointment_request(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ref text; v_phone text; v_id uuid; v_name text;
begin
  v_name := trim(coalesce(p->>'full_name',''));
  v_phone := private.normalize_phone(p->>'phone');
  perform private.require(char_length(v_name) between 2 and 120, 'invalid_name');
  perform private.require(v_phone ~ '^05\d{8}$', 'invalid_phone');
  perform private.require(coalesce(p->>'national_id','') = '' or (p->>'national_id') ~ '^[12]\d{9}$', 'invalid_national_id');
  if private.throttled('req:' || v_phone, 5, interval '1 hour') then raise exception 'rate_limited'; end if;
  v_ref := 'RH-' || to_char(private.today(), 'YYYY') || '-' || lpad(nextval('public.request_ref_seq')::text, 5, '0');
  insert into public.appointment_requests(reference, journey_type, full_name, national_id, phone, specialty_code, has_referral, preferred_period, notes)
  values (v_ref, coalesce(nullif(p->>'journey_type',''), 'new_appointment'), v_name, nullif(p->>'national_id',''), v_phone,
          nullif(p->>'specialty_code',''), coalesce((p->>'has_referral')::boolean, false), nullif(p->>'preferred_period',''), nullif(left(p->>'notes', 1500),''))
  returning id into v_id;
  insert into public.request_events(request_id, status, public_note) values (v_id, 'new', 'تم استلام طلبك.');
  insert into public.analytics_events(event, props) values ('appointment_request_created', jsonb_build_object('specialty', p->>'specialty_code'));
  return jsonb_build_object('ok', true, 'reference', v_ref);
end $$;

create or replace function public.track_appointment_request(p_reference text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.appointment_requests; v_events jsonb; v_appt jsonb;
begin
  if private.throttled('track:' || upper(coalesce(p_reference,'')), 10, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select * into r from public.appointment_requests
   where upper(reference) = upper(trim(p_reference)) and phone = private.normalize_phone(p_phone);
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('status', status, 'note', public_note, 'at', created_at) order by created_at), '[]')
    into v_events from public.request_events where request_id = r.id;
  if r.appointment_id is not null then
    select jsonb_build_object('starts_at', a.starts_at, 'location', a.location, 'status', a.status) into v_appt
      from public.appointments a where a.id = r.appointment_id;
  end if;
  return jsonb_build_object('ok', true, 'reference', r.reference, 'status', r.status, 'created_at', r.created_at,
    'service', (select name from public.specialties where code = r.specialty_code), 'events', v_events, 'appointment', v_appt);
end $$;

-- =====================================================================
-- Patient activity
-- =====================================================================
create or replace function public.start_home_session(p_program uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_patient uuid := private.my_patient_id(); hp public.home_programs; v_id uuid;
begin
  perform private.require(v_patient is not null, 'not_patient');
  select * into hp from public.home_programs where id = p_program and patient_id = v_patient;
  perform private.require(found, 'not_found');
  perform private.require(hp.status = 'active', 'program_not_active');
  insert into public.home_sessions(patient_id, episode_id, program_id, session_date)
  values (v_patient, hp.episode_id, hp.id, private.today())
  on conflict (program_id, session_date) do nothing;
  select id into v_id from public.home_sessions where program_id = hp.id and session_date = private.today();
  insert into public.analytics_events(user_id, event) values (auth.uid(), 'home_session_started');
  return v_id;
end $$;

create or replace function public.complete_exercise(p_item uuid, p_pain integer default null, p_difficulty public.difficulty_level default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_patient uuid := private.my_patient_id(); si public.schedule_items; pe public.program_exercises; v_session uuid;
        v_threshold int; v_done int; v_total int; v_name text;
begin
  perform private.require(v_patient is not null, 'not_patient');
  perform private.require(p_pain is null or p_pain between 0 and 10, 'invalid_pain');
  select * into si from public.schedule_items where id = p_item and patient_id = v_patient for update;
  perform private.require(found, 'not_found');
  perform private.require(si.scheduled_date = private.today(), 'not_today');
  if si.status = 'completed' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  perform private.require(si.status = 'scheduled', 'not_available');
  select * into pe from public.program_exercises where id = si.program_exercise_id;
  v_session := public.start_home_session(si.program_id);
  insert into public.exercise_completions(schedule_item_id, home_session_id, patient_id, episode_id, program_exercise_id, exercise_version_id, program_version_id, pain_score, difficulty)
  values (si.id, v_session, v_patient, si.episode_id, pe.id, pe.exercise_version_id, si.program_version_id, p_pain, p_difficulty);
  update public.schedule_items set status = 'completed', completed_at = now() where id = si.id;
  insert into public.analytics_events(user_id, event) values (auth.uid(), 'exercise_completed');

  v_threshold := coalesce((private.setting('pain_flag_threshold', '7'::jsonb))::text::int, 7);
  if p_pain is not null and p_pain >= v_threshold then
    select name into v_name from public.exercise_versions where id = pe.exercise_version_id;
    perform private.raise_flag(si.episode_id, 'high_pain', 'high', 'أبلغ عن ألم مرتفع (' || p_pain || '/10)', 'أثناء تمرين: ' || v_name, si.id);
    perform private.add_timeline(si.episode_id, 'PATIENT_FEEDBACK', 'درجة ألم مرتفعة: ' || p_pain || '/10', v_name, si.id, false);
  end if;

  select count(*) filter (where status = 'completed'), count(*) into v_done, v_total
    from public.schedule_items where program_id = si.program_id and scheduled_date = si.scheduled_date and status in ('scheduled','completed');
  return jsonb_build_object('ok', true, 'done', v_done, 'total', v_total);
end $$;

create or replace function public.report_exercise_issue(p_item uuid, p_reason public.issue_reason, p_comment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_patient uuid := private.my_patient_id(); si public.schedule_items; pe public.program_exercises; v_id uuid; v_name text; v_pname text;
begin
  perform private.require(v_patient is not null, 'not_patient');
  select * into si from public.schedule_items where id = p_item and patient_id = v_patient;
  perform private.require(found, 'not_found');
  select * into pe from public.program_exercises where id = si.program_exercise_id;
  select name into v_name from public.exercise_versions where id = pe.exercise_version_id;
  select full_name into v_pname from public.patients where id = v_patient;
  insert into public.issue_reports(patient_id, episode_id, schedule_item_id, program_exercise_id, exercise_version_id, reason, comment)
  values (v_patient, si.episode_id, si.id, pe.id, pe.exercise_version_id, p_reason, nullif(left(trim(p_comment), 1000), ''))
  returning id into v_id;
  perform private.raise_flag(si.episode_id, 'issue_reported', case when p_reason in ('pain','cannot') then 'high'::public.flag_severity else 'medium'::public.flag_severity end,
    case p_reason when 'pain' then 'أبلغ عن ألم أثناء تمرين' when 'hard' then 'وجد التمرين صعب التنفيذ' when 'unclear' then 'لم يفهم طريقة التمرين'
                  when 'cannot' then 'لا يستطيع تنفيذ تمرين' else 'أبلغ عن مشكلة في تمرين' end,
    v_name || coalesce(' — ' || nullif(trim(p_comment),''), ''), v_id);
  perform private.add_timeline(si.episode_id, 'PATIENT_FEEDBACK', 'بلاغ عن تمرين: ' || v_name, nullif(trim(p_comment),''), v_id, false);
  perform private.notify_care_team(si.episode_id, 'issue', v_pname || ' أبلغ عن مشكلة في تمرين', v_name, '/provider/patients/' || si.episode_id);
  insert into public.analytics_events(user_id, event) values (auth.uid(), 'issue_reported');
  return v_id;
end $$;

create or replace function public.finish_home_session(p_program uuid, p_feeling public.feeling default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_patient uuid := private.my_patient_id(); hs public.home_sessions; v_done int; v_total int; v_pname text;
begin
  perform private.require(v_patient is not null, 'not_patient');
  select * into hs from public.home_sessions where program_id = p_program and patient_id = v_patient and session_date = private.today();
  perform private.require(found, 'no_session');
  update public.home_sessions set completed_at = coalesce(completed_at, now()), feeling = coalesce(p_feeling, feeling),
         patient_note = coalesce(nullif(left(trim(p_note), 1000), ''), patient_note)
   where id = hs.id;
  select count(*) filter (where status = 'completed'), count(*) into v_done, v_total
    from public.schedule_items where program_id = p_program and scheduled_date = private.today() and status in ('scheduled','completed');
  if hs.completed_at is null then
    perform private.add_timeline(hs.episode_id, 'HOME_SESSION_COMPLETED', 'أنهى جلسة منزلية (' || v_done || '/' || v_total || ')',
      case p_feeling when 'better' then 'الشعور بعد الجلسة: أفضل' when 'same' then 'الشعور بعد الجلسة: كما هو' when 'worse' then 'الشعور بعد الجلسة: أسوأ' else null end, hs.id, true);
    insert into public.analytics_events(user_id, event) values (auth.uid(), 'home_session_completed');
  end if;
  if p_feeling = 'worse' then
    perform private.raise_flag(hs.episode_id, 'feeling_worse', 'medium', 'شعر بأنه أسوأ بعد الجلسة المنزلية', nullif(trim(p_note),''), hs.id);
  end if;
  if nullif(trim(p_note),'') is not null then
    select full_name into v_pname from public.patients where id = v_patient;
    perform private.notify_care_team(hs.episode_id, 'feedback', 'ملاحظة جديدة من ' || v_pname, left(trim(p_note), 140), '/provider/patients/' || hs.episode_id);
  end if;
  return jsonb_build_object('ok', true, 'done', v_done, 'total', v_total);
end $$;

create or replace function public.patient_start_thread(p_category public.thread_category, p_subject text, p_body text, p_program_exercise uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_patient uuid := private.my_patient_id(); v_episode uuid; v_ex uuid; v_id uuid;
begin
  perform private.require(v_patient is not null, 'not_patient');
  perform private.require(char_length(trim(p_body)) between 1 and 4000, 'invalid_body');
  if p_program_exercise is not null then
    select hp.episode_id, pe.exercise_id into v_episode, v_ex
      from public.program_exercises pe join public.program_versions pv on pv.id = pe.program_version_id
      join public.home_programs hp on hp.id = pv.program_id
     where pe.id = p_program_exercise and hp.patient_id = v_patient and pv.status in ('published','superseded');
    perform private.require(v_episode is not null, 'invalid_exercise');
  else
    select id into v_episode from public.episodes where patient_id = v_patient and status = 'active' order by start_date desc limit 1;
  end if;
  insert into public.message_threads(patient_id, episode_id, subject, category, program_exercise_id, exercise_id, created_by)
  values (v_patient, v_episode, left(coalesce(nullif(trim(p_subject),''), 'رسالة جديدة'), 160), p_category, p_program_exercise, v_ex, auth.uid())
  returning id into v_id;
  insert into public.messages(thread_id, sender_id, body) values (v_id, auth.uid(), trim(p_body));
  return v_id;
end $$;

create or replace function public.request_appointment_change(p_appointment uuid, p_kind text, p_reason text default null, p_preferred text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_patient uuid := private.my_patient_id(); a public.appointments; v_id uuid;
begin
  select * into a from public.appointments where id = p_appointment and patient_id = v_patient;
  perform private.require(found, 'not_found');
  perform private.require(a.status in ('confirmed','pending_confirmation','requested') and a.starts_at > now(), 'not_changeable');
  perform private.require(p_kind in ('change','cancel'), 'invalid_kind');
  perform private.require(not exists (select 1 from public.appointment_change_requests where appointment_id = a.id and status = 'pending'), 'already_requested');
  insert into public.appointment_change_requests(appointment_id, patient_id, kind, reason, preferred)
  values (a.id, v_patient, p_kind, left(p_reason, 600), left(p_preferred, 200)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.update_notification_preferences(p_exercise boolean, p_appointments boolean, p_messages boolean, p_announcements boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_preferences(user_id, exercise_reminders, appointment_reminders, messages, announcements, updated_at)
  values (auth.uid(), p_exercise, p_appointments, p_messages, p_announcements, now())
  on conflict (user_id) do update set exercise_reminders = excluded.exercise_reminders, appointment_reminders = excluded.appointment_reminders,
    messages = excluded.messages, announcements = excluded.announcements, updated_at = now();
end $$;

-- =====================================================================
-- Messaging trigger: routing, notifications, attention, timeline
-- =====================================================================
create or replace function private.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.message_threads; v_role public.app_role; v_pname text;
begin
  select * into t from public.message_threads where id = new.thread_id;
  select role into v_role from public.profiles where id = new.sender_id;
  update public.message_threads set last_message_at = new.created_at, last_sender_role = v_role::text where id = t.id;
  insert into public.thread_reads(thread_id, user_id, last_read_at) values (t.id, new.sender_id, now())
    on conflict (thread_id, user_id) do update set last_read_at = now(), archived = false;
  if v_role = 'patient' then
    select full_name into v_pname from public.patients where id = t.patient_id;
    if t.episode_id is not null then
      perform private.notify_care_team(t.episode_id, 'message', 'رسالة جديدة من ' || v_pname, left(new.body, 140), '/provider/messages/' || t.id);
      perform private.raise_flag(t.episode_id, 'patient_message',
        case when t.category = 'pain' then 'high'::public.flag_severity else 'low'::public.flag_severity end,
        case t.category when 'exercise_question' then 'أرسل سؤالًا عن تمرين' when 'pain' then 'أرسل رسالة عن ألم أو صعوبة'
                        when 'appointment' then 'أرسل رسالة بخصوص موعد' else 'أرسل رسالة جديدة' end,
        t.subject, t.id);
    end if;
    insert into public.analytics_events(user_id, event) values (new.sender_id, 'message_sent');
  else
    perform private.notify_patient(t.patient_id, 'message', 'رد جديد من فريق رعايتك', left(new.body, 140), '/patient/messages/' || t.id);
    update public.attention_flags set status = 'resolved', resolved_by = new.sender_id, resolved_at = now(), resolution_note = 'تم الرد على الرسالة'
     where kind = 'patient_message' and source_id = t.id and status = 'open';
  end if;
  if t.episode_id is not null and not exists (select 1 from public.messages m where m.thread_id = t.id and m.id <> new.id) then
    perform private.add_timeline(t.episode_id, 'MESSAGE_SENT', 'محادثة جديدة: ' || t.subject, null, t.id, false);
  end if;
  return new;
end $$;
create trigger trg_on_message after insert on public.messages for each row execute function private.on_message();

grant execute on all functions in schema private to authenticated, anon;
