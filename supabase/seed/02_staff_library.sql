-- Seed 02 — staff accounts, exercise library, templates
-- Demo staff password for every account: Masar@2026!
do $$
declare
  v_admin uuid; v_sup uuid; v_noura uuid; v_faisal uuid; v_huda uuid; v_majed uuid; v_salma uuid;
  r record; v_ex uuid; v_ver uuid; n int := 0; v_tpl uuid;
begin
  if exists (select 1 from public.profiles where email = 'admin@masar.health') then return; end if;

  v_admin := private.create_auth_user('admin@masar.health', 'Masar@2026!', '{"kind":"staff"}');
  v_sup := private.create_auth_user('supervisor@masar.health', 'Masar@2026!', '{"kind":"staff"}');
  v_noura := private.create_auth_user('noura@masar.health', 'Masar@2026!', '{"kind":"staff"}');
  v_faisal := private.create_auth_user('faisal@masar.health', 'Masar@2026!', '{"kind":"staff"}');
  v_huda := private.create_auth_user('huda@masar.health', 'Masar@2026!', '{"kind":"staff"}');
  v_majed := private.create_auth_user('majed@masar.health', 'Masar@2026!', '{"kind":"staff"}');
  v_salma := private.create_auth_user('reviewer@masar.health', 'Masar@2026!', '{"kind":"staff"}');

  insert into public.profiles(id, role, full_name, full_name_en, email, phone) values
    (v_admin, 'admin', 'ريم السبيعي', 'Reem Alsubaie', 'admin@masar.health', '0551000001'),
    (v_sup, 'supervisor', 'د. عبدالله القرني', 'Dr. Abdullah Alqarni', 'supervisor@masar.health', '0551000002'),
    (v_noura, 'provider', 'نورة العتيبي', 'Noura Alotaibi', 'noura@masar.health', '0551000003'),
    (v_faisal, 'provider', 'فيصل الحربي', 'Faisal Alharbi', 'faisal@masar.health', '0551000004'),
    (v_huda, 'provider', 'هدى الشمري', 'Huda Alshammari', 'huda@masar.health', '0551000005'),
    (v_majed, 'provider', 'ماجد الزهراني', 'Majed Alzahrani', 'majed@masar.health', '0551000006'),
    (v_salma, 'content_reviewer', 'سلمى الدوسري', 'Salma Aldosari', 'reviewer@masar.health', '0551000007');

  insert into public.staff_profiles(user_id, employee_id, specialty_code, title, title_en, capacity, bio) values
    (v_admin, 'EMP-1001', null, 'مديرة النظام', 'Department Admin', 0, null),
    (v_sup, 'EMP-1002', 'pt', 'رئيس قسم التأهيل الطبي', 'Head of Rehabilitation', 10, 'استشاري علاج طبيعي بخبرة ١٨ عامًا في التأهيل العضلي الهيكلي.'),
    (v_noura, 'EMP-2011', 'pt', 'أخصائية علاج طبيعي أولى', 'Senior Physiotherapist', 20, 'متخصصة في تأهيل الركبة والإصابات الرياضية.'),
    (v_faisal, 'EMP-2012', 'pt', 'أخصائي علاج طبيعي', 'Physiotherapist', 18, 'متخصص في آلام العمود الفقري والتأهيل العام.'),
    (v_huda, 'EMP-2021', 'ot', 'أخصائية علاج وظيفي', 'Occupational Therapist', 15, 'متخصصة في تأهيل اليد والطرف العلوي.'),
    (v_majed, 'EMP-2031', 'slp', 'أخصائي نطق وتخاطب', 'Speech-Language Pathologist', 15, 'متخصص في اضطرابات النطق لدى البالغين.'),
    (v_salma, 'EMP-3001', 'pt', 'مراجعة المحتوى السريري', 'Clinical Content Reviewer', 0, null);

  insert into public.notification_preferences(user_id) select id from public.profiles on conflict do nothing;

  insert into public.provider_availability(provider_id, weekday, start_time, end_time, location)
  select p, d, '08:00', '15:30', loc from (values (v_noura, 'عيادة ٢٠٤'), (v_faisal, 'عيادة ٢٠٦'), (v_huda, 'عيادة ٣١٠'), (v_majed, 'عيادة ٣١٥'), (v_sup, 'عيادة ٢٠١')) t(p, loc),
    generate_series(0, 4) d;

  -- ---------- Exercise library (approved, v1, created by Noura, reviewed by Salma) ----------
  for r in select * from (values
    ('رفع الساق المستقيمة','Straight Leg Raise','knee','pt','تقوية','strengthening','beginner',array[]::text[],'استلقاء على الظهر',10,3,3,null::int,180,
      array['استلقِ على ظهرك وثنِ الركبة السليمة مع إبقاء القدم على الأرض.','شدّ عضلة الفخذ الأمامية للساق المصابة مع إبقاء الركبة مستقيمة.','ارفع الساق ببطء حتى مستوى الركبة الأخرى.','اثبت ٣ ثوانٍ ثم أنزلها بهدوء.'],
      'توقف إذا شعرت بألم حاد في الركبة أو أسفل الظهر.', array['ACL','تقوية الفخذ']),
    ('شد عضلة الفخذ الأمامية','Quadriceps Sets','knee','pt','تقوية','isometric','beginner',array['منشفة'],'جلوس أو استلقاء',10,3,5,null,150,
      array['اجلس أو استلقِ مع مدّ الساق ووضع منشفة ملفوفة تحت الركبة.','اضغط بالركبة على المنشفة بشد عضلة الفخذ.','اثبت ٥ ثوانٍ ثم استرخِ.'],
      'يجب ألا يسبب التمرين ألمًا؛ الشعور بالشد طبيعي.', array['ACL','ما بعد العملية']),
    ('انزلاق الكعب','Heel Slides','knee','pt','مدى حركي','mobility','beginner',array['منشفة'],'استلقاء على الظهر',15,2,null,null,150,
      array['استلقِ على ظهرك مع مدّ الساقين.','اسحب الكعب ببطء نحو المقعدة مع ثني الركبة.','توقف عند الشعور بشد مريح ثم أعد الساق ببطء.'],
      'لا تتجاوز حد الألم المعتدل.', array['مدى الحركة']),
    ('القرفصاء الجزئية بالحائط','Wall Mini Squats','knee','pt','تقوية','strengthening','intermediate',array['حائط'],'وقوف',10,3,3,null,200,
      array['قف وظهرك مستند إلى الحائط والقدمان بعرض الكتفين.','انزل ببطء بثني الركبتين حتى ٤٥ درجة تقريبًا.','اثبت ٣ ثوانٍ ثم اصعد ببطء.'],
      'حافظ على الركبتين خلف أصابع القدمين، وتوقف عند ألم في الركبة.', array['تقوية','وظيفي']),
    ('الصعود على الدرجة','Step-ups','knee','pt','وظيفي','functional','intermediate',array['درجة'],'وقوف',10,3,null,null,220,
      array['قف أمام درجة ثابتة.','اصعد بالساق المصابة ثم الساق الأخرى.','انزل بالترتيب المعاكس ببطء.'],
      'استخدم حاجزًا للتوازن عند الحاجة.', array['وظيفي','درج']),
    ('تمدد عضلات الفخذ الخلفية','Hamstring Stretch','knee','pt','إطالة','stretching','beginner',array[]::text[],'جلوس',null,3,30,null,150,
      array['اجلس مع مدّ الساق المراد إطالتها.','انحنِ للأمام من الورك مع إبقاء الظهر مستقيمًا.','اثبت ٣٠ ثانية مع تنفس هادئ.'],
      'الإطالة يجب أن تكون مريحة دون ألم.', array['إطالة']),
    ('تمرين الجسر','Glute Bridge','hip','pt','تقوية','strengthening','beginner',array[]::text[],'استلقاء على الظهر',12,3,3,null,180,
      array['استلقِ على ظهرك مع ثني الركبتين والقدمان على الأرض.','شدّ عضلات المقعدة وارفع الحوض حتى يستقيم الجسم من الكتفين للركبتين.','اثبت ٣ ثوانٍ ثم انزل ببطء.'],
      'تجنب تقوس أسفل الظهر الزائد.', array['ورك','جذع']),
    ('تمرين المحارة','Clamshells','hip','pt','تقوية','strengthening','beginner',array['حبل مطاطي'],'استلقاء جانبي',12,3,null,null,180,
      array['استلقِ على جانبك مع ثني الركبتين والوركين.','أبقِ القدمين متلاصقتين وافتح الركبة العلوية للأعلى.','أنزلها ببطء دون تحريك الحوض.'],
      null, array['ورك']),
    ('رفع الساق الجانبي','Side-lying Hip Abduction','hip','pt','تقوية','strengthening','beginner',array[]::text[],'استلقاء جانبي',10,3,null,null,160,
      array['استلقِ على جانبك مع مدّ الساق العلوية.','ارفع الساق للأعلى بزاوية ٣٠ درجة تقريبًا.','أنزلها ببطء وكرر.'],
      null, array['ورك']),
    ('ميلان الحوض','Pelvic Tilt','back','pt','ثبات','motor_control','beginner',array[]::text[],'استلقاء على الظهر',10,2,5,null,150,
      array['استلقِ على ظهرك مع ثني الركبتين.','شدّ عضلات البطن واضغط أسفل الظهر نحو الأرض.','اثبت ٥ ثوانٍ ثم استرخِ.'],
      'توقف إذا ازداد ألم الظهر أو امتد للساق.', array['أسفل الظهر']),
    ('القط والجمل','Cat-Camel','back','pt','مدى حركي','mobility','beginner',array[]::text[],'على اليدين والركبتين',10,2,null,null,150,
      array['اتخذ وضعية الوقوف على اليدين والركبتين.','قوّس ظهرك للأعلى ببطء مع إنزال الرأس.','ثم أنزل البطن للأسفل مع رفع الرأس بلطف.'],
      'تحرك ضمن المدى المريح فقط.', array['أسفل الظهر','مرونة']),
    ('ضم الركبتين للصدر','Knee to Chest Stretch','back','pt','إطالة','stretching','beginner',array[]::text[],'استلقاء على الظهر',null,3,20,null,140,
      array['استلقِ على ظهرك.','اسحب ركبة واحدة نحو صدرك بيديك.','اثبت ٢٠ ثانية ثم بدّل.'],
      null, array['أسفل الظهر','إطالة']),
    ('الطائر والكلب','Bird Dog','back','pt','ثبات','motor_control','intermediate',array[]::text[],'على اليدين والركبتين',8,3,3,null,200,
      array['ابدأ على اليدين والركبتين مع ظهر مستقيم.','مدّ الذراع اليمنى والساق اليسرى معًا.','اثبت ٣ ثوانٍ ثم بدّل الجانب.'],
      'حافظ على ثبات الحوض وتجنب الدوران.', array['جذع','ثبات']),
    ('تمرين البندول','Pendulum','shoulder','pt','مدى حركي','mobility','beginner',array['طاولة'],'وقوف مع الانحناء',null,2,null,60,150,
      array['انحنِ للأمام مستندًا بيدك السليمة على طاولة.','اترك الذراع المصابة تتدلى بارتخاء.','حرّكها بدوائر صغيرة بفعل حركة الجسم لمدة دقيقة.'],
      'لا تستخدم عضلات الكتف لتحريك الذراع.', array['كتف','ما بعد العملية']),
    ('تسلق الحائط بالأصابع','Wall Finger Walk','shoulder','pt','مدى حركي','mobility','beginner',array['حائط'],'وقوف',10,2,null,null,150,
      array['قف مواجهًا للحائط.','اصعد بأصابعك على الحائط ببطء لأعلى نقطة مريحة.','انزل ببطء وكرر.'],
      null, array['كتف']),
    ('التدوير الخارجي بالمطاط','Resisted External Rotation','shoulder','pt','تقوية','strengthening','intermediate',array['حبل مطاطي'],'وقوف',12,3,null,null,200,
      array['ثبّت الحبل المطاطي عند مستوى الكوع.','ثنِ الكوع ٩٠ درجة وألصقه بجانبك.','أدر الساعد للخارج ببطء ثم عد.'],
      'ابدأ بمقاومة خفيفة.', array['كتف','الكفة المدورة']),
    ('ضم لوحي الكتف','Scapular Squeeze','shoulder','pt','قوام','posture','beginner',array[]::text[],'جلوس أو وقوف',10,3,5,null,150,
      array['اجلس باستقامة.','اضغط لوحي الكتفين نحو بعضهما وللأسفل.','اثبت ٥ ثوانٍ ثم استرخِ.'],
      null, array['قوام','كتف']),
    ('سحب الذقن','Chin Tucks','neck','pt','قوام','posture','beginner',array[]::text[],'جلوس',10,2,5,null,120,
      array['اجلس باستقامة وانظر للأمام.','اسحب ذقنك للخلف كأنك تصنع ذقنًا مزدوجة.','اثبت ٥ ثوانٍ ثم استرخِ.'],
      'توقف إذا شعرت بدوخة أو خدر في الذراعين.', array['رقبة','قوام']),
    ('تمدد جانب الرقبة','Upper Trapezius Stretch','neck','pt','إطالة','stretching','beginner',array[]::text[],'جلوس',null,3,20,null,120,
      array['اجلس باستقامة.','أمِل رأسك نحو كتفك برفق.','اثبت ٢٠ ثانية ثم بدّل الجانب.'],
      null, array['رقبة','إطالة']),
    ('ضخ الكاحل','Ankle Pumps','ankle','pt','دورة دموية','mobility','beginner',array[]::text[],'استلقاء أو جلوس',20,3,null,null,120,
      array['استلقِ أو اجلس مع مدّ الساق.','حرّك القدم للأعلى نحوك ثم للأسفل بعيدًا.','كرر بإيقاع منتظم.'],
      null, array['كاحل','دورة دموية']),
    ('الوقوف على قدم واحدة','Single Leg Balance','balance','pt','توازن','balance','intermediate',array['كرسي للدعم'],'وقوف',null,3,null,30,150,
      array['قف بجانب كرسي ثابت للدعم.','ارفع قدمًا واحدة عن الأرض.','حافظ على التوازن ٣٠ ثانية ثم بدّل.'],
      'نفّذ التمرين قرب سطح ثابت لتجنب السقوط.', array['توازن','كاحل']),
    ('رفع الكعبين','Heel Raises','ankle','pt','تقوية','strengthening','beginner',array['كرسي للدعم'],'وقوف',15,3,null,null,150,
      array['قف خلف كرسي ممسكًا به.','ارتفع على أطراف أصابعك ببطء.','انزل ببطء إلى الأرض.'],
      null, array['كاحل','ساق']),
    ('قبضة الكرة الإسفنجية','Ball Squeeze','hand','ot','تقوية','strengthening','beginner',array['كرة إسفنجية'],'جلوس',10,3,3,null,120,
      array['امسك الكرة الإسفنجية في راحة يدك.','اضغط عليها بقوة مريحة.','اثبت ٣ ثوانٍ ثم أرخِ يدك.'],
      null, array['يد','قبضة']),
    ('تقابل الأصابع','Finger Opposition','hand','ot','مهارات دقيقة','fine_motor','beginner',array[]::text[],'جلوس',10,2,null,null,120,
      array['المس طرف الإبهام بطرف كل إصبع بالتتابع.','ابدأ بالسبابة وانتهِ بالخنصر.','كرر ببطء ودقة.'],
      null, array['يد','مهارات دقيقة']),
    ('التقاط العملات المعدنية','Coin Pick-up','hand','ot','مهارات دقيقة','fine_motor','intermediate',array['عملات معدنية','طبق'],'جلوس',10,2,null,null,180,
      array['ضع عددًا من العملات على طاولة.','التقطها واحدة تلو الأخرى وضعها في الطبق.','استخدم الإبهام والسبابة فقط.'],
      null, array['يد','وظيفي']),
    ('تمارين الشفاه','Lip Exercises','speech','slp','حركة فموية','oral_motor','beginner',array['مرآة'],'جلوس أمام مرآة',10,3,3,null,150,
      array['اجلس أمام المرآة.','ضمّ شفتيك للأمام كأنك تقول «و» ثم ابتسم بعرض.','اثبت كل وضعية ٣ ثوانٍ.'],
      null, array['نطق','حركة فموية']),
    ('تمارين اللسان','Tongue Range of Motion','speech','slp','حركة فموية','oral_motor','beginner',array['مرآة'],'جلوس أمام مرآة',10,3,null,null,150,
      array['أخرج اللسان للأمام ثم ارفعه نحو الأنف.','حرّكه يمينًا ويسارًا لزوايا الفم.','نفّذ الحركات ببطء ووضوح.'],
      null, array['نطق','لسان']),
    ('التنفس الحجابي','Diaphragmatic Breathing','speech','slp','تنفس','breathing','beginner',array[]::text[],'جلوس أو استلقاء',null,1,null,120,150,
      array['ضع يدًا على صدرك والأخرى على بطنك.','تنفّس من الأنف ببطء ليرتفع البطن لا الصدر.','أخرج الهواء من الفم ببطء.'],
      null, array['تنفس','صوت'])
  ) as t(name, name_en, region, spec, cat, typ, diff, equip, pos, reps, sets, hold, dur, est, instr, safety, tags)
  loop
    n := n + 1;
    insert into public.exercises(code, status, created_by, created_at)
      values ('EX-' || lpad(nextval('public.exercise_seq')::text, 3, '0'), 'approved', v_noura, now() - interval '60 days')
      returning id into v_ex;
    insert into public.exercise_versions(exercise_id, version, status, name, name_en, description, instructions, specialty_code, body_region, category,
      exercise_type, difficulty, equipment, position, est_duration_sec, default_reps, default_sets, default_hold_sec, default_duration_sec,
      safety_notes, tags, created_by, created_at, submitted_by, submitted_at, reviewed_by, reviewed_at)
    values (v_ex, 1, 'approved', r.name, r.name_en, r.instr[1], r.instr, r.spec, r.region, r.cat, r.typ, r.diff, r.equip, r.pos, r.est,
      r.reps, r.sets, r.hold, r.dur, r.safety, r.tags, v_noura, now() - interval '60 days', v_noura, now() - interval '59 days', v_salma, now() - interval '58 days')
    returning id into v_ver;
    update public.exercises set current_version_id = v_ver, latest_version_id = v_ver where id = v_ex;
    insert into public.exercise_review_events(exercise_id, version_id, action, actor_id, created_at) values
      (v_ex, v_ver, 'created', v_noura, now() - interval '60 days'),
      (v_ex, v_ver, 'submitted', v_noura, now() - interval '59 days'),
      (v_ex, v_ver, 'approved', v_salma, now() - interval '58 days');
  end loop;

  -- Review queue: one in review (by Faisal), one draft (by Huda)
  insert into public.exercises(code, status, created_by) values ('EX-' || lpad(nextval('public.exercise_seq')::text, 3, '0'), 'in_review', v_faisal) returning id into v_ex;
  insert into public.exercise_versions(exercise_id, version, status, name, name_en, description, instructions, specialty_code, body_region, category, exercise_type,
    difficulty, equipment, position, est_duration_sec, default_reps, default_sets, safety_notes, tags, created_by, submitted_by, submitted_at)
  values (v_ex, 1, 'in_review', 'الطعنة الأمامية', 'Forward Lunge', 'تمرين وظيفي لتقوية الفخذ والورك والتوازن.',
    array['قف باستقامة والقدمان متقاربتان.','تقدّم بخطوة واسعة للأمام وانزل حتى تنثني الركبتان ٩٠ درجة.','ادفع بالقدم الأمامية للعودة.'],
    'pt', 'knee', 'وظيفي', 'functional', 'advanced', '{}', 'وقوف', 240, 8, 3, 'لا تتقدم الركبة الأمامية عن أصابع القدم.', array['وظيفي','رياضي'],
    v_faisal, v_faisal, now() - interval '1 day') returning id into v_ver;
  update public.exercises set latest_version_id = v_ver where id = v_ex;
  insert into public.exercise_review_events(exercise_id, version_id, action, actor_id, created_at) values
    (v_ex, v_ver, 'created', v_faisal, now() - interval '2 days'), (v_ex, v_ver, 'submitted', v_faisal, now() - interval '1 day');

  insert into public.exercises(code, status, created_by) values ('EX-' || lpad(nextval('public.exercise_seq')::text, 3, '0'), 'draft', v_huda) returning id into v_ex;
  insert into public.exercise_versions(exercise_id, version, status, name, name_en, description, instructions, specialty_code, body_region, category, exercise_type,
    difficulty, equipment, position, est_duration_sec, default_reps, default_sets, tags, created_by)
  values (v_ex, 1, 'draft', 'إطالة الرسغ', 'Wrist Flexor Stretch', 'إطالة عضلات الساعد القابضة.',
    array['مدّ ذراعك للأمام وراحة اليد للأعلى.','اسحب الأصابع للأسفل بلطف باليد الأخرى.'],
    'ot', 'hand', 'إطالة', 'stretching', 'beginner', '{}', 'جلوس', 120, null, 3, array['يد','رسغ'], v_huda) returning id into v_ver;
  update public.exercises set latest_version_id = v_ver where id = v_ex;
  insert into public.exercise_review_events(exercise_id, version_id, action, actor_id) values (v_ex, v_ver, 'created', v_huda);

  -- ---------- Program templates ----------
  insert into public.program_templates(name, specialty_code, category, description, instructions, duration_weeks, created_by)
  values ('تأهيل الرباط الصليبي — المرحلة المبكرة', 'pt', 'الركبة', 'برنامج الأسابيع الأولى بعد إعادة بناء الرباط الصليبي الأمامي.',
          'نفّذ التمارين ببطء وتحكم. الشعور بالشد طبيعي، أما الألم الحاد فيستدعي التوقف وإبلاغ فريقك.', 6, v_noura)
  returning id into v_tpl;
  insert into public.template_exercises(template_id, exercise_id, order_index, days_of_week)
  select v_tpl, ex.id, row_number() over (), '{0,1,2,3,4,5,6}' from public.exercises ex join public.exercise_versions ev on ev.id = ex.current_version_id
   where ev.name_en in ('Quadriceps Sets','Straight Leg Raise','Heel Slides','Ankle Pumps');

  insert into public.program_templates(name, specialty_code, category, description, instructions, duration_weeks, created_by)
  values ('آلام أسفل الظهر — البرنامج الأساسي', 'pt', 'الظهر', 'تمارين ثبات ومرونة لآلام أسفل الظهر غير المحددة.',
          'تحرّك ضمن المدى المريح. إذا امتد الألم إلى الساق أو صاحبه خدر فتوقف وتواصل مع فريقك.', 4, v_faisal)
  returning id into v_tpl;
  insert into public.template_exercises(template_id, exercise_id, order_index, days_of_week)
  select v_tpl, ex.id, row_number() over (), '{0,1,2,3,4,5,6}' from public.exercises ex join public.exercise_versions ev on ev.id = ex.current_version_id
   where ev.name_en in ('Pelvic Tilt','Cat-Camel','Knee to Chest Stretch','Glute Bridge','Bird Dog');

  insert into public.program_templates(name, specialty_code, category, description, instructions, duration_weeks, created_by)
  values ('حركة الكتف — بعد التيبس', 'pt', 'الكتف', 'استعادة المدى الحركي للكتف تدريجيًا.', 'لا تجبر الكتف على الحركة؛ استخدم المدى المريح.', 4, v_noura)
  returning id into v_tpl;
  insert into public.template_exercises(template_id, exercise_id, order_index, days_of_week)
  select v_tpl, ex.id, row_number() over (), '{0,1,2,3,4,5,6}' from public.exercises ex join public.exercise_versions ev on ev.id = ex.current_version_id
   where ev.name_en in ('Pendulum','Wall Finger Walk','Scapular Squeeze');

  insert into public.message_templates(name, category, body, created_by) values
    ('تذكير بالموعد', 'appointment', 'نذكّرك بموعدك القادم في قسم التأهيل الطبي. نرجو الحضور قبل الموعد بـ ١٥ دقيقة.', v_admin),
    ('تحديث البرنامج', 'program', 'تم تحديث برنامجك المنزلي. يمكنك الاطلاع على التمارين الجديدة من شاشة «اليوم».', v_admin),
    ('متابعة الالتزام', 'general', 'لاحظنا أنك لم تنفذ البرنامج في الأيام الأخيرة. هل تواجه أي صعوبة يمكننا مساعدتك فيها؟', v_admin);
end $$;
