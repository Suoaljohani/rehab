-- Seed 05 — goals, outcomes, notes, appointments, requests, messages, flags, notifications
do $$
declare t date := private.today();
  v_noura uuid; v_faisal uuid; v_huda uuid; v_majed uuid; v_sup uuid; v_admin uuid;
  e_moh uuid; e_sara uuid; e_khalid uuid; e_nouf uuid; e_abd uuid; e_lama uuid; e_ahmed uuid; e_haifa uuid; e_munira uuid;
  p_moh uuid; p_sara uuid; p_khalid uuid; p_nouf uuid; p_abd uuid; p_lama uuid; p_ahmed uuid; p_haifa uuid; p_munira uuid;
  u_moh uuid; u_sara uuid; u_haifa uuid;
  v_thread uuid; v_pe uuid; v_appt uuid; v_req uuid; w int;
begin
  if exists (select 1 from public.goals) then return; end if;
  select id into v_noura from public.profiles where email = 'noura@masar.health';
  select id into v_faisal from public.profiles where email = 'faisal@masar.health';
  select id into v_huda from public.profiles where email = 'huda@masar.health';
  select id into v_majed from public.profiles where email = 'majed@masar.health';
  select id into v_sup from public.profiles where email = 'supervisor@masar.health';
  select id into v_admin from public.profiles where email = 'admin@masar.health';

  select id, user_id into p_moh, u_moh from public.patients where access_id = 'P-482913';
  select id, user_id into p_sara, u_sara from public.patients where access_id = 'P-275046';
  select id into p_khalid from public.patients where access_id = 'P-639201';
  select id into p_nouf from public.patients where access_id = 'P-118374';
  select id into p_abd from public.patients where access_id = 'P-904512';
  select id into p_lama from public.patients where access_id = 'P-357820';
  select id into p_ahmed from public.patients where access_id = 'P-726415';
  select id, user_id into p_haifa, u_haifa from public.patients where access_id = 'P-583067';
  select id into p_munira from public.patients where access_id = 'P-814275';

  select id into e_moh from public.episodes where patient_id = p_moh and status = 'active';
  select id into e_sara from public.episodes where patient_id = p_sara;
  select id into e_khalid from public.episodes where patient_id = p_khalid;
  select id into e_nouf from public.episodes where patient_id = p_nouf;
  select id into e_abd from public.episodes where patient_id = p_abd;
  select id into e_lama from public.episodes where patient_id = p_lama;
  select id into e_ahmed from public.episodes where patient_id = p_ahmed;
  select id into e_haifa from public.episodes where patient_id = p_haifa;
  select id into e_munira from public.episodes where patient_id = p_munira;

  -- Secondary care-team member on Mohammed's episode (care team, not a single provider)
  insert into public.care_team_members(episode_id, provider_id, role, start_date, assigned_by, reason)
  values (e_moh, v_sup, 'supervisor', t - 24, v_admin, 'إشراف على حالة ما بعد العملية');

  -- ---------- Goals ----------
  insert into public.goals(episode_id, title, baseline, target, current_value, unit, higher_is_better, due_date, status, created_by, created_at) values
    (e_moh, 'زاوية ثني الركبة', 90, 135, 118, 'درجة', true, t + 21, 'active', v_noura, now() - interval '24 days'),
    (e_moh, 'المشي المتواصل دون عكاز', 0, 30, 20, 'دقيقة', true, t + 14, 'active', v_noura, now() - interval '24 days'),
    (e_moh, 'صعود الدرج بالتناوب', 0, 1, 1, 'نعم/لا', true, t - 2, 'achieved', v_noura, now() - interval '24 days'),
    (e_sara, 'الجلوس المتواصل دون ألم', 30, 120, 60, 'دقيقة', true, t + 14, 'active', v_faisal, now() - interval '16 days'),
    (e_lama, 'الوقوف على قدم واحدة', 5, 30, 28, 'ثانية', true, t + 2, 'active', v_faisal, now() - interval '28 days'),
    (e_nouf, 'قوة القبضة (اليد اليمنى)', 6, 18, 10, 'كغ', true, t + 30, 'active', v_huda, now() - interval '12 days'),
    (e_abd, 'وضوح الكلام في المحادثة', 40, 85, 55, '٪', true, t + 16, 'active', v_majed, now() - interval '13 days'),
    (e_haifa, 'المشي المتواصل', 5, 20, 8, 'دقيقة', true, t + 19, 'active', v_noura, now() - interval '11 days');

  -- ---------- Outcomes (provider-recorded) ----------
  for w in 0..4 loop
    insert into public.outcomes(episode_id, measure, value, unit, source, recorded_by, recorded_at) values
      (e_moh, 'درجة الألم', 7 - w, '/10', 'provider', v_noura, ((t - 24 + w * 6) + time '10:00') at time zone 'Asia/Riyadh'),
      (e_moh, 'ثني الركبة', 90 + w * 7, 'درجة', 'provider', v_noura, ((t - 24 + w * 6) + time '10:05') at time zone 'Asia/Riyadh');
  end loop;
  insert into public.outcomes(episode_id, measure, value, unit, source, recorded_by, recorded_at) values
    (e_sara, 'درجة الألم', 6, '/10', 'provider', v_faisal, now() - interval '16 days'),
    (e_sara, 'درجة الألم', 5, '/10', 'provider', v_faisal, now() - interval '9 days'),
    (e_sara, 'درجة الألم', 4, '/10', 'provider', v_faisal, now() - interval '2 days'),
    (e_nouf, 'قوة القبضة', 6, 'كغ', 'provider', v_huda, now() - interval '12 days'),
    (e_nouf, 'قوة القبضة', 8, 'كغ', 'provider', v_huda, now() - interval '6 days'),
    (e_nouf, 'قوة القبضة', 10, 'كغ', 'provider', v_huda, now() - interval '1 day');

  -- ---------- Clinical notes ----------
  insert into public.clinical_notes(episode_id, author_id, kind, note_date, session_type, pain_score, patient_report, functional_observation, interventions, progress, plan, created_at) values
    (e_moh, v_noura, 'session', t - 21, 'تقييم أولي', 7, 'ألم عند ثني الركبة وصعوبة في صعود الدرج.', 'ثني الركبة ٩٠°، مشي بعكازين، ضمور خفيف في الفخذ.', 'تقييم شامل، تثقيف المراجع، بدء البرنامج المنزلي.', 'بداية الرحلة.', 'برنامج منزلي يومي مع جلستين أسبوعيًا.', now() - interval '21 days'),
    (e_moh, v_noura, 'session', t - 14, 'جلسة علاجية', 5, 'تحسن الألم، ما زال يشعر بتيبس صباحي.', 'ثني الركبة ١٠٥°، مشي بعكاز واحد.', 'تمارين تقوية، تحريك المفصل، تدريب المشي.', 'تحسن ملحوظ في المدى الحركي.', 'الاستمرار ومراجعة البرنامج الأسبوع القادم.', now() - interval '14 days'),
    (e_moh, v_noura, 'session', t - 7, 'جلسة علاجية', 4, 'يمشي في المنزل دون عكاز.', 'ثني الركبة ١١٢°، صعود الدرج بالتناوب مع الدرابزين.', 'تقوية تدريجية، تمارين توازن.', 'تحقق هدف صعود الدرج.', 'تحديث البرنامج المنزلي وإضافة تمرين الجسر.', now() - interval '7 days'),
    (e_moh, v_noura, 'session', t - 3, 'جلسة علاجية', 3, 'ألم بسيط بعد المشي الطويل فقط.', 'ثني الركبة ١١٨°.', 'تمارين وظيفية، تدريب على الدرج.', 'تقدم ممتاز والتزام عالٍ بالبرنامج المنزلي.', 'تقييم الانتقال للمرحلة الثالثة خلال أسبوعين.', now() - interval '3 days'),
    (e_sara, v_faisal, 'session', t - 16, 'تقييم أولي', 6, 'ألم أسفل الظهر يزداد مع الجلوس الطويل.', 'محدودية في الانثناء الأمامي.', 'تقييم وتثقيف حول وضعيات الجلوس.', 'بداية الرحلة.', 'برنامج ثبات ومرونة يومي.', now() - interval '16 days'),
    (e_sara, v_faisal, 'session', t - 2, 'جلسة علاجية', 4, 'تحسن في الجلوس حتى ساعة.', 'تحسن الانثناء الأمامي.', 'تمارين ثبات الجذع.', 'تحسن تدريجي.', 'متابعة تمرين الطائر والكلب بتركيز.', now() - interval '2 days'),
    (e_haifa, v_noura, 'session', t - 11, 'تقييم أولي', 5, 'ألم في الركبتين مع المشي أكثر من ٥ دقائق.', 'ضعف في عضلات الفخذ، مشي بطيء.', 'تقييم وتثقيف.', 'بداية الرحلة.', 'برنامج تقوية منزلي.', now() - interval '11 days');
  insert into public.clinical_notes(episode_id, author_id, kind, note_date, internal_note, created_at) values
    (e_moh, v_noura, 'internal', t - 7, 'المراجع متحفز جدًا؛ يمكن تسريع الانتقال للمرحلة الثالثة إذا استمر الالتزام فوق ٨٠٪. تنسيق مع د. عبدالله قبل العودة للرياضة.', now() - interval '7 days'),
    (e_haifa, v_noura, 'internal', t - 1, 'ارتفاع تدريجي في درجات الألم المبلغ عنها؛ مراجعة شدة تمرين القرفصاء في الجلسة القادمة.', now() - interval '1 day');

  -- ---------- Appointments ----------
  -- Mohammed: completed history + upcoming
  insert into public.appointments(patient_id, episode_id, specialty_code, provider_id, starts_at, duration_min, location, status, created_by) values
    (p_moh, e_moh, 'pt', v_noura, ((t - 21) + time '10:30') at time zone 'Asia/Riyadh', 60, 'عيادة ٢٠٤', 'completed', v_admin),
    (p_moh, e_moh, 'pt', v_noura, ((t - 14) + time '10:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'completed', v_admin),
    (p_moh, e_moh, 'pt', v_noura, ((t - 10) + time '10:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'completed', v_admin),
    (p_moh, e_moh, 'pt', v_noura, ((t - 7) + time '10:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'completed', v_admin),
    (p_moh, e_moh, 'pt', v_noura, ((t - 3) + time '10:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'completed', v_admin),
    (p_moh, e_moh, 'pt', v_noura, ((t + 4) + time '10:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'confirmed', v_admin),
    (p_moh, e_moh, 'pt', v_noura, ((t + 7) + time '10:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'confirmed', v_admin);
  -- Today across the department
  insert into public.appointments(patient_id, episode_id, specialty_code, provider_id, starts_at, duration_min, location, status, created_by) values
    (p_haifa, e_haifa, 'pt', v_noura, (t + time '09:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'checked_in', v_admin),
    (p_khalid, e_khalid, 'pt', v_noura, (t + time '11:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'confirmed', v_admin),
    (p_sara, e_sara, 'pt', v_faisal, (t + time '10:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٦', 'confirmed', v_admin),
    (p_lama, e_lama, 'pt', v_faisal, (t + time '12:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٦', 'confirmed', v_admin),
    (p_nouf, e_nouf, 'ot', v_huda, (t + time '09:30') at time zone 'Asia/Riyadh', 60, 'عيادة ٣١٠', 'confirmed', v_admin),
    (p_abd, e_abd, 'slp', v_majed, (t + time '11:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٣١٥', 'confirmed', v_admin);
  -- Other history and upcoming
  insert into public.appointments(patient_id, episode_id, specialty_code, provider_id, starts_at, duration_min, location, status, created_by) values
    (p_khalid, e_khalid, 'pt', v_noura, ((t - 4) + time '11:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'no_show', v_admin),
    (p_khalid, e_khalid, 'pt', v_noura, ((t - 11) + time '11:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'completed', v_admin),
    (p_sara, e_sara, 'pt', v_faisal, ((t - 2) + time '10:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٦', 'completed', v_admin),
    (p_sara, e_sara, 'pt', v_faisal, ((t + 3) + time '10:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٦', 'confirmed', v_admin),
    (p_haifa, e_haifa, 'pt', v_noura, ((t + 3) + time '09:00') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٤', 'confirmed', v_admin),
    (p_nouf, e_nouf, 'ot', v_huda, ((t + 2) + time '09:30') at time zone 'Asia/Riyadh', 60, 'عيادة ٣١٠', 'confirmed', v_admin),
    (p_abd, e_abd, 'slp', v_majed, ((t + 2) + time '11:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٣١٥', 'confirmed', v_admin),
    (p_lama, e_lama, 'pt', v_faisal, ((t - 5) + time '12:30') at time zone 'Asia/Riyadh', 45, 'عيادة ٢٠٦', 'completed', v_admin);
  insert into public.appointments(patient_id, episode_id, specialty_code, provider_id, starts_at, duration_min, location, status, created_by)
  values (p_ahmed, e_ahmed, 'pt', null, ((t + 1) + time '13:00') at time zone 'Asia/Riyadh', 60, 'عيادة ٢٠١', 'pending_confirmation', v_admin)
  returning id into v_appt;

  -- Patient change request (Sara wants to move Wednesday's session)
  insert into public.appointment_change_requests(appointment_id, patient_id, kind, reason, preferred)
  select id, p_sara, 'change', 'لدي اختبار في العمل صباح ذلك اليوم.', 'بعد الساعة ١:٠٠ ظهرًا'
    from public.appointments where patient_id = p_sara and starts_at > now() + interval '2 days' limit 1;

  -- ---------- Appointment requests (public portal) ----------
  insert into public.appointment_requests(reference, journey_type, full_name, national_id, phone, specialty_code, has_referral, preferred_period, notes, status, created_at)
  values ('RH-2026-' || lpad(nextval('public.request_ref_seq')::text, 5, '0'), 'referral', 'أحمد ناصر الزهراني', '1089123456', '0507890123', 'pt', true, 'صباحًا', 'إحالة من عيادة العظام لآلام الرقبة.', 'scheduled', now() - interval '3 days')
  returning id into v_req;
  update public.appointment_requests set appointment_id = v_appt, patient_id = p_ahmed, handled_by = v_admin where id = v_req;
  update public.appointments set request_id = v_req where id = v_appt;
  insert into public.request_events(request_id, status, public_note, actor_id, created_at) values
    (v_req, 'new', 'تم استلام طلبك.', null, now() - interval '3 days'),
    (v_req, 'under_review', 'طلبك قيد المراجعة من فريق القسم.', v_admin, now() - interval '2 days'),
    (v_req, 'scheduled', 'تم تحديد موعدك للتقييم الأولي.', v_admin, now() - interval '1 day');

  insert into public.appointment_requests(reference, journey_type, full_name, phone, specialty_code, has_referral, preferred_period, notes, status, created_at)
  values ('RH-2026-' || lpad(nextval('public.request_ref_seq')::text, 5, '0'), 'new_appointment', 'ريما سعود الحربي', '0551234987', 'pt', false, 'مساءً', 'ألم في الكتف الأيمن منذ شهر.', 'new', now() - interval '2 hours')
  returning id into v_req;
  insert into public.request_events(request_id, status, public_note, created_at) values (v_req, 'new', 'تم استلام طلبك.', now() - interval '2 hours');

  insert into public.appointment_requests(reference, journey_type, full_name, phone, specialty_code, has_referral, preferred_period, notes, status, created_at)
  values ('RH-2026-' || lpad(nextval('public.request_ref_seq')::text, 5, '0'), 'referral', 'ماجد فيصل العتيبي', '0559876123', 'slp', true, 'صباحًا', 'إحالة لطفلي (٥ سنوات) لتأخر الكلام.', 'under_review', now() - interval '1 day')
  returning id into v_req;
  insert into public.request_events(request_id, status, public_note, actor_id, created_at) values
    (v_req, 'new', 'تم استلام طلبك.', null, now() - interval '1 day'), (v_req, 'under_review', 'طلبك قيد المراجعة.', v_admin, now() - interval '20 hours');

  insert into public.appointment_requests(reference, journey_type, full_name, phone, specialty_code, has_referral, preferred_period, notes, status, internal_note, created_at)
  values ('RH-2026-' || lpad(nextval('public.request_ref_seq')::text, 5, '0'), 'find_service', 'عبير محمد السالم', '0553456712', 'ot', false, 'أي وقت', 'صعوبة في استخدام اليد بعد كسر في الرسغ.', 'need_information', 'نحتاج تقرير الأشعة الأخير قبل التحويل.', now() - interval '2 days')
  returning id into v_req;
  insert into public.request_events(request_id, status, public_note, actor_id, created_at) values
    (v_req, 'new', 'تم استلام طلبك.', null, now() - interval '2 days'),
    (v_req, 'need_information', 'نرجو تزويدنا بتقرير الأشعة الأخير عبر الحضور لمكتب الاستقبال.', v_admin, now() - interval '1 day');

  insert into public.waitlist_entries(patient_id, full_name, phone, specialty_code, preferred_days, preferred_time, priority, notes, created_by, created_at) values
    (null, 'فهد إبراهيم الشمري', '0558887766', 'pt', '{0,2}', 'صباحًا', 'routine', 'متاح في أي موعد يُلغى صباح الأحد أو الثلاثاء.', v_admin, now() - interval '5 days'),
    (null, 'جواهر علي القحطاني', '0557776655', 'ot', '{1,3}', 'مساءً', 'soon', null, v_admin, now() - interval '2 days');

  -- ---------- Messages (triggers create notifications, flags and timeline) ----------
  -- Mohammed ↔ Noura (resolved)
  insert into public.message_threads(patient_id, episode_id, subject, category, created_by, created_at)
  values (p_moh, e_moh, 'تحديث برنامجك المنزلي', 'general', v_noura, now() - interval '8 days') returning id into v_thread;
  insert into public.messages(thread_id, sender_id, body, created_at) values
    (v_thread, v_noura, 'مرحبًا محمد، أضفت تمرين الجسر لبرنامجك وزدت تكرارات رفع الساق إلى ١٢. نفّذه ببطء، وأخبرني إن شعرت بأي ألم في الظهر.', now() - interval '8 days'),
    (v_thread, u_moh, 'شكرًا أستاذة نورة، جرّبته اليوم وكان مناسبًا.', now() - interval '7 days 20 hours'),
    (v_thread, v_noura, 'ممتاز! استمر بنفس الإيقاع.', now() - interval '7 days 18 hours');
  insert into public.thread_reads(thread_id, user_id, last_read_at) values (v_thread, u_moh, now() - interval '7 days') on conflict (thread_id, user_id) do update set last_read_at = excluded.last_read_at;

  insert into public.message_threads(patient_id, episode_id, subject, category, created_by, created_at)
  values (p_moh, e_moh, 'موعد الخميس', 'appointment', u_moh, now() - interval '1 day') returning id into v_thread;
  insert into public.messages(thread_id, sender_id, body, created_at) values
    (v_thread, u_moh, 'هل يمكنني إحضار حذاء رياضي جديد للجلسة القادمة لتجربته؟', now() - interval '1 day'),
    (v_thread, v_noura, 'بالتأكيد، أحضره وسنجرّبه أثناء تمارين المشي.', now() - interval '20 hours');

  -- Sara asks about Bird Dog (open, unanswered → attention)
  select pe.id into v_pe from public.program_exercises pe join public.home_programs hp on hp.current_version_id = pe.program_version_id
    join public.exercise_versions ev on ev.id = pe.exercise_version_id where hp.patient_id = p_sara and ev.name_en = 'Bird Dog';
  insert into public.message_threads(patient_id, episode_id, subject, category, program_exercise_id, exercise_id, created_by, created_at)
  values (p_sara, e_sara, 'سؤال عن تمرين الطائر والكلب', 'exercise_question', v_pe, (select exercise_id from public.program_exercises where id = v_pe), u_sara, now() - interval '3 hours')
  returning id into v_thread;
  insert into public.messages(thread_id, sender_id, body, created_at) values
    (v_thread, u_sara, 'أشعر بعدم توازن عند مدّ الذراع والساق معًا، هل يمكنني البدء بالساق فقط في الأسبوع الأول؟', now() - interval '3 hours');

  -- Haifa reports pain (high attention)
  insert into public.message_threads(patient_id, episode_id, subject, category, created_by, created_at)
  values (p_haifa, e_haifa, 'ألم في الركبة بعد تمرين القرفصاء', 'pain', u_haifa, now() - interval '50 minutes') returning id into v_thread;
  insert into public.messages(thread_id, sender_id, body, created_at) values
    (v_thread, u_haifa, 'بعد تمرين القرفصاء أمس زاد الألم في الركبة اليمنى ولم يخف حتى الصباح.', now() - interval '50 minutes');

  -- ---------- Attention flags derived from the seeded behaviour ----------
  perform private.raise_flag(e_haifa, 'high_pain', 'high', 'أبلغت عن ألم مرتفع (8/10)', 'أثناء تمرين: تمارين البرنامج المنزلي — أمس', null);
  insert into public.issue_reports(patient_id, episode_id, schedule_item_id, program_exercise_id, exercise_version_id, reason, comment, created_at)
  select p_haifa, e_haifa, s.id, s.program_exercise_id, pe.exercise_version_id, 'pain', 'ألم في الركبة عند النزول', now() - interval '45 minutes'
    from public.schedule_items s join public.program_exercises pe on pe.id = s.program_exercise_id
    join public.exercise_versions ev on ev.id = pe.exercise_version_id
   where s.patient_id = p_haifa and s.scheduled_date = t and ev.name_en = 'Wall Mini Squats' limit 1;
  insert into public.attention_flags(patient_id, episode_id, kind, severity, title, detail, source_id, created_at)
  select p_haifa, e_haifa, 'issue_reported', 'high', 'أبلغت عن ألم أثناء تمرين', 'القرفصاء الجزئية بالحائط — ألم في الركبة عند النزول', ir.id, ir.created_at
    from public.issue_reports ir where ir.patient_id = p_haifa limit 1;
  perform private.raise_flag(e_khalid, 'inactivity', 'medium', 'لم ينفذ البرنامج خلال آخر 3 أيام', 'حركة الكتف — بعد التيبس',
    (select id from public.home_programs where episode_id = e_khalid));
  perform private.raise_flag(e_lama, 'program_ending', 'low', 'البرنامج المنزلي ينتهي ' || to_char(t + 2, 'YYYY-MM-DD'), 'تأهيل الكاحل والتوازن',
    (select id from public.home_programs where episode_id = e_lama));

  -- timeline extras (patient-visible session completions for Mohammed)
  insert into public.timeline_events(episode_id, patient_id, type, title, detail, patient_visible, created_at, ref_id)
  select e_moh, p_moh, 'HOME_SESSION_COMPLETED', 'أنهى جلسة منزلية', null, true, hs.completed_at, hs.id
    from public.home_sessions hs where hs.episode_id = e_moh and hs.completed_at is not null and hs.session_date >= t - 6;
  insert into public.timeline_events(episode_id, patient_id, type, title, detail, patient_visible, created_at)
  select a.episode_id, a.patient_id, 'APPOINTMENT_COMPLETED', 'جلسة حضورية مكتملة', to_char(a.starts_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD'), true, a.starts_at + interval '50 minutes'
    from public.appointments a where a.status = 'completed' and a.episode_id is not null;

  -- ---------- Notifications ----------
  insert into public.notifications(user_id, kind, title, body, link, read_at, created_at) values
    (u_moh, 'program', 'تم تحديث برنامجك المنزلي', 'برنامج الركبة المنزلي — المرحلة الثانية', '/patient', now() - interval '7 days', now() - interval '8 days'),
    (u_moh, 'appointment_reminder', 'تذكير بموعدك القادم', 'الخميس ١٠:٣٠ صباحًا — عيادة ٢٠٤', '/patient/appointments', null, now() - interval '2 hours');

  insert into public.announcements(title, body, audience, is_published, published_at, created_by) values
    ('أسبوع التوعية بصحة العظام والمفاصل', 'يسرّ قسم التأهيل الطبي دعوتكم لورشة «الحركة دواء» يوم الثلاثاء القادم في قاعة التثقيف الصحي من ١٠ إلى ١١ صباحًا.', 'all', true, now() - interval '1 day', v_admin),
    ('تحديث إجراءات الإحالة الداخلية', 'اعتبارًا من الأسبوع القادم تُستقبل الإحالات الداخلية عبر المنصة فقط.', 'staff', false, null, v_admin);
  insert into public.notifications(user_id, kind, title, body, created_at)
  select id, 'announcement', 'أسبوع التوعية بصحة العظام والمفاصل', 'ورشة «الحركة دواء» يوم الثلاثاء القادم.', now() - interval '1 day' from public.profiles where status = 'active';
end $$;
