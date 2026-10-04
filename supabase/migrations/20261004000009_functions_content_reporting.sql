-- 09 Business logic: exercise studio, appointments, measurement, grants
-- =====================================================================
-- Exercise Studio & review workflow (§65–§69, §120)
-- =====================================================================
create or replace function public.create_exercise(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ex uuid; v_ver uuid; v_code text;
begin
  perform private.require(private.my_role() in ('provider','supervisor','admin','content_reviewer','super_admin'), 'forbidden');
  perform private.require(char_length(trim(coalesce(p->>'name',''))) >= 2, 'invalid_name');
  v_code := 'EX-' || lpad(nextval('public.exercise_seq')::text, 3, '0');
  insert into public.exercises(code, status, created_by) values (v_code, 'draft', auth.uid()) returning id into v_ex;
  insert into public.exercise_versions(exercise_id, version, status, name, name_en, description, instructions, specialty_code, body_region, category,
    exercise_type, difficulty, equipment, position, est_duration_sec, default_reps, default_sets, default_hold_sec, default_duration_sec,
    safety_notes, contraindications, tags, created_by)
  values (v_ex, 1, 'draft', trim(p->>'name'), nullif(p->>'name_en',''), nullif(p->>'description',''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'instructions','[]'::jsonb)) x where trim(x) <> ''), '{}'),
    nullif(p->>'specialty_code',''), nullif(p->>'body_region',''), nullif(p->>'category',''), nullif(p->>'exercise_type',''), nullif(p->>'difficulty',''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'equipment','[]'::jsonb)) x where trim(x) <> ''), '{}'),
    nullif(p->>'position',''), coalesce(nullif(p->>'est_duration_sec','')::int, 120),
    nullif(p->>'default_reps','')::int, nullif(p->>'default_sets','')::int, nullif(p->>'default_hold_sec','')::int, nullif(p->>'default_duration_sec','')::int,
    nullif(p->>'safety_notes',''), nullif(p->>'contraindications',''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'tags','[]'::jsonb)) x where trim(x) <> ''), '{}'), auth.uid())
  returning id into v_ver;
  update public.exercises set latest_version_id = v_ver where id = v_ex;
  insert into public.exercise_review_events(exercise_id, version_id, action, actor_id) values (v_ex, v_ver, 'created', auth.uid());
  return v_ex;
end $$;

