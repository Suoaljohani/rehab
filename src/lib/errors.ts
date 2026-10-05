/** Maps database error codes raised by RPCs to calm, human Arabic messages. */
const MESSAGES: Record<string, string> = {
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء.",
  not_found: "لم يتم العثور على السجل المطلوب.",
  not_patient: "هذا الإجراء متاح للمراجعين فقط.",
  not_today: "يمكن تسجيل تمارين اليوم فقط.",
  not_available: "هذا التمرين غير متاح حاليًا.",
  program_not_active: "البرنامج غير نشط حاليًا.",
  episode_closed: "الرحلة التأهيلية مغلقة ولا تستقبل برامج جديدة.",
  episode_not_active: "يجب أن تكون الرحلة التأهيلية نشطة لنشر البرنامج.",
  program_closed: "هذا البرنامج مغلق.",
  not_draft: "يمكن نشر المسودات فقط.",
  no_exercises: "أضف تمرينًا واحدًا على الأقل قبل النشر.",
  exercise_not_approved: "يحتوي البرنامج على تمرين غير معتمد أو مؤرشف.",
  invalid_prescription: "تحقق من إعدادات التمارين: حدّد الأيام وعدد التكرارات أو المدة لكل تمرين.",
  effective_after_end: "تاريخ السريان بعد تاريخ انتهاء البرنامج.",
  invalid_dates: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.",
  too_long: "مدة البرنامج لا يمكن أن تتجاوز سنة.",
  invalid_transition: "لا يمكن تنفيذ هذا التغيير على الحالة الحالية.",
  transfer_reason_required: "يرجى كتابة سبب النقل.",
  reason_required: "يرجى كتابة السبب.",
  comment_required: "يرجى كتابة ملاحظة توضح القرار.",
  separation_of_duties: "لا يمكنك اعتماد محتوى أنشأته بنفسك (فصل المهام).",
  instructions_required: "أضف خطوات التنفيذ قبل الإرسال للمراجعة.",
  metadata_required: "حدّد التخصص ومنطقة الجسم قبل الإرسال.",
  invalid_phone: "رقم الجوال غير صحيح. استخدم الصيغة 05XXXXXXXX.",
  invalid_name: "يرجى كتابة الاسم كاملًا.",
  invalid_national_id: "رقم الهوية أو الإقامة مطلوب ويتكون من ١٠ أرقام يبدأ بـ 1 أو 2.",
  invalid_identifier: "رقم الهوية أو الإقامة يتكون من ١٠ أرقام ويبدأ بـ 1 أو 2.",
  wrong_password: "كلمة المرور الحالية غير صحيحة.",
  same_password: "اختر كلمة مرور مختلفة عن الحالية.",
  duplicate_national_id: "يوجد مراجع مسجل بنفس رقم الهوية.",
  rate_limited: "محاولات كثيرة. يرجى الانتظار قليلًا ثم المحاولة مجددًا.",
  invalid_code: "الرمز غير صحيح أو انتهت صلاحيته. تأكد من آخر رسالة وصلتك أو اطلب رمزًا جديدًا.",
  verify_failed: "تعذّر التحقق من الرمز الآن. حاول بعد قليل.",
  phone_in_use: "رقم الجوال مرتبط بمراجع آخر. يجب أن يكون لكل مراجع رقم جوال خاص به لاستقبال رمز الدخول.",
  expired: "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.",
  too_many_attempts: "تجاوزت عدد المحاولات. اطلب رمزًا جديدًا.",
  provider_conflict: "لدى مقدم الرعاية موعد آخر في نفس الوقت.",
  invalid_provider: "مقدم الرعاية غير متاح.",
  email_exists: "البريد الإلكتروني مستخدم مسبقًا.",
  weak_password: "كلمة المرور يجب ألا تقل عن ١٠ أحرف وتحتوي على حروف وأرقام.",
  invalid_email: "البريد الإلكتروني غير صحيح.",
  cannot_change_self: "لا يمكنك تعطيل حسابك أو تغيير دورك بنفسك.",
  already_requested: "يوجد طلب قائم لهذا الموعد.",
  not_changeable: "لا يمكن تغيير هذا الموعد.",
  reopen_requires_supervisor: "إعادة فتح رحلة مغلقة تتطلب صلاحية مشرف.",
  cannot_discard_first_version: "لا يمكن تجاهل النسخة الأولى؛ ألغِ البرنامج بدلًا من ذلك.",
  invalid_specialty: "التخصص غير صحيح.",
  no_change: "لا يوجد تغيير.",
  not_editable: "لا يمكن تعديل هذا التمرين.",
  invalid_body: "اكتب نص الرسالة.",
  invalid_exercise: "التمرين المحدد غير مرتبط ببرنامجك.",
  removed: "هذا السجل محذوف. استعده أولًا ثم عدّله.",
  not_removed: "هذا السجل غير محذوف.",
  last_admin: "لا يمكن حذف آخر مدير نظام فعّال. أضف مديرًا آخر أولًا.",
  invalid_title: "اكتب عنوانًا واضحًا (٣ أحرف على الأقل).",
  invalid_dob: "تاريخ الميلاد غير صحيح.",
  invalid_sex: "قيمة الجنس غير صحيحة.",
};

export function humanError(err: unknown): string {
  const raw = typeof err === "string" ? err : (err as { message?: string })?.message ?? "";
  const key = raw.trim().split(/\s/)[0];
  if (MESSAGES[key]) return MESSAGES[key];
  for (const k of Object.keys(MESSAGES)) if (raw.includes(k)) return MESSAGES[k];
  if (/JWT|session/i.test(raw)) return "انتهت الجلسة. يرجى تسجيل الدخول مجددًا.";
  if (/violates row-level security/i.test(raw)) return MESSAGES.forbidden;
  if (/violates foreign key constraint|23503/i.test(raw)) return "لا يمكن حذف هذا العنصر لأنه مستخدم في سجلات أخرى. يمكنك إيقافه أو إخفاؤه بدلًا من ذلك.";
  if (/duplicate key|23505/i.test(raw)) return "القيمة مستخدمة مسبقًا في سجل آخر.";
  if (/fetch failed|network/i.test(raw)) return "تعذّر الاتصال. تحقق من الشبكة وحاول مجددًا.";
  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

export type ActionResult<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
