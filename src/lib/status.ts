import type { BadgeTone } from "@/components/ui/badge";

/** One consistent status vocabulary across the product (PRD §134). */
type Entry = { label: string; tone: BadgeTone };
type Map = Record<string, Entry>;

export const EPISODE_STATUS: Map = {
  draft: { label: "مسودة", tone: "muted" },
  active: { label: "نشطة", tone: "sage" },
  on_hold: { label: "معلّقة", tone: "warning" },
  completed: { label: "مكتملة", tone: "success" },
  discharged: { label: "خروج", tone: "slate" },
  cancelled: { label: "ملغاة", tone: "muted" },
};

export const PROGRAM_STATUS: Map = {
  draft: { label: "مسودة", tone: "muted" },
  scheduled: { label: "مجدول", tone: "info" },
  active: { label: "نشط", tone: "sage" },
  paused: { label: "متوقف مؤقتًا", tone: "warning" },
  completed: { label: "مكتمل", tone: "success" },
  superseded: { label: "نسخة سابقة", tone: "slate" },
  cancelled: { label: "ملغى", tone: "muted" },
};

export const EXERCISE_STATUS: Map = {
  draft: { label: "مسودة", tone: "muted" },
  in_review: { label: "قيد المراجعة", tone: "info" },
  approved: { label: "معتمد", tone: "success" },
  rejected: { label: "مرفوض", tone: "danger" },
  changes_requested: { label: "مطلوب تعديل", tone: "warning" },
  archived: { label: "مؤرشف", tone: "slate" },
};

export const APPOINTMENT_STATUS: Map = {
  requested: { label: "مطلوب", tone: "clay" },
  pending_confirmation: { label: "بانتظار التأكيد", tone: "warning" },
  confirmed: { label: "مؤكد", tone: "sage" },
  checked_in: { label: "تم الحضور", tone: "info" },
  completed: { label: "مكتمل", tone: "success" },
  no_show: { label: "لم يحضر", tone: "danger" },
  cancelled: { label: "ملغى", tone: "muted" },
  rescheduled: { label: "أعيدت جدولته", tone: "slate" },
};

export const REQUEST_STATUS: Map = {
  new: { label: "جديد", tone: "clay" },
  under_review: { label: "قيد المراجعة", tone: "info" },
  need_information: { label: "بحاجة لمعلومات", tone: "warning" },
  accepted: { label: "مقبول", tone: "sage" },
  scheduled: { label: "تمت الجدولة", tone: "success" },
  rejected: { label: "مرفوض", tone: "danger" },
  closed: { label: "مغلق", tone: "muted" },
};

export const SCHEDULE_ITEM_STATUS: Map = {
  scheduled: { label: "مجدول", tone: "slate" },
  completed: { label: "مكتمل", tone: "success" },
  missed: { label: "فائت", tone: "clay" },
  cancelled: { label: "ملغى", tone: "muted" },
  paused: { label: "موقوف", tone: "warning" },
};

export const FLAG_SEVERITY: Map = {
  high: { label: "مهم", tone: "danger" },
  medium: { label: "متابعة", tone: "warning" },
  low: { label: "للعلم", tone: "info" },
};

export const USER_STATUS: Map = {
  active: { label: "نشط", tone: "sage" },
  invited: { label: "مدعو", tone: "info" },
  disabled: { label: "موقوف", tone: "danger" },
};

export const ROLE_LABEL: Record<string, string> = {
  patient: "مراجع",
  provider: "مقدم رعاية",
  supervisor: "مشرف القسم",
  admin: "مدير النظام",
  content_reviewer: "مراجع المحتوى",
  super_admin: "مدير عام",
};

export const CARE_ROLE_LABEL: Record<string, string> = {
  primary: "مقدم الرعاية الرئيسي",
  secondary: "عضو فريق الرعاية",
  covering: "مقدم رعاية مناوب",
  supervisor: "مشرف",
};

export const THREAD_CATEGORY: Map = {
  exercise_question: { label: "سؤال عن تمرين", tone: "sage" },
  pain: { label: "ألم / صعوبة", tone: "clay" },
  appointment: { label: "موعد", tone: "info" },
  general: { label: "استفسار عام", tone: "neutral" },
};

export const ISSUE_REASON: Record<string, string> = {
  pain: "سبب لي ألمًا",
  hard: "صعب التنفيذ",
  unclear: "لم أفهم الطريقة",
  cannot: "لا أستطيع تنفيذه",
  other: "مشكلة أخرى",
};

export const DIFFICULTY_LABEL: Record<string, string> = {
  very_easy: "سهل جدًا",
  easy: "سهل",
  appropriate: "مناسب",
  difficult: "صعب",
  very_difficult: "صعب جدًا",
};

export const FEELING_LABEL: Record<string, string> = {
  better: "أفضل",
  same: "كما هو",
  worse: "أسوأ",
};

export function statusOf(map: Map, key?: string | null): Entry {
  return (key && map[key]) || { label: key ?? "—", tone: "muted" };
}
