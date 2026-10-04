-- =====================================================================
-- 07 Business logic part 2: programs, attention, admin, exercises, reporting
-- =====================================================================
-- Home programs: create → draft → publish (versioned) → pause/resume/end
-- =====================================================================
create or replace function public.create_home_program(p_episode uuid, p_title text, p_start date, p_end date,
  p_template uuid default null, p_instructions text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.episodes; v_prog uuid; v_ver uuid; r record; i int := 0;
begin
  perform private.require(private.staff_can_access_episode(p_episode) and private.my_role() in ('provider','supervisor','admin','super_admin'), 'forbidden');
  select * into e from public.episodes where id = p_episode;
  perform private.require(e.status in ('active','draft'), 'episode_closed');   -- BR-015
  perform private.require(p_end >= p_start, 'invalid_dates');
  perform private.require(p_end <= p_start + 365, 'too_long');
  perform private.via_rpc();
  insert into public.home_programs(episode_id, patient_id, title, status, start_date, end_date, instructions, template_id, created_by)
  values (p_episode, e.patient_id, coalesce(nullif(trim(p_title),''), 'البرنامج المنزلي'), 'draft', p_start, p_end, p_instructions, p_template, auth.uid())
  returning id into v_prog;
  insert into public.program_versions(program_id, version, status, created_by, instructions) values (v_prog, 1, 'draft', auth.uid(), p_instructions)
  returning id into v_ver;
  if p_template is not null then
    for r in select te.*, ex.current_version_id, ev.default_reps, ev.default_sets, ev.default_hold_sec, ev.default_duration_sec
               from public.template_exercises te join public.exercises ex on ex.id = te.exercise_id and ex.status = 'approved'
               join public.exercise_versions ev on ev.id = ex.current_version_id
              where te.template_id = p_template order by te.order_index loop
      i := i + 1;
      insert into public.program_exercises(program_version_id, exercise_id, exercise_version_id, order_index, reps, sets, hold_sec, duration_sec, days_of_week, instructions)
      values (v_ver, r.exercise_id, r.current_version_id, i, coalesce(r.reps, r.default_reps), coalesce(r.sets, r.default_sets),
              coalesce(r.hold_sec, r.default_hold_sec), coalesce(r.duration_sec, r.default_duration_sec), r.days_of_week, r.instructions);
    end loop;
  end if;
  return v_prog;
end $$;

-- Opens (or returns) the draft revision of a program, cloned from the live version.
create or replace function public.create_program_revision(p_program uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare hp public.home_programs; v_draft uuid; v_next int;
begin
  select * into hp from public.home_programs where id = p_program;
  perform private.require(found and private.staff_can_access_episode(hp.episode_id) and private.my_role() in ('provider','supervisor','admin','super_admin'), 'forbidden');
  perform private.require(hp.status not in ('completed','cancelled','superseded'), 'program_closed');
  select id into v_draft from public.program_versions where program_id = p_program and status = 'draft';
  if v_draft is not null then return v_draft; end if;
  select coalesce(max(version),0) + 1 into v_next from public.program_versions where program_id = p_program;
  insert into public.program_versions(program_id, version, status, created_by, instructions)
  values (p_program, v_next, 'draft', auth.uid(), (select instructions from public.program_versions where id = hp.current_version_id))
  returning id into v_draft;
  insert into public.program_exercises(program_version_id, exercise_id, exercise_version_id, order_index, reps, sets, hold_sec, duration_sec,
     schedule_type, days_of_week, specific_dates, interval_days, start_date, end_date, instructions, is_required, request_feedback)
  select v_draft, exercise_id, exercise_version_id, order_index, reps, sets, hold_sec, duration_sec,
     schedule_type, days_of_week, specific_dates, interval_days, start_date, end_date, instructions, is_required, request_feedback
    from public.program_exercises where program_version_id = hp.current_version_id;
  return v_draft;
end $$;

create or replace function public.discard_program_draft(p_version uuid)
returns void language plpgsql security definer set search_path = public as $$
declare pv public.program_versions; hp public.home_programs;
begin
  select * into pv from public.program_versions where id = p_version;
  select * into hp from public.home_programs where id = pv.program_id;
  perform private.require(pv.status = 'draft' and private.staff_can_access_episode(hp.episode_id), 'forbidden');
  perform private.require(hp.current_version_id is not null, 'cannot_discard_first_version');
  -- drafts are never deleted: they are marked discarded and kept for history
  update public.program_versions set status = 'discarded' where id = pv.id;
end $$;

create or replace function public.add_program_exercise(p_version uuid, p_exercise uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare pv public.program_versions; hp public.home_programs; ex public.exercises; ev public.exercise_versions; v_id uuid; v_order int;
begin
  select * into pv from public.program_versions where id = p_version;
  select * into hp from public.home_programs where id = pv.program_id;
  perform private.require(pv.status = 'draft' and private.staff_can_access_episode(hp.episode_id), 'forbidden');
  select * into ex from public.exercises where id = p_exercise;
  perform private.require(ex.status = 'approved' and ex.current_version_id is not null, 'exercise_not_approved');   -- BR-006
  select * into ev from public.exercise_versions where id = ex.current_version_id;
  select coalesce(max(order_index),0) + 1 into v_order from public.program_exercises where program_version_id = p_version;
  insert into public.program_exercises(program_version_id, exercise_id, exercise_version_id, order_index, reps, sets, hold_sec, duration_sec)
  values (p_version, ex.id, ev.id, v_order, ev.default_reps, ev.default_sets, ev.default_hold_sec, ev.default_duration_sec)
  returning id into v_id;
  return v_id;
end $$;

-- Generates concrete dated tasks for one prescription line.
create or replace function private.generate_schedule(p_pe uuid, p_from date, p_to date)
returns integer language plpgsql security definer set search_path = public as $$
declare pe public.program_exercises; pv public.program_versions; hp public.home_programs; d date; v_start date; v_end date; n int := 0;
begin
  select * into pe from public.program_exercises where id = p_pe;
  select * into pv from public.program_versions where id = pe.program_version_id;
  select * into hp from public.home_programs where id = pv.program_id;
  v_start := greatest(p_from, coalesce(pe.start_date, hp.start_date), hp.start_date);
  v_end := least(p_to, coalesce(pe.end_date, hp.end_date), hp.end_date);
  if v_start > v_end then return 0; end if;
  for d in select generate_series(v_start, v_end, interval '1 day')::date loop
    if pe.schedule_type = 'daily'
       or (pe.schedule_type = 'weekly' and extract(dow from d)::smallint = any(pe.days_of_week))
       or (pe.schedule_type = 'dates' and d = any(pe.specific_dates))
       or (pe.schedule_type = 'interval' and ((d - coalesce(pe.start_date, hp.start_date)) % greatest(pe.interval_days,1)) = 0) then
      insert into public.schedule_items(program_id, program_version_id, program_exercise_id, patient_id, episode_id, scheduled_date)
      values (hp.id, pv.id, pe.id, hp.patient_id, hp.episode_id, d)
      on conflict (program_exercise_id, scheduled_date) do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.publish_program_version(p_version uuid, p_effective date default null, p_summary text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pv public.program_versions; hp public.home_programs; e public.episodes; v_eff date; v_count int; v_items int := 0; r record; v_first boolean;
begin
  select * into pv from public.program_versions where id = p_version for update;
  perform private.require(found, 'not_found');
  select * into hp from public.home_programs where id = pv.program_id for update;
  perform private.require(private.staff_can_access_episode(hp.episode_id) and private.my_role() in ('provider','supervisor','admin','super_admin'), 'forbidden');
  perform private.require(pv.status = 'draft', 'not_draft');
  select * into e from public.episodes where id = hp.episode_id;
  perform private.require(e.status = 'active', 'episode_not_active');
  perform private.require(hp.status not in ('completed','cancelled'), 'program_closed');
  v_first := hp.current_version_id is null;
  v_eff := greatest(coalesce(p_effective, private.today()), private.today(), hp.start_date);
  perform private.require(v_eff <= hp.end_date, 'effective_after_end');

  -- 1. Validation
  select count(*) into v_count from public.program_exercises where program_version_id = pv.id;
  perform private.require(v_count > 0, 'no_exercises');
  perform private.require(not exists (
    select 1 from public.program_exercises pe join public.exercise_versions ev on ev.id = pe.exercise_version_id
    join public.exercises ex on ex.id = pe.exercise_id
    where pe.program_version_id = pv.id and (ev.status <> 'approved' or ex.status = 'archived')), 'exercise_not_approved');
  perform private.require(not exists (
    select 1 from public.program_exercises pe where pe.program_version_id = pv.id and (
      (pe.schedule_type = 'weekly' and coalesce(array_length(pe.days_of_week,1),0) = 0) or
      (pe.schedule_type = 'dates' and coalesce(array_length(pe.specific_dates,1),0) = 0) or
      (pe.schedule_type = 'interval' and pe.interval_days is null) or
      (coalesce(pe.reps,0) = 0 and coalesce(pe.duration_sec,0) = 0 and coalesce(pe.hold_sec,0) = 0))), 'invalid_prescription');

  perform private.via_rpc();
  -- 2. Version bookkeeping (history is never deleted — BR-008)
  update public.program_versions set status = 'superseded' where program_id = hp.id and status = 'published';
  update public.program_versions set status = 'published', effective_date = v_eff, published_by = auth.uid(), published_at = now(),
         change_summary = nullif(trim(p_summary),'') where id = pv.id;
  -- 3. Schedule: change applies from the effective date only (§101)
  update public.schedule_items set status = 'cancelled'
   where program_id = hp.id and scheduled_date >= v_eff and status in ('scheduled','paused')
     and not exists (select 1 from public.exercise_completions c where c.schedule_item_id = schedule_items.id);
  for r in select id from public.program_exercises where program_version_id = pv.id loop
    v_items := v_items + private.generate_schedule(r.id, v_eff, hp.end_date);
  end loop;
  -- Exercises already completed today under the previous version stay done.
  update public.home_programs set current_version_id = pv.id,
         status = case when v_eff > private.today() then 'scheduled'::public.program_status else 'active'::public.program_status end,
         paused_at = null
   where id = hp.id;
  -- 4. Timeline, audit, notification
  perform private.add_timeline(hp.episode_id, case when v_first then 'PROGRAM_PUBLISHED' else 'PROGRAM_UPDATED' end,
    case when v_first then 'تم نشر البرنامج المنزلي: ' else 'تم تحديث البرنامج المنزلي: ' end || hp.title,
    'النسخة ' || pv.version || ' — يسري من ' || to_char(v_eff, 'YYYY-MM-DD') || coalesce(' · ' || nullif(trim(p_summary),''), ''), pv.id, true);
  perform private.audit('publish', 'program_versions', pv.id::text, 'نشر النسخة ' || pv.version || ' من ' || hp.title, null,
    jsonb_build_object('effective_date', v_eff, 'exercises', v_count, 'schedule_items', v_items));
  perform private.notify_patient(hp.patient_id, 'program',
    case when v_first then 'برنامجك المنزلي جاهز' else 'تم تحديث برنامجك المنزلي' end,
    hp.title || ' — ابتداءً من ' || to_char(v_eff, 'YYYY-MM-DD'), '/patient');
  insert into public.analytics_events(user_id, event) values (auth.uid(), 'program_published');
  return jsonb_build_object('ok', true, 'version', pv.version, 'effective_date', v_eff, 'items', v_items);
end $$;

create or replace function public.set_program_status(p_program uuid, p_status public.program_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare hp public.home_programs;
begin
  select * into hp from public.home_programs where id = p_program for update;
  perform private.require(found and private.staff_can_access_episode(hp.episode_id) and private.my_role() in ('provider','supervisor','admin','super_admin'), 'forbidden');
  perform private.via_rpc();
  if p_status = 'paused' then
    perform private.require(hp.status in ('active','scheduled'), 'invalid_transition');
    update public.schedule_items set status = 'paused' where program_id = hp.id and scheduled_date >= private.today() and status = 'scheduled';  -- BR-013
    update public.home_programs set status = 'paused', paused_at = now() where id = hp.id;
    perform private.add_timeline(hp.episode_id, 'PROGRAM_PAUSED', 'تم إيقاف البرنامج مؤقتًا: ' || hp.title, p_reason, hp.id, true);
    perform private.notify_patient(hp.patient_id, 'program', 'تم إيقاف برنامجك المنزلي مؤقتًا', p_reason, '/patient/plan');
  elsif p_status = 'active' then
    perform private.require(hp.status = 'paused', 'invalid_transition');
    update public.schedule_items set status = 'scheduled' where program_id = hp.id and scheduled_date >= private.today() and status = 'paused';
    update public.home_programs set status = 'active', paused_at = null where id = hp.id;
    perform private.add_timeline(hp.episode_id, 'PROGRAM_RESUMED', 'تم استئناف البرنامج: ' || hp.title, p_reason, hp.id, true);
    perform private.notify_patient(hp.patient_id, 'program', 'تم استئناف برنامجك المنزلي', null, '/patient');
  elsif p_status in ('completed','cancelled') then
    perform private.require(hp.status in ('active','scheduled','paused','draft'), 'invalid_transition');
    update public.schedule_items set status = 'cancelled' where program_id = hp.id and scheduled_date >= private.today() and status in ('scheduled','paused');
    update public.home_programs set status = p_status, ended_at = now() where id = hp.id;
    update public.program_versions set status = 'discarded' where program_id = hp.id and status = 'draft' and hp.current_version_id is not null;
    perform private.add_timeline(hp.episode_id, case when p_status = 'completed' then 'PROGRAM_COMPLETED' else 'PROGRAM_CANCELLED' end,
      case when p_status = 'completed' then 'تم إنهاء البرنامج: ' else 'تم إلغاء البرنامج: ' end || hp.title, p_reason, hp.id, true);
  else
    raise exception 'invalid_transition';
  end if;
  update public.attention_flags set status = 'resolved', resolved_at = now(), resolved_by = auth.uid(), resolution_note = 'تغيّرت حالة البرنامج'
   where episode_id = hp.episode_id and kind in ('program_ending','inactivity') and status = 'open' and p_status <> 'active';
end $$;

create or replace function public.duplicate_program(p_program uuid, p_episode uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare hp public.home_programs; v_new uuid; v_ver uuid; v_len int; v_target uuid;
begin
  select * into hp from public.home_programs where id = p_program;
  v_target := coalesce(p_episode, hp.episode_id);
  perform private.require(private.staff_can_access_episode(hp.episode_id) and private.staff_can_access_episode(v_target), 'forbidden');
  v_len := hp.end_date - hp.start_date;
  v_new := public.create_home_program(v_target, hp.title || ' (نسخة)', private.today(), private.today() + v_len, null, hp.instructions);
  select id into v_ver from public.program_versions where program_id = v_new and status = 'draft';
  insert into public.program_exercises(program_version_id, exercise_id, exercise_version_id, order_index, reps, sets, hold_sec, duration_sec,
     schedule_type, days_of_week, specific_dates, interval_days, instructions, is_required, request_feedback)
  select v_ver, pe.exercise_id, ex.current_version_id, pe.order_index, pe.reps, pe.sets, pe.hold_sec, pe.duration_sec,
     case when pe.schedule_type = 'dates' then 'weekly' else pe.schedule_type end, pe.days_of_week, '{}', pe.interval_days, pe.instructions, pe.is_required, pe.request_feedback
    from public.program_exercises pe join public.exercises ex on ex.id = pe.exercise_id and ex.status = 'approved'
   where pe.program_version_id = coalesce(hp.current_version_id, (select id from public.program_versions where program_id = hp.id order by version desc limit 1));
  return v_new;
end $$;

-- =====================================================================
-- Attention center
-- =====================================================================
create or replace function public.resolve_flag(p_flag uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare f public.attention_flags;
begin
  select * into f from public.attention_flags where id = p_flag;
  perform private.require(found and private.staff_can_access_episode(f.episode_id), 'forbidden');
  update public.attention_flags set status = 'resolved', resolved_by = auth.uid(), resolved_at = now(), resolution_note = nullif(trim(p_note),'') where id = p_flag;
  if f.kind = 'issue_reported' and f.source_id is not null then
    update public.issue_reports set status = 'resolved', handled_by = auth.uid(), handled_at = now() where id = f.source_id;
  end if;
end $$;

-- Rule-based scan (configurable thresholds, §34). Informative only — never a clinical decision.
create or replace function public.refresh_attention_flags()
returns integer language plpgsql security definer set search_path = public as $$
declare v_days int; v_ending int; n int := 0; r record;
begin
  perform private.require(private.is_staff(), 'forbidden');
  v_days := coalesce((private.setting('inactivity_days', '3'::jsonb))::text::int, 3);
  v_ending := coalesce((private.setting('program_ending_days', '3'::jsonb))::text::int, 3);
  for r in
    select hp.episode_id, hp.id, hp.title from public.home_programs hp join public.episodes e on e.id = hp.episode_id and e.status = 'active'
     where hp.status = 'active'
       and exists (select 1 from public.schedule_items si where si.program_id = hp.id and si.scheduled_date between private.today() - v_days and private.today() - 1 and si.status = 'scheduled')
       and not exists (select 1 from public.schedule_items si where si.program_id = hp.id and si.scheduled_date between private.today() - v_days and private.today() and si.status = 'completed')
  loop
    perform private.raise_flag(r.episode_id, 'inactivity', 'medium', 'لم ينفذ البرنامج خلال آخر ' || v_days || ' أيام', r.title, r.id);
    n := n + 1;
  end loop;
  for r in
    select hp.episode_id, hp.id, hp.title, hp.end_date from public.home_programs hp
     where hp.status = 'active' and hp.end_date between private.today() and private.today() + v_ending
  loop
    perform private.raise_flag(r.episode_id, 'program_ending', 'low', 'البرنامج المنزلي ينتهي ' || to_char(r.end_date, 'YYYY-MM-DD'), r.title, r.id);
    n := n + 1;
  end loop;
  -- auto-resolve inactivity once the patient is active again
  update public.attention_flags f set status = 'resolved', resolved_at = now(), resolution_note = 'عاد المراجع للتنفيذ'
   where f.kind = 'inactivity' and f.status = 'open'
     and exists (select 1 from public.schedule_items si where si.program_id = f.source_id and si.status = 'completed' and si.completed_at > f.created_at);
  -- programs whose end date passed are completed automatically
  perform private.via_rpc();
  update public.home_programs set status = 'completed', ended_at = now() where status in ('active','scheduled') and end_date < private.today();
  update public.home_programs set status = 'active' where status = 'scheduled' and current_version_id is not null
     and (select effective_date from public.program_versions where id = current_version_id) <= private.today();
  return n;
end $$;

create or replace function public.acknowledge_issue(p_issue uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare ir public.issue_reports;
begin
  select * into ir from public.issue_reports where id = p_issue;
  perform private.require(found and private.staff_can_access_episode(ir.episode_id), 'forbidden');
  perform private.require(p_status in ('acknowledged','resolved'), 'invalid');
  update public.issue_reports set status = p_status, handled_by = auth.uid(), handled_at = now() where id = p_issue;
  if p_status = 'resolved' then
    update public.attention_flags set status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
     where kind = 'issue_reported' and source_id = p_issue and status = 'open';
  end if;
end $$;

-- Record access is itself audited (§93 "Patient Record Access").
create or replace function public.log_record_access(p_episode uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean := private.staff_can_access_episode(p_episode); v_patient uuid;
begin
  select patient_id into v_patient from public.episodes where id = p_episode;
  perform private.audit(case when v_ok then 'view' else 'access_denied' end, 'patient_record', coalesce(v_patient::text, p_episode::text),
    null, null, null, jsonb_build_object('episode_id', p_episode));
  return v_ok;
end $$;

create or replace function public.log_export(p_entity text, p_rows integer, p_filters jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform private.require(private.is_supervisor_plus(), 'forbidden');
  perform private.audit('export', p_entity, null, 'تصدير ' || p_rows || ' سجل', null, null, p_filters);
end $$;

