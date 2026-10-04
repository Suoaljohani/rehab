export const AUDIT_ACTION: Record<string, { label: string; tone: "slate" | "sage" | "clay" | "info" | "warning" | "danger" | "muted" }> = {
  create: { label: "إنشاء", tone: "sage" },
  update: { label: "تعديل", tone: "slate" },
  delete: { label: "حذف", tone: "danger" },
  publish: { label: "نشر", tone: "sage" },
  view: { label: "اطلاع", tone: "info" },
  export: { label: "تصدير", tone: "clay" },
  login: { label: "دخول", tone: "muted" },
  login_blocked: { label: "دخول محظور", tone: "danger" },
  access_denied: { label: "رفض وصول", tone: "danger" },
  password_reset: { label: "إعادة كلمة مرور", tone: "warning" },
  archive: { label: "أرشفة", tone: "warning" },
  restore: { label: "استعادة", tone: "slate" },
  safety_update: { label: "تحديث سلامة", tone: "warning" },
};

export const AUDIT_ENTITY: Record<string, string> = {
  patients: "المراجعون",
  patient_record: "السجل الطبي",
  episodes: "الحلقات العلاجية",
  care_team_members: "فرق الرعاية",
  clinical_notes: "الملاحظات السريرية",
  goals: "الأهداف",
  home_programs: "البرامج المنزلية",
  program_versions: "نسخ البرامج",
  exercises: "التمارين",
  exercise_versions: "نسخ التمارين",
  appointments: "المواعيد",
  profiles: "الحسابات",
  staff_profiles: "ملفات الموظفين",
  system_settings: "إعدادات النظام",
  announcements: "الإعلانات",
  cms_blocks: "محتوى الموقع",
  services: "الخدمات",
  faqs: "الأسئلة الشائعة",
  specialties: "التخصصات",
  engagement_report: "تقرير التفاعل",
  audit_events: "سجل التدقيق",
};

export type AuditFilters = { entity?: string; action?: string; actor?: string; from?: string; to?: string; q?: string };

/** Applies the same filters to the page query and the CSV export. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAuditFilters<T extends { eq: any; gte: any; lt: any; or: any }>(query: T, f: AuditFilters): T {
  let q = query;
  if (f.entity) q = q.eq("entity_type", f.entity);
  if (f.action) q = q.eq("action", f.action);
  if (f.actor) q = q.eq("actor_id", f.actor);
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00+03:00`);
  if (f.to) q = q.lt("created_at", new Date(new Date(`${f.to}T00:00:00+03:00`).getTime() + 864e5).toISOString());
  if (f.q && /^[\w-]{4,64}$/.test(f.q)) q = q.eq("entity_id", f.q);
  return q;
}