create or replace function public.new_exercise_version(p_exercise uuid, p_safety boolean default false, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare ex public.exercises; v_ver uuid; v_next int;
begin
  perform private.require(private.my_role() in ('provider','supervisor','admin','content_reviewer','super_admin'), 'forbidden');
  select * into ex from public.exercises where id = p_exercise;
  perform private.require(found and ex.status <> 'archived', 'not_editable');
  select id into v_ver from public.exercise_versions where exercise_id = p_exercise and status in ('draft','in_review','changes_requested');
  if v_ver is not null then return v_ver; end if;
  select max(version) + 1 into v_next from public.exercise_versions where exercise_id = p_exercise;
  insert into public.exercise_versions(exercise_id, version, status, name, name_en, description, instructions, specialty_code, body_region, category,
    exercise_type, difficulty, equipment, position, video_path, thumbnail_path, video_duration_sec, media_status, captions_path, est_duration_sec,
    default_reps, default_sets, default_hold_sec, default_duration_sec, safety_notes, contraindications, tags, change_note, is_safety_update, created_by)
  select exercise_id, v_next, 'draft', name, name_en, description, instructions, specialty_code, body_region, category,
    exercise_type, difficulty, equipment, position, video_path, thumbnail_path, video_duration_sec, media_status, captions_path, est_duration_sec,
    default_reps, default_sets, default_hold_sec, default_duration_sec, safety_notes, contraindications, tags, p_note, p_safety and private.is_admin(), auth.uid()
  from public.exercise_versions where id = coalesce(ex.current_version_id, ex.latest_version_id)
  returning id into v_ver;
  update public.exercises set latest_version_id = v_ver where id = p_exercise;
  insert into public.exercise_review_events(exercise_id, version_id, action, comment, actor_id) values (p_exercise, v_ver, 'created', p_note, auth.uid());
  return v_ver;
end $$;

create or replace function public.submit_exercise_version(p_version uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.exercise_versions;
begin
  select * into v from public.exercise_versions where id = p_version;
  perform private.require(found and (v.created_by = auth.uid() or private.is_content_manager()), 'forbidden');
  perform private.require(v.status in ('draft','changes_requested','rejected'), 'invalid_transition');
  perform private.require(coalesce(array_length(v.instructions,1),0) > 0, 'instructions_required');
  perform private.require(v.body_region is not null and v.specialty_code is not null, 'metadata_required');
  perform private.via_rpc();
  update public.exercise_versions set status = 'in_review', submitted_by = auth.uid(), submitted_at = now() where id = p_version;
  update public.exercises set status = 'in_review' where id = v.exercise_id and current_version_id is null;
  insert into public.exercise_review_events(exercise_id, version_id, action, actor_id) values (v.exercise_id, v.id, 'submitted', auth.uid());
end $$;

create or replace function public.review_exercise_version(p_version uuid, p_decision text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.exercise_versions; ex public.exercises;
begin
  perform private.require(private.is_content_manager() or private.my_role() = 'supervisor', 'forbidden');
  select * into v from public.exercise_versions where id = p_version for update;
  perform private.require(found and v.status = 'in_review', 'invalid_transition');
  perform private.require(v.created_by is distinct from auth.uid() or private.my_role() = 'super_admin', 'separation_of_duties');
  perform private.require(p_decision in ('approved','changes_requested','rejected'), 'invalid_decision');
  perform private.require(p_decision = 'approved' or nullif(trim(p_comment),'') is not null, 'comment_required');
  perform private.via_rpc();
  update public.exercise_versions set status = p_decision::public.exercise_status, reviewed_by = auth.uid(), reviewed_at = now(), review_comment = nullif(trim(p_comment),'')
   where id = p_version;
  select * into ex from public.exercises where id = v.exercise_id;
  if p_decision = 'approved' then
    update public.exercises set status = 'approved', current_version_id = v.id where id = v.exercise_id;
  elsif ex.current_version_id is null then
    update public.exercises set status = p_decision::public.exercise_status where id = v.exercise_id;
  end if;
  insert into public.exercise_review_events(exercise_id, version_id, action, comment, actor_id) values (v.exercise_id, v.id, p_decision, nullif(trim(p_comment),''), auth.uid());
  perform private.notify(v.created_by, 'exercise_review',
    case p_decision when 'approved' then 'تم اعتماد التمرين' when 'rejected' then 'تم رفض التمرين' else 'مطلوب تعديل على التمرين' end,
    v.name || coalesce(' — ' || nullif(trim(p_comment),''), ''), '/admin/exercises/' || v.exercise_id);
end $$;

-- Archive instead of delete (§69): history stays readable, new prescriptions are blocked.
create or replace function public.archive_exercise(p_exercise uuid, p_reason text, p_restore boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare ex public.exercises;
begin
  perform private.require(private.is_content_manager(), 'forbidden');
  select * into ex from public.exercises where id = p_exercise;
  perform private.require(found, 'not_found');
  if p_restore then
    perform private.require(ex.status = 'archived', 'invalid_transition');
    update public.exercises set status = case when current_version_id is null then 'draft'::public.exercise_status else 'approved'::public.exercise_status end, archived_at = null, archived_by = null, archive_reason = null where id = p_exercise;
    insert into public.exercise_review_events(exercise_id, action, comment, actor_id) values (p_exercise, 'restored', p_reason, auth.uid());
  else
    perform private.require(nullif(trim(p_reason),'') is not null, 'reason_required');
    update public.exercises set status = 'archived', archived_at = now(), archived_by = auth.uid(), archive_reason = p_reason where id = p_exercise;
    insert into public.exercise_review_events(exercise_id, action, comment, actor_id) values (p_exercise, 'archived', p_reason, auth.uid());
  end if;
  perform private.audit(case when p_restore then 'restore' else 'archive' end, 'exercises', p_exercise::text, p_reason);
end $$;

-- Mandatory safety update: moves live prescriptions to the newest approved version with a full trail (§51).
create or replace function public.apply_safety_update(p_exercise uuid, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare ex public.exercises; n int;
begin
  perform private.require(private.is_admin(), 'forbidden');
  perform private.require(nullif(trim(p_reason),'') is not null, 'reason_required');
  select * into ex from public.exercises where id = p_exercise;
  perform private.require(ex.status = 'approved' and ex.current_version_id is not null, 'not_approved');
  with upd as (
    update public.program_exercises pe set exercise_version_id = ex.current_version_id
      from public.program_versions pv join public.home_programs hp on hp.id = pv.program_id
     where pe.program_version_id = pv.id and pv.status in ('published','draft') and hp.status in ('active','scheduled','paused','draft')
       and pe.exercise_id = p_exercise and pe.exercise_version_id <> ex.current_version_id
    returning pe.id)
  select count(*) into n from upd;
  insert into public.exercise_review_events(exercise_id, version_id, action, comment, actor_id) values (p_exercise, ex.current_version_id, 'safety_update', p_reason, auth.uid());
  perform private.audit('safety_update', 'exercises', p_exercise::text, p_reason, null, jsonb_build_object('prescriptions_updated', n, 'version_id', ex.current_version_id));
  return n;
end $$;

-- =====================================================================
-- Appointments & requests (admin)
-- =====================================================================
create or replace function public.update_request_status(p_request uuid, p_status public.request_status, p_internal text default null, p_public text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  perform private.require(p_status <> 'rejected' or nullif(trim(p_public),'') is not null, 'reason_required');
  update public.appointment_requests set status = p_status, handled_by = auth.uid(),
         internal_note = coalesce(nullif(trim(p_internal),''), internal_note) where id = p_request;
  insert into public.request_events(request_id, status, note, public_note, actor_id)
  values (p_request, p_status, nullif(trim(p_internal),''), nullif(trim(p_public),''), auth.uid());
end $$;

create or replace function public.schedule_appointment(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_patient uuid; v_req uuid; v_ep uuid; v_start timestamptz; v_prov uuid; v_name text;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  v_patient := (p->>'patient_id')::uuid;
  v_req := nullif(p->>'request_id','')::uuid;
  v_ep := nullif(p->>'episode_id','')::uuid;
  v_prov := nullif(p->>'provider_id','')::uuid;
  v_start := (p->>'starts_at')::timestamptz;
  perform private.require(exists (select 1 from public.patients where id = v_patient), 'invalid_patient');
  perform private.require(v_ep is null or exists (select 1 from public.episodes where id = v_ep and patient_id = v_patient), 'invalid_episode');
  perform private.require(v_start > now() - interval '1 day', 'invalid_time');
  if v_prov is not null then
    perform private.require(not exists (
      select 1 from public.appointments a where a.provider_id = v_prov and a.status in ('confirmed','checked_in','pending_confirmation')
        and tstzrange(a.starts_at, a.starts_at + make_interval(mins => a.duration_min)) &&
            tstzrange(v_start, v_start + make_interval(mins => coalesce(nullif(p->>'duration_min','')::int, 45)))), 'provider_conflict');
  end if;
  insert into public.appointments(patient_id, episode_id, specialty_code, provider_id, starts_at, duration_min, location, status, notes, request_id, created_by)
  values (v_patient, v_ep, coalesce(nullif(p->>'specialty_code',''), (select specialty_code from public.episodes where id = v_ep)), v_prov, v_start,
          coalesce(nullif(p->>'duration_min','')::int, 45), nullif(p->>'location',''), coalesce(nullif(p->>'status','')::public.appointment_status, 'confirmed'),
          nullif(p->>'notes',''), v_req, auth.uid())
  returning id into v_id;
  if v_req is not null then
    update public.appointment_requests set status = 'scheduled', appointment_id = v_id, patient_id = v_patient, handled_by = auth.uid() where id = v_req;
    insert into public.request_events(request_id, status, public_note, actor_id)
    values (v_req, 'scheduled', 'تم تحديد موعدك: ' || to_char(v_start at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI'), auth.uid());
  end if;
  perform private.notify_patient(v_patient, 'appointment', 'موعد جديد', to_char(v_start at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || coalesce(' — ' || nullif(p->>'location',''), ''), '/patient/appointments');
  if v_prov is not null then
    select full_name into v_name from public.patients where id = v_patient;
    perform private.notify(v_prov, 'appointment', 'موعد جديد في جدولك', v_name || ' — ' || to_char(v_start at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI'), '/provider/calendar');
  end if;
  return v_id;
end $$;

create or replace function public.set_appointment_status(p_appointment uuid, p_status public.appointment_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_appointment for update;
  perform private.require(found and (private.is_supervisor_plus() or a.provider_id = auth.uid()), 'forbidden');
  update public.appointments set status = p_status, notes = coalesce(nullif(trim(p_note),''), notes) where id = p_appointment;
  if p_status = 'completed' and a.episode_id is not null then
    perform private.add_timeline(a.episode_id, 'APPOINTMENT_COMPLETED', 'جلسة حضورية مكتملة', to_char(a.starts_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD'), a.id, true);
  elsif p_status = 'no_show' and a.episode_id is not null then
    perform private.add_timeline(a.episode_id, 'APPOINTMENT_NO_SHOW', 'لم يحضر الموعد', to_char(a.starts_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD'), a.id, false);
  elsif p_status in ('cancelled','rescheduled') then
    perform private.notify_patient(a.patient_id, 'appointment', case when p_status = 'cancelled' then 'تم إلغاء موعدك' else 'تم تغيير موعدك' end,
      to_char(a.starts_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI') || coalesce(' — ' || nullif(trim(p_note),''), ''), '/patient/appointments');
  end if;
end $$;

create or replace function public.handle_change_request(p_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare cr public.appointment_change_requests;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select * into cr from public.appointment_change_requests where id = p_id and status = 'pending';
  perform private.require(found, 'not_found');
  perform private.require(p_decision in ('approved','declined'), 'invalid');
  update public.appointment_change_requests set status = p_decision, handled_by = auth.uid(), handled_at = now() where id = p_id;
  if p_decision = 'approved' then
    perform public.set_appointment_status(cr.appointment_id, case when cr.kind = 'cancel' then 'cancelled'::public.appointment_status else 'rescheduled'::public.appointment_status end, p_note);
  else
    perform private.notify_patient(cr.patient_id, 'appointment', 'تعذّر تنفيذ طلب تغيير الموعد', p_note, '/patient/appointments');
  end if;
end $$;

create or replace function public.publish_announcement(p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare a public.announcements; n int := 0; r record;
begin
  perform private.require(private.is_admin(), 'forbidden');
  select * into a from public.announcements where id = p_id;
  perform private.require(found, 'not_found');
  update public.announcements set is_published = true, published_at = coalesce(published_at, now()) where id = p_id;
  for r in select id from public.profiles where status = 'active'
             and (a.audience = 'all' or (a.audience = 'patients' and role = 'patient') or (a.audience = 'staff' and role <> 'patient')) loop
    perform private.notify(r.id, 'announcement', a.title, left(a.body, 160), null);
    n := n + 1;
  end loop;
  perform private.audit('publish', 'announcements', p_id::text, a.title);
  return n;
end $$;

-- =====================================================================
-- Measurement (§26, §81–§84)
-- =====================================================================
-- Adherence = completed eligible ÷ eligible. Cancelled and paused tasks are excluded;
-- today's tasks count only once completed (the day is not over yet).
create or replace function public.adherence(p_patient uuid default null, p_episode uuid default null, p_from date default null, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_patient uuid := coalesce(p_patient, private.my_patient_id()); v_from date; v_to date; e int; c int; sd int; sc int;
begin
  perform private.require(v_patient is not null and private.can_access_patient(v_patient), 'forbidden');
  v_to := least(coalesce(p_to, private.today()), private.today());
  v_from := coalesce(p_from, v_to - 6);
  select count(*) filter (where status = 'completed' or scheduled_date < private.today()),
         count(*) filter (where status = 'completed')
    into e, c
    from public.schedule_items
   where patient_id = v_patient and (p_episode is null or episode_id = p_episode)
     and scheduled_date between v_from and v_to and status in ('scheduled','completed');
  -- session adherence: days on which every required task was completed
  select count(*), count(*) filter (where all_done) into sd, sc from (
    select scheduled_date, bool_and(status = 'completed') all_done
      from public.schedule_items si join public.program_exercises pe on pe.id = si.program_exercise_id and pe.is_required
     where si.patient_id = v_patient and (p_episode is null or si.episode_id = p_episode)
       and si.scheduled_date between v_from and v_to and si.status in ('scheduled','completed')
       and (si.scheduled_date < private.today() or si.status = 'completed')
     group by scheduled_date) d;
  return jsonb_build_object('from', v_from, 'to', v_to, 'eligible', e, 'completed', c,
    'rate', case when e > 0 then round(100.0 * c / e) else null end,
    'session_days', sd, 'session_days_completed', sc,
    'session_rate', case when sd > 0 then round(100.0 * sc / sd) else null end);
end $$;

create or replace function public.adherence_daily(p_patient uuid default null, p_days integer default 14, p_episode uuid default null)
returns table(day date, eligible integer, completed integer, rate integer)
language plpgsql stable security definer set search_path = public as $$
declare v_patient uuid := coalesce(p_patient, private.my_patient_id());
begin
  perform private.require(v_patient is not null and private.can_access_patient(v_patient), 'forbidden');
  return query
  select d::date,
    (count(si.id) filter (where si.status = 'completed' or si.scheduled_date < private.today()))::int,
    (count(si.id) filter (where si.status = 'completed'))::int,
    case when count(si.id) filter (where si.status = 'completed' or si.scheduled_date < private.today()) > 0
      then round(100.0 * count(si.id) filter (where si.status = 'completed') / count(si.id) filter (where si.status = 'completed' or si.scheduled_date < private.today()))::int
      else null end
  from generate_series(private.today() - (p_days - 1), private.today(), interval '1 day') d
  left join public.schedule_items si on si.patient_id = v_patient and si.scheduled_date = d::date and si.status in ('scheduled','completed')
       and (p_episode is null or si.episode_id = p_episode)
  group by d order by d;
end $$;

create or replace function public.admin_kpis()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select jsonb_build_object(
    'active_patients', (select count(distinct patient_id) from public.episodes where status = 'active'),
    'active_episodes', (select count(*) from public.episodes where status = 'active'),
    'new_episodes_30d', (select count(*) from public.episodes where created_at > now() - interval '30 days'),
    'completed_episodes_30d', (select count(*) from public.episodes where status in ('completed','discharged') and updated_at > now() - interval '30 days'),
    'todays_appointments', (select count(*) from public.appointments where (starts_at at time zone 'Asia/Riyadh')::date = private.today() and status not in ('cancelled','rescheduled')),
    'appointment_requests', (select count(*) from public.appointment_requests where status in ('new','under_review','need_information')),
    'unassigned', (select count(*) from public.episodes e where e.status = 'active' and not exists (select 1 from public.care_team_members m where m.episode_id = e.id and m.role = 'primary' and m.ended_at is null)),
    'active_programs', (select count(*) from public.home_programs where status = 'active'),
    'attention_flags', (select count(*) from public.attention_flags where status = 'open'),
    'unread_patient_messages', (select count(*) from public.message_threads t where t.status = 'open' and t.last_sender_role = 'patient'),
    'no_shows_30d', (select count(*) from public.appointments where status = 'no_show' and starts_at > now() - interval '30 days'),
    'pending_reviews', (select count(*) from public.exercise_versions where status = 'in_review'),
    'change_requests', (select count(*) from public.appointment_change_requests where status = 'pending'),
    'adherence_7d', (select case when count(*) filter (where status = 'completed' or scheduled_date < private.today()) > 0 then
        round(100.0 * count(*) filter (where status = 'completed') / count(*) filter (where status = 'completed' or scheduled_date < private.today())) end
        from public.schedule_items where scheduled_date between private.today() - 6 and private.today() and status in ('scheduled','completed'))
  ) into v;
  return v;
end $$;

create or replace function public.provider_caseload()
returns table(provider_id uuid, full_name text, title text, specialty_code text, capacity integer, status public.account_status, active_episodes integer, primary_episodes integer)
language plpgsql stable security definer set search_path = public as $$
begin
  perform private.require(private.is_staff(), 'forbidden');
  return query
  select pr.id, pr.full_name, sp.title, sp.specialty_code, sp.capacity, pr.status,
    (select count(*) from public.care_team_members m join public.episodes e on e.id = m.episode_id and e.status in ('active','on_hold')
      where m.provider_id = pr.id and m.ended_at is null)::int,
    (select count(*) from public.care_team_members m join public.episodes e on e.id = m.episode_id and e.status in ('active','on_hold')
      where m.provider_id = pr.id and m.ended_at is null and m.role = 'primary')::int
  from public.profiles pr left join public.staff_profiles sp on sp.user_id = pr.id
  where pr.role in ('provider','supervisor')
  order by pr.full_name;
end $$;

create or replace function public.engagement_report(p_days integer default 28)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_from date := private.today() - (p_days - 1);
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  select jsonb_build_object(
    'sessions_assigned', (select count(distinct (program_id, scheduled_date)) from public.schedule_items where scheduled_date between v_from and private.today() and status in ('scheduled','completed')),
    'sessions_completed', (select count(*) from public.home_sessions where session_date between v_from and private.today() and completed_at is not null),
    'exercises_assigned', (select count(*) from public.schedule_items where scheduled_date between v_from and private.today() and status in ('scheduled','completed')),
    'exercises_completed', (select count(*) from public.schedule_items where scheduled_date between v_from and private.today() and status = 'completed'),
    'inactive_patients', (select count(distinct hp.patient_id) from public.home_programs hp where hp.status = 'active'
        and not exists (select 1 from public.schedule_items si where si.program_id = hp.id and si.status = 'completed' and si.scheduled_date >= private.today() - 6)),
    'issues', (select count(*) from public.issue_reports where created_at::date >= v_from),
    'weekly', (select coalesce(jsonb_agg(w order by w->>'week'), '[]') from (
        select jsonb_build_object('week', to_char(date_trunc('week', scheduled_date + 1) - interval '1 day', 'YYYY-MM-DD'),
          'eligible', count(*) filter (where status = 'completed' or scheduled_date < private.today()),
          'completed', count(*) filter (where status = 'completed')) w
        from public.schedule_items where scheduled_date between v_from and private.today() and status in ('scheduled','completed')
        group by date_trunc('week', scheduled_date + 1)) x),
    'feelings', (select jsonb_build_object('better', count(*) filter (where feeling = 'better'), 'same', count(*) filter (where feeling = 'same'), 'worse', count(*) filter (where feeling = 'worse'))
        from public.home_sessions where session_date between v_from and private.today()),
    'avg_pain', (select round(avg(pain_score), 1) from public.exercise_completions where completed_at::date >= v_from and pain_score is not null)
  ) into v;
  return v;
end $$;

-- Lock down: RPCs are callable only by the roles that need them.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.request_patient_otp(text), public.verify_patient_otp(text, text),
  public.submit_appointment_request(jsonb), public.track_appointment_request(text, text), public.record_login(boolean, text, text) to anon;
grant execute on all functions in schema private to authenticated, anon;
