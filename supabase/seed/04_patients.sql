-- Seed 04 — patients, rehabilitation episodes, home programs with realistic history
do $$
declare t date := private.today(); p uuid; e uuid; pr uuid;
begin
  if exists (select 1 from public.patients where access_id = 'P-482913') then return; end if;
  perform setseed(0.42);

  -- 1. Mohammed — knee ACL, active, two program versions, ~86% adherence, pain trending down
  p := private.seed_patient('P-482913', 'محمد أحمد العمري', 'Mohammed Alomari', '1023456789', '1994-03-12', 'male', '0501234567', now() - interval '200 days');
  e := private.seed_episode(p, 'pt', 'آلام أسفل الظهر', 'آلام أسفل الظهر الميكانيكية', 'Mechanical low back pain', 'العودة للعمل المكتبي دون ألم',
       'faisal@masar.health', t - 190, 'completed', t - 140);
  perform private.seed_program(e, 'برنامج الظهر الأساسي', t - 186, t - 145,
    '[{"ex":"Pelvic Tilt","reps":10,"sets":2,"hold":5,"days":[0,1,2,3,4,5,6]},{"ex":"Cat-Camel","reps":10,"sets":2,"days":[0,1,2,3,4,5,6]},{"ex":"Knee to Chest Stretch","sets":3,"hold":20,"days":[0,2,4]}]',
    0.82, 5, 1, t - 145, 0, null, null, null, 'completed');
  update public.episodes set closed_reason = 'تحققت الأهداف التأهيلية' where id = e;
  e := private.seed_episode(p, 'pt', 'تأهيل الركبة بعد الرباط الصليبي', 'إعادة بناء الرباط الصليبي الأمامي للركبة اليمنى',
       'ACL reconstruction — right knee (post-op week 6)', 'المشي الطبيعي وصعود الدرج دون ألم والعودة للرياضة الخفيفة', 'noura@masar.health', t - 24);
  perform private.seed_program(e, 'برنامج الركبة المنزلي — المرحلة الثانية', t - 20, t + 22,
    '[{"ex":"Quadriceps Sets","reps":10,"sets":3,"hold":5,"days":[0,1,2,3,4,5,6]},{"ex":"Straight Leg Raise","reps":10,"sets":3,"hold":3,"days":[0,1,2,3,4,5,6],"note":"ارفع الساق ببطء وحافظ على الركبة مستقيمة."},{"ex":"Heel Slides","reps":15,"sets":2,"days":[0,2,4,6]}]',
    0.86, 6, 3, t - 1, 0, t - 8,
    '[{"ex":"Straight Leg Raise","reps":12,"sets":3,"hold":3,"days":[0,1,2,3,4,5,6],"note":"ارفع الساق ببطء وحافظ على الركبة مستقيمة."},{"ex":"Quadriceps Sets","reps":10,"sets":3,"hold":5,"days":[0,1,2,3,4,5,6]},{"ex":"Heel Slides","reps":15,"sets":2,"days":[0,2,4,6],"note":"توقف عند الشعور بشد مريح."},{"ex":"Glute Bridge","reps":12,"sets":3,"hold":3,"days":[0,1,3,5]}]',
    'زيادة تكرارات رفع الساق وإضافة تمرين الجسر');

  -- 2. Sara — low back pain, partial progress today, open question
  p := private.seed_patient('P-275046', 'سارة عبدالله القحطاني', 'Sara Alqahtani', '1034567891', '1988-07-21', 'female', '0502345678', now() - interval '20 days');
  e := private.seed_episode(p, 'pt', 'آلام أسفل الظهر المزمنة', 'آلام أسفل الظهر منذ ٦ أشهر', 'Chronic non-specific low back pain', 'الجلوس ساعتين متواصلتين دون ألم', 'faisal@masar.health', t - 16);
  perform private.seed_program(e, 'آلام أسفل الظهر — البرنامج الأساسي', t - 14, t + 14,
    '[{"ex":"Pelvic Tilt","reps":10,"sets":2,"hold":5,"days":[0,1,2,3,4,5,6]},{"ex":"Cat-Camel","reps":10,"sets":2,"days":[0,1,2,3,4,5,6]},{"ex":"Knee to Chest Stretch","sets":3,"hold":20,"days":[0,1,2,3,4,5,6]},{"ex":"Bird Dog","reps":8,"sets":3,"hold":3,"days":[0,2,4]}]',
    0.68, 5, 4, t - 1, 1);

  -- 3. Khalid — frozen shoulder, stopped 5 days ago (inactivity)
  p := private.seed_patient('P-639201', 'خالد سعد الدوسري', 'Khalid Aldosari', '1045678912', '1979-11-02', 'male', '0503456789', now() - interval '25 days');
  e := private.seed_episode(p, 'pt', 'تيبس الكتف الأيسر', 'محدودية حركة الكتف الأيسر', 'Adhesive capsulitis — left shoulder', 'رفع الذراع فوق الرأس لارتداء الملابس', 'noura@masar.health', t - 20);
  perform private.seed_program(e, 'حركة الكتف — بعد التيبس', t - 18, t + 10,
    '[{"ex":"Pendulum","sets":2,"dur":60,"days":[0,1,2,3,4,5,6]},{"ex":"Wall Finger Walk","reps":10,"sets":2,"days":[0,1,2,3,4,5,6]},{"ex":"Scapular Squeeze","reps":10,"sets":3,"hold":5,"days":[1,3,5]}]',
    0.8, 5, 4, t - 5);

  -- 4. Nouf — OT hand after stroke
  p := private.seed_patient('P-118374', 'نوف محمد الشهري', 'Nouf Alshehri', '1056789123', '1961-02-14', 'female', '0504567890', now() - interval '14 days');
  e := private.seed_episode(p, 'ot', 'تأهيل اليد اليمنى بعد جلطة دماغية', 'ضعف اليد اليمنى بعد جلطة دماغية', 'Post-stroke right hand weakness', 'الإمساك بالكوب والكتابة باليد اليمنى', 'huda@masar.health', t - 12);
  perform private.seed_program(e, 'برنامج المهارات الدقيقة لليد', t - 10, t + 30,
    '[{"ex":"Ball Squeeze","reps":10,"sets":3,"hold":3,"days":[0,1,2,3,4,5,6]},{"ex":"Finger Opposition","reps":10,"sets":2,"days":[0,1,2,3,4,5,6]},{"ex":"Coin Pick-up","reps":10,"sets":2,"days":[0,2,4]}]',
    0.9, 2, 1, t - 1);

  -- 5. Abdulrahman — speech after stroke
  p := private.seed_patient('P-904512', 'عبدالرحمن خالد المطيري', 'Abdulrahman Almutairi', '1067891234', '1956-09-30', 'male', '0505678901', now() - interval '15 days');
  e := private.seed_episode(p, 'slp', 'تأهيل النطق بعد جلطة', 'صعوبة في وضوح الكلام بعد جلطة', 'Dysarthria post-stroke', 'كلام واضح في المحادثات اليومية', 'majed@masar.health', t - 13);
  perform private.seed_program(e, 'تمارين الحركة الفموية والتنفس', t - 12, t + 16,
    '[{"ex":"Lip Exercises","reps":10,"sets":3,"hold":3,"days":[0,1,2,3,4,5,6]},{"ex":"Tongue Range of Motion","reps":10,"sets":3,"days":[0,1,2,3,4,5,6]},{"ex":"Diaphragmatic Breathing","sets":1,"dur":120,"days":[0,1,2,3,4,5,6]}]',
    0.75, null, null, t - 1);

  -- 6. Lama — ankle sprain, program ending in 2 days
  p := private.seed_patient('P-357820', 'لمى فهد الغامدي', 'Lama Alghamdi', '1078912345', '2001-05-05', 'female', '0506789012', now() - interval '30 days');
  e := private.seed_episode(p, 'pt', 'التواء الكاحل الأيمن', 'التواء من الدرجة الثانية أثناء الرياضة', 'Grade II lateral ankle sprain — right', 'العودة للجري دون ألم', 'faisal@masar.health', t - 28);
  perform private.seed_program(e, 'تأهيل الكاحل والتوازن', t - 26, t + 2,
    '[{"ex":"Ankle Pumps","reps":20,"sets":3,"days":[0,1,2,3,4,5,6]},{"ex":"Heel Raises","reps":15,"sets":3,"days":[0,1,2,3,4,5,6]},{"ex":"Single Leg Balance","sets":3,"dur":30,"days":[0,1,2,3,4]}]',
    0.92, 5, 1, t - 1);

  -- 7. Ahmed — new episode, not yet assigned (unassigned queue)
  p := private.seed_patient('P-726415', 'أحمد ناصر الزهراني', 'Ahmed Alzahrani', '1089123456', '1990-12-19', 'male', '0507890123', now() - interval '1 day');
  e := private.seed_episode(p, 'pt', 'آلام الرقبة', 'آلام الرقبة مع صداع متكرر', 'Mechanical neck pain', 'العمل على الحاسب دون ألم', null, t - 1);

  -- 8. Haifa — knee OA, pain rising, high pain yesterday
  p := private.seed_patient('P-583067', 'هيفاء سالم العنزي', 'Haifa Alanazi', '1091234567', '1958-04-09', 'female', '0508901234', now() - interval '12 days');
  e := private.seed_episode(p, 'pt', 'خشونة الركبتين', 'خشونة الركبتين من الدرجة الثانية', 'Bilateral knee osteoarthritis', 'المشي ٢٠ دقيقة دون توقف', 'noura@masar.health', t - 11);
  pr := private.seed_program(e, 'برنامج تقوية الركبة لكبار السن', t - 9, t + 19,
    '[{"ex":"Quadriceps Sets","reps":10,"sets":3,"hold":5,"days":[0,1,2,3,4,5,6]},{"ex":"Wall Mini Squats","reps":8,"sets":2,"hold":3,"days":[0,2,4]},{"ex":"Heel Raises","reps":10,"sets":2,"days":[0,1,2,3,4,5,6]},{"ex":"Hamstring Stretch","sets":3,"hold":30,"days":[0,1,2,3,4,5,6]}]',
    0.7, 5, 7, t - 1);
  update public.exercise_completions c set pain_score = 8
   where c.id = (select c2.id from public.exercise_completions c2 join public.schedule_items s on s.id = c2.schedule_item_id
                  where s.program_id = pr and s.scheduled_date = t - 1 order by c2.completed_at desc limit 1);

  -- 9. Yousef — completed episode only (no active program → empty state)
  p := private.seed_patient('P-160938', 'يوسف عمر الحربي', 'Yousef Alharbi', '1012345670', '1985-08-25', 'male', '0509012345', now() - interval '95 days');
  e := private.seed_episode(p, 'pt', 'إصابة الكاحل الأيسر', 'كسر بسيط في الكاحل الأيسر بعد إزالة الجبيرة', 'Post-immobilisation ankle stiffness', 'المشي دون عرج', 'faisal@masar.health', t - 90, 'completed', t - 30);
  perform private.seed_program(e, 'استعادة حركة الكاحل', t - 86, t - 32,
    '[{"ex":"Ankle Pumps","reps":20,"sets":3,"days":[0,1,2,3,4,5,6]},{"ex":"Heel Raises","reps":15,"sets":3,"days":[0,1,2,3,4,5,6]}]',
    0.88, 4, 1, t - 32, 0, null, null, null, 'completed');
  update public.episodes set closed_reason = 'تحققت الأهداف التأهيلية' where id = e;

  -- 10. Munira — on hold, program paused
  p := private.seed_patient('P-814275', 'منيرة عبدالعزيز القرشي', 'Munira Alqurashi', '1023456781', '1972-01-17', 'female', '0501112233', now() - interval '22 days');
  e := private.seed_episode(p, 'pt', 'آلام الرقبة والكتف', 'آلام الرقبة الممتدة للكتف الأيمن', 'Cervical radiculopathy — right', 'النوم دون ألم', 'faisal@masar.health', t - 21, 'on_hold');
  perform private.seed_program(e, 'برنامج الرقبة والقوام', t - 19, t + 9,
    '[{"ex":"Chin Tucks","reps":10,"sets":2,"hold":5,"days":[0,1,2,3,4,5,6]},{"ex":"Upper Trapezius Stretch","sets":3,"hold":20,"days":[0,1,2,3,4,5,6]},{"ex":"Scapular Squeeze","reps":10,"sets":3,"hold":5,"days":[0,2,4]}]',
    0.74, 6, 5, t - 4, 0, null, null, null, 'paused');
  update public.episodes set closed_reason = 'سفر المراجعة خارج المدينة لمدة أسبوعين' where id = e;
end $$;
