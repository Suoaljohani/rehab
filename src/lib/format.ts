/** Arabic-first, Gregorian calendar, Latin digits for clinical clarity, Asia/Riyadh time. */
const TZ = "Asia/Riyadh";
const LOCALE = "ar-SA-u-ca-gregory-nu-latn";

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...o });

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  // plain dates (YYYY-MM-DD) are calendar days in Riyadh
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T12:00:00+03:00`);
  return new Date(v);
}

export function fDate(v: string | Date | null | undefined, style: "long" | "short" | "day" | "weekday" = "long") {
  const d = toDate(v);
  if (!d) return "—";
  if (style === "short") return fmt({ day: "numeric", month: "short" }).format(d);
  if (style === "day") return fmt({ weekday: "long", day: "numeric", month: "long" }).format(d);
  if (style === "weekday") return fmt({ weekday: "long" }).format(d);
  return fmt({ day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function fTime(v: string | Date | null | undefined) {
  const d = toDate(v);
  if (!d) return "—";
  return fmt({ hour: "numeric", minute: "2-digit" }).format(d);
}

export function fDateTime(v: string | Date | null | undefined) {
  const d = toDate(v);
  if (!d) return "—";
  return fmt({ day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

export function fRelative(v: string | Date | null | undefined) {
  const d = toDate(v);
  if (!d) return "—";
  const diff = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return "الآن";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return fDate(d, "long");
}

/** Today's calendar date in Riyadh as YYYY-MM-DD. */
export function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts;
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayIndex(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const WEEKDAYS_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function age(dob?: string | null) {
  if (!dob) return null;
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export function minutes(sec?: number | null) {
  if (!sec) return 0;
  return Math.max(1, Math.round(sec / 60));
}

/** Human prescription string: "10 تكرارات · 3 مجموعات · ثبات 5 ث" */
export function prescription(p: { reps?: number | null; sets?: number | null; hold_sec?: number | null; duration_sec?: number | null }) {
  const out: string[] = [];
  if (p.reps) out.push(`${p.reps} ${p.reps > 10 || p.reps < 3 ? "تكرار" : "تكرارات"}`);
  if (p.sets) out.push(`${p.sets} ${p.sets === 1 ? "مجموعة" : p.sets <= 10 ? "مجموعات" : "مجموعة"}`);
  if (p.hold_sec) out.push(`ثبات ${p.hold_sec} ث`);
  if (p.duration_sec) out.push(p.duration_sec >= 60 ? `${Math.round(p.duration_sec / 60)} د` : `${p.duration_sec} ث`);
  return out;
}

export function daysLabel(days?: number[] | null) {
  if (!days || days.length === 0) return "—";
  if (days.length === 7) return "يوميًا";
  return [...days].sort((a, b) => a - b).map((d) => WEEKDAYS_SHORT[d]).join("، ");
}

export const REGION_LABEL: Record<string, string> = {
  knee: "الركبة",
  hip: "الورك",
  back: "الظهر",
  shoulder: "الكتف",
  neck: "الرقبة",
  ankle: "الكاحل",
  hand: "اليد",
  balance: "التوازن",
  speech: "النطق",
  core: "الجذع",
};

export const DIFFICULTY_LEVEL: Record<string, string> = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" };
