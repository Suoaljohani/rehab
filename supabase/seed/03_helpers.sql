-- Seed 03 — helper functions used only by the demo seed (not exposed via the API)
create or replace function private.seed_patient(p_access text, p_name text, p_name_en text, p_nid text, p_dob date, p_sex text, p_phone text, p_created timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_id uuid;
begin
  select id into v_id from public.patients where access_id = p_access;
  if v_id is not null then return v_id; end if;
  v_user := private.create_auth_user(lower(p_access) || '@patients.masar.health', private.random_secret(), '{"kind":"patient"}');
  insert into public.profiles(id, role, full_name, full_name_en, phone, created_at) values (v_user, 'patient', p_name, p_name_en, p_phone, p_created);
  insert into public.notification_preferences(user_id) values (v_user);
  insert into public.patients(user_id, mrn, access_id, national_id, full_name, full_name_en, date_of_birth, sex, phone, phone_verified, created_at)
  values (v_user, 'MRN-' || nextval('public.mrn_seq'), p_access, p_nid, p_name, p_name_en, p_dob, p_sex, p_phone, true, p_created)
  returning id into v_id;
  return v_id;
end $$;

create or replace function private.seed_episode(p_patient uuid, p_spec text, p_title text, p_referral text, p_dx text, p_goal text,
  p_provider_email text, p_start date, p_status public.episode_status default 'active', p_end date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_prov uuid; v_admin uuid;
begin
  select id into v_admin from public.profiles where email = 'admin@masar.health';
  insert into public.episodes(code, patient_id, specialty_code, title, referral_reason, referral_source, diagnosis_summary, main_goal, status, start_date, end_date, created_by, created_at)
  values ('EP-' || to_char(p_start, 'YYYY') || '-' || lpad(nextval('public.episode_seq')::text, 4, '0'), p_patient, p_spec, p_title, p_referral,
          'عيادة جراحة العظام', p_dx, p_goal, p_status, p_start, p_end, v_admin, p_start::timestamp at time zone 'Asia/Riyadh')
  returning id into v_id;
  insert into public.timeline_events(episode_id, patient_id, type, title, detail, actor_id, patient_visible, created_at)
  values (v_id, p_patient, 'EPISODE_CREATED', 'بدأت رحلة تأهيلية جديدة', p_title, v_admin, true, (p_start + time '09:00') at time zone 'Asia/Riyadh');
  if p_provider_email is not null then
    select id into v_prov from public.profiles where email = p_provider_email;
    insert into public.care_team_members(episode_id, provider_id, role, start_date, assigned_by, reason, created_at)
    values (v_id, v_prov, 'primary', p_start, v_admin, 'تعيين عند إنشاء الرحلة', p_start::timestamp at time zone 'Asia/Riyadh');
    insert into public.timeline_events(episode_id, patient_id, type, title, actor_id, patient_visible, created_at)
    values (v_id, p_patient, 'CARE_TEAM_UPDATED', 'مقدم الرعاية الرئيسي: ' || (select full_name from public.profiles where id = v_prov), v_admin, true,
            (p_start + time '09:05') at time zone 'Asia/Riyadh');
  else
    insert into public.attention_flags(patient_id, episode_id, kind, severity, title, detail, source_id)
    values (p_patient, v_id, 'unassigned', 'medium', 'رحلة بدون مقدم رعاية رئيسي', p_title, v_id);
  end if;
  return v_id;
end $$;

-- p_items: [{"ex":"Straight Leg Raise","reps":10,"sets":3,"hold":3,"dur":null,"days":[0,1,2,3,4,5,6],"note":"..."}]
create or replace function private.seed_program(p_episode uuid, p_title text, p_start date, p_end date, p_items jsonb, p_rate numeric,
  p_pain_from numeric, p_pain_to numeric, p_last_active date, p_today_done int default 0,
  p_v2_from date default null, p_v2_items jsonb default null, p_v2_summary text default null, p_status public.program_status default 'active', p_instructions text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.episodes; v_prog uuid; v_v1 uuid; v_v2 uuid; v_prov uuid; it jsonb; v_pe uuid; ex public.exercises; i int;
        d date; si record; v_session uuid; v_total_days numeric; v_pain int; v_at timestamptz; v_cnt int; v_done int; v_today date := private.today();
begin
  perform private.via_rpc();
  select * into e from public.episodes where id = p_episode;
  select provider_id into v_prov from public.care_team_members where episode_id = p_episode and role = 'primary' order by created_at desc limit 1;
  insert into public.home_programs(episode_id, patient_id, title, status, start_date, end_date, instructions, created_by, created_at)
  values (p_episode, e.patient_id, p_title, p_status, p_start, p_end,
          coalesce(p_instructions, 'نفّذ التمارين في وقت مريح من اليوم، وتوقف عند الشعور بألم حاد وأبلغ فريقك.'), v_prov,
          (p_start - 1)::timestamp at time zone 'Asia/Riyadh')
  returning id into v_prog;

  insert into public.program_versions(program_id, version, status, effective_date, published_by, published_at, created_by, created_at, change_summary)
  values (v_prog, 1, case when p_v2_from is null then 'published' else 'superseded' end::public.program_version_status, p_start, v_prov,
          (p_start - 1 + time '14:00') at time zone 'Asia/Riyadh', v_prov, (p_start - 1)::timestamp at time zone 'Asia/Riyadh', 'النسخة الأولى')
  returning id into v_v1;
  i := 0;
  for it in select * from jsonb_array_elements(p_items) loop
    i := i + 1;
    select x.* into ex from public.exercises x join public.exercise_versions ev on ev.id = x.current_version_id where ev.name_en = it->>'ex';
    insert into public.program_exercises(program_version_id, exercise_id, exercise_version_id, order_index, reps, sets, hold_sec, duration_sec, schedule_type, days_of_week, instructions)
    values (v_v1, ex.id, ex.current_version_id, i, (it->>'reps')::int, (it->>'sets')::int, (it->>'hold')::int, (it->>'dur')::int, 'weekly',
            coalesce((select array_agg(x::smallint) from jsonb_array_elements_text(it->'days') x), '{0,1,2,3,4,5,6}'), it->>'note')
    returning id into v_pe;
    perform private.generate_schedule(v_pe, p_start, coalesce(p_v2_from - 1, p_end));
  end loop;
  insert into public.timeline_events(episode_id, patient_id, type, title, detail, actor_id, ref_id, patient_visible, created_at)
  values (p_episode, e.patient_id, 'PROGRAM_PUBLISHED', 'تم نشر البرنامج المنزلي: ' || p_title, 'النسخة 1 — يسري من ' || p_start, v_prov, v_v1, true,
          (p_start - 1 + time '14:00') at time zone 'Asia/Riyadh');

  if p_v2_from is not null then
    insert into public.program_versions(program_id, version, status, effective_date, published_by, published_at, created_by, created_at, change_summary)
    values (v_prog, 2, 'published', p_v2_from, v_prov, (p_v2_from - 1 + time '15:00') at time zone 'Asia/Riyadh', v_prov,
            (p_v2_from - 1)::timestamp at time zone 'Asia/Riyadh', p_v2_summary)
    returning id into v_v2;
    i := 0;
    for it in select * from jsonb_array_elements(p_v2_items) loop
      i := i + 1;
      select x.* into ex from public.exercises x join public.exercise_versions ev on ev.id = x.current_version_id where ev.name_en = it->>'ex';
      insert into public.program_exercises(program_version_id, exercise_id, exercise_version_id, order_index, reps, sets, hold_sec, duration_sec, schedule_type, days_of_week, instructions)
      values (v_v2, ex.id, ex.current_version_id, i, (it->>'reps')::int, (it->>'sets')::int, (it->>'hold')::int, (it->>'dur')::int, 'weekly',
              coalesce((select array_agg(x::smallint) from jsonb_array_elements_text(it->'days') x), '{0,1,2,3,4,5,6}'), it->>'note')
      returning id into v_pe;
      perform private.generate_schedule(v_pe, p_v2_from, p_end);
    end loop;
    insert into public.timeline_events(episode_id, patient_id, type, title, detail, actor_id, ref_id, patient_visible, created_at)
    values (p_episode, e.patient_id, 'PROGRAM_UPDATED', 'تم تحديث البرنامج المنزلي: ' || p_title, 'النسخة 2 — ' || coalesce(p_v2_summary, ''), v_prov, v_v2, true,
            (p_v2_from - 1 + time '15:00') at time zone 'Asia/Riyadh');
  end if;
  update public.home_programs set current_version_id = coalesce(v_v2, v_v1) where id = v_prog;

  -- simulated adherence history
  v_total_days := greatest(1, v_today - p_start);
  for d in select generate_series(p_start, least(v_today - 1, p_last_active, p_end), interval '1 day')::date loop
    v_session := null; v_cnt := 0;
    for si in select s.* from public.schedule_items s where s.program_id = v_prog and s.scheduled_date = d and s.status = 'scheduled' loop
      if random() < p_rate then
        v_at := (d + time '18:30' + make_interval(mins => v_cnt * 4)) at time zone 'Asia/Riyadh';
        if v_session is null then
          insert into public.home_sessions(patient_id, episode_id, program_id, session_date, started_at)
          values (e.patient_id, p_episode, v_prog, d, v_at) returning id into v_session;
        end if;
        v_pain := case when p_pain_from is null then null
                       else greatest(0, least(10, round(p_pain_from + (p_pain_to - p_pain_from) * ((d - p_start) / v_total_days) + (random() - 0.5) * 1.6)))::int end;
        insert into public.exercise_completions(schedule_item_id, home_session_id, patient_id, episode_id, program_exercise_id, exercise_version_id, program_version_id, pain_score, difficulty, completed_at)
        select si.id, v_session, si.patient_id, si.episode_id, pe.id, pe.exercise_version_id, si.program_version_id, v_pain,
               (array['easy','appropriate','appropriate','appropriate','difficult']::public.difficulty_level[])[1 + floor(random() * 5)::int], v_at
          from public.program_exercises pe where pe.id = si.program_exercise_id;
        update public.schedule_items set status = 'completed', completed_at = v_at where id = si.id;
        v_cnt := v_cnt + 1;
      end if;
    end loop;
    if v_session is not null then
      update public.home_sessions set completed_at = (d + time '18:30' + make_interval(mins => v_cnt * 4 + 2)) at time zone 'Asia/Riyadh',
             feeling = (case when random() < 0.62 then 'better' when random() < 0.9 then 'same' else 'worse' end)::public.feeling
       where id = v_session;
    end if;
  end loop;

  -- partial progress today
  if p_today_done > 0 then
    v_done := 0;
    for si in select s.* from public.schedule_items s join public.program_exercises pe on pe.id = s.program_exercise_id
               where s.program_id = v_prog and s.scheduled_date = v_today and s.status = 'scheduled' order by pe.order_index loop
      exit when v_done >= p_today_done;
      v_at := now() - interval '40 minutes' + make_interval(mins => v_done * 4);
      if v_done = 0 then
        insert into public.home_sessions(patient_id, episode_id, program_id, session_date, started_at)
        values (e.patient_id, p_episode, v_prog, v_today, v_at) on conflict (program_id, session_date) do nothing;
        select id into v_session from public.home_sessions where program_id = v_prog and session_date = v_today;
      end if;
      insert into public.exercise_completions(schedule_item_id, home_session_id, patient_id, episode_id, program_exercise_id, exercise_version_id, program_version_id, pain_score, difficulty, completed_at)
      select si.id, v_session, si.patient_id, si.episode_id, pe.id, pe.exercise_version_id, si.program_version_id, round(coalesce(p_pain_to, 3))::int, 'appropriate', v_at
        from public.program_exercises pe where pe.id = si.program_exercise_id;
      update public.schedule_items set status = 'completed', completed_at = v_at where id = si.id;
      v_done := v_done + 1;
    end loop;
  end if;

  if p_status = 'paused' then
    update public.schedule_items set status = 'paused' where program_id = v_prog and scheduled_date >= v_today and status = 'scheduled';
    update public.home_programs set paused_at = now() - interval '3 days' where id = v_prog;
  elsif p_status = 'completed' then
    update public.schedule_items set status = 'cancelled' where program_id = v_prog and scheduled_date >= v_today and status = 'scheduled';
    update public.home_programs set ended_at = (p_end + time '17:00') at time zone 'Asia/Riyadh' where id = v_prog;
  end if;
  return v_prog;
end $$;

revoke execute on function private.seed_patient(text, text, text, text, date, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function private.seed_episode(uuid, text, text, text, text, text, text, date, public.episode_status, date) from public, anon, authenticated;
revoke execute on function private.seed_program(uuid, text, date, date, jsonb, numeric, numeric, numeric, date, int, date, jsonb, text, public.program_status, text) from public, anon, authenticated;
