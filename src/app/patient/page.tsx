import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, ChevronLeft, MapPin, MessageCircle, PauseCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getNextAppointment, getPrograms, getTodayItems, getUnread } from "@/lib/patient-data";
import { createClient } from "@/lib/supabase/server";
import { TodayCard } from "@/components/patient/today-card";
import { ExerciseArt } from "@/components/exercise/exercise-art";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { EmergencyNotice, Notice } from "@/components/ui/notice";
import { ProgressRing } from "@/components/ui/progress";
import { ButtonLink } from "@/components/ui/button";
import { fDate, fTime, minutes, prescription, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";

export default async function TodayPage() {
  const viewer = await requireRole(["patient"], "patient");
  const pid = viewer.patientId!;
  const supabase = await createClient();
  const [items, programs, appt, unread, adh] = await Promise.all([
    getTodayItems(pid),
    getPrograms(pid),
    getNextAppointment(pid),
    getUnread(viewer.id, pid),
    supabase.rpc("adherence", {}).then((r) => r.data as { rate: number | null; completed: number; eligible: number } | null),
  ]);
  supabase.from("analytics_events").insert({ user_id: viewer.id, event: "today_viewed" }).then(() => {});

  const firstName = viewer.fullName.split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Riyadh", hour: "numeric", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? "صباح الخير" : "مساء الخير";
  const live = programs.filter((p) => ["active", "scheduled", "paused"].includes(p.status));
  const paused = live.find((p) => p.status === "paused");
  const byProgram = new Map<string, typeof items>();
  items.forEach((it) => byProgram.set(it.program_id, [...(byProgram.get(it.program_id) ?? []), it]));
  const groups = [...byProgram.entries()].map(([id, its]) => ({ program: programs.find((p) => p.id === id), items: its }));
  const apptToday = appt && new Date(appt.starts_at).toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6 animate-[rise_0.5s_var(--ease-calm)_both]">
      <div>
        <div className="text-sm text-text-2">{fDate(todayISO(), "day")}</div>
        <h1 className="mt-0.5 font-display text-[1.75rem] font-semibold text-ink">{greeting}، {firstName}</h1>
      </div>

      {paused && (
        <Notice tone="warning" icon={<PauseCircle size={18} />} title="برنامجك المنزلي متوقف مؤقتًا">
          أوقف فريق رعايتك البرنامج مؤقتًا. لن تُحتسب هذه الفترة في التزامك. سيصلك إشعار عند الاستئناف.
        </Notice>
      )}

      {groups.length > 0 ? (
        groups.map(({ program, items: its }) => {
          const done = its.filter((i) => i.status === "completed").length;
          const est = minutes(its.reduce((s, i) => s + (i.program_exercise.exercise_version.est_duration_sec ?? 120), 0));
          return (
            <div key={program?.id ?? "p"} className="space-y-4">
              <TodayCard total={its.length} done={done} minutes={est} programId={program?.id ?? ""} programTitle={program?.title ?? "برنامج اليوم"} />
              <ul className="space-y-2.5" aria-label="تمارين اليوم">
                {its.map((it, idx) => {
                  const pe = it.program_exercise;
                  const ev = pe.exercise_version;
                  const doneItem = it.status === "completed";
                  return (
                    <li key={it.id}>
                      <Link href={`/patient/plan/exercise/${pe.id}`} className={cn("group flex items-center gap-4 rounded-[22px] border bg-surface p-3 pe-4 transition hover:shadow-[var(--shadow-md)]", doneItem ? "border-sage-200" : "border-line/80")}>
                        <ExerciseArt region={ev.body_region} className="size-16 shrink-0 rounded-[16px]" animated={false} label={ev.name} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-text-3">التمرين {idx + 1}</div>
                          <div className={cn("truncate font-semibold", doneItem ? "text-sage-800" : "text-ink")}>{ev.name}</div>
                          <div className="mt-0.5 text-[0.8125rem] text-text-2">{prescription(pe).join(" · ")}</div>
                        </div>
                        {doneItem ? (
                          <span className="grid size-8 place-items-center rounded-full bg-sage-600 text-white" aria-label="مكتمل"><Check size={16} strokeWidth={2.6} /></span>
                        ) : (
                          <ChevronLeft className="text-text-3 transition group-hover:-translate-x-0.5" size={20} />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      ) : live.length > 0 && !paused ? (
        <Card tone="travertine" padded={false}>
          <EmptyState title="لا توجد تمارين منزلية مجدولة لك اليوم" description="يوم راحة حسب خطتك. الراحة جزء من التعافي." action={<ButtonLink href="/patient/plan" variant="secondary" size="sm">عرض جدول الأسبوع</ButtonLink>} />
        </Card>
      ) : !paused ? (
        <Card tone="travertine" padded={false}>
          <EmptyState title="لا يوجد برنامج منزلي نشط" description="سيظهر برنامجك هنا بمجرد أن ينشره مقدم الرعاية. يمكنك الاطلاع على دليل المراجع في الأثناء." action={<ButtonLink href="/guide" variant="secondary" size="sm">دليل المراجع</ButtonLink>} />
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {appt ? (
          <Link href="/patient/appointments" className="group rounded-[24px] border border-line/80 bg-surface p-5 transition hover:shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-[13px] bg-clay-50 text-clay-600"><CalendarDays size={19} /></span>
              {apptToday && <span className="rounded-full bg-clay-100 px-2.5 py-0.5 text-xs font-medium text-clay-700">اليوم</span>}
            </div>
            <div className="mt-4 text-xs text-text-2">موعدك القادم</div>
            <div className="mt-0.5 font-semibold text-ink">{fDate(appt.starts_at, "day")} · {fTime(appt.starts_at)}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-text-2"><MapPin size={14} />{appt.location ?? "قسم التأهيل الطبي"}{(appt.provider as unknown as { full_name: string } | null)?.full_name ? ` · ${(appt.provider as unknown as { full_name: string }).full_name}` : ""}</div>
          </Link>
        ) : (
          <div className="rounded-[24px] border border-dashed border-line bg-surface/60 p-5">
            <CalendarDays className="text-text-3" size={20} />
            <div className="mt-4 font-medium text-ink">لا توجد مواعيد قادمة</div>
            <div className="mt-1 text-sm text-text-2">سيتواصل معك القسم عند جدولة جلستك.</div>
          </div>
        )}
        <Link href="/patient/progress" className="group flex items-center gap-4 rounded-[24px] border border-line/80 bg-surface p-5 transition hover:shadow-[var(--shadow-md)]">
          <ProgressRing value={adh?.rate ?? 0} size={68} stroke={7} label={`الالتزام ${adh?.rate ?? 0}٪`}>
            <span className="text-sm font-semibold text-ink tabular">{adh?.rate ?? "—"}{adh?.rate != null ? "٪" : ""}</span>
          </ProgressRing>
          <div>
            <div className="text-xs text-text-2">التزامك هذا الأسبوع</div>
            <div className="mt-0.5 font-semibold text-ink">{adh?.completed ?? 0} تمرين مكتمل</div>
            <div className="mt-1 inline-flex items-center gap-1 text-[0.8125rem] text-slate-600">عرض تقدمي <ArrowLeft size={14} /></div>
          </div>
        </Link>
      </div>

      {unread.messages > 0 && (
        <Link href="/patient/messages" className="flex items-center gap-4 rounded-[22px] border border-sage-200 bg-sage-50 p-4 transition hover:shadow-[var(--shadow-sm)]">
          <span className="grid size-10 place-items-center rounded-full bg-surface text-sage-700"><MessageCircle size={19} /></span>
          <div className="flex-1"><div className="font-semibold text-ink">لديك {unread.messages === 1 ? "رسالة جديدة" : `${unread.messages} رسائل جديدة`}</div><div className="text-sm text-sage-800">من فريق رعايتك</div></div>
          <ChevronLeft className="text-sage-700" size={20} />
        </Link>
      )}

      <EmergencyNotice />
    </div>
  );
}
