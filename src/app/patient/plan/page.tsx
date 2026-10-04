import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Target, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getEpisodes, getPrograms, PE_SELECT, type ProgramExercise } from "@/lib/patient-data";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { Avatar } from "@/components/ui/avatar";
import { ExerciseArt } from "@/components/exercise/exercise-art";
import { EPISODE_STATUS, PROGRAM_STATUS, CARE_ROLE_LABEL } from "@/lib/status";
import { WEEKDAYS, addDays, daysLabel, fDate, prescription, todayISO, weekdayIndex } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "خطتي" };

type Member = { id: string; role: string; ended_at: string | null; provider: { id: string; full_name: string; staff: { title: string | null } | null } | null };

export default async function PlanPage() {
  const viewer = await requireRole(["patient"], "patient");
  const pid = viewer.patientId!;
  const supabase = await createClient();
  const [episodes, programs] = await Promise.all([getEpisodes(pid), getPrograms(pid)]);
  const current = episodes.find((e) => e.status === "active" || e.status === "on_hold");
  const program = programs.find((p) => ["active", "scheduled", "paused"].includes(p.status) && p.episode_id === current?.id) ?? programs.find((p) => ["active", "scheduled", "paused"].includes(p.status));

  // week starts Sunday (Riyadh calendar)
  const today = todayISO();
  const weekStart = addDays(today, -weekdayIndex(today));
  const weekEnd = addDays(weekStart, 6);
  let pes: ProgramExercise[] = [];
  let itemsByDay = new Map<string, { total: number; done: number }>();
  let appts: { starts_at: string }[] = [];
  if (program?.current_version_id) {
    const [{ data: peData }, { data: si }, { data: ap }] = await Promise.all([
      supabase.from("program_exercises").select(PE_SELECT).eq("program_version_id", program.current_version_id).order("order_index"),
      supabase.from("schedule_items").select("scheduled_date, status").eq("program_id", program.id).gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd).in("status", ["scheduled", "completed", "paused"]),
      supabase.from("appointments").select("starts_at").eq("patient_id", pid).gte("starts_at", `${weekStart}T00:00:00+03:00`).lte("starts_at", `${weekEnd}T23:59:59+03:00`).not("status", "in", "(cancelled,rescheduled)"),
    ]);
    pes = (peData ?? []) as unknown as ProgramExercise[];
    itemsByDay = new Map();
    (si ?? []).forEach((s) => {
      const cur = itemsByDay.get(s.scheduled_date) ?? { total: 0, done: 0 };
      cur.total++;
      if (s.status === "completed") cur.done++;
      itemsByDay.set(s.scheduled_date, cur);
    });
    appts = ap ?? [];
  }
  const careTeam = ((current?.care_team ?? []) as unknown as Member[]).filter((m) => !m.ended_at);
  const primary = careTeam.find((m) => m.role === "primary");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[1.875rem] font-semibold text-ink">خطتي</h1>
      {!current ? (
        <Card><EmptyState title="لا توجد رحلة تأهيلية نشطة" description="عند بدء رحلة جديدة ستظهر خطتك هنا." /></Card>
      ) : (
        <>
          <Card tone="travertine" className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs text-text-2">رحلتك التأهيلية الحالية · {(current.specialty as unknown as { name: string })?.name}</div>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{current.title}</h2>
                <div className="mt-1 text-sm text-text-2">منذ {fDate(current.start_date)}</div>
              </div>
              <StatusBadge map={EPISODE_STATUS} value={current.status} />
            </div>
            {current.main_goal && (
              <div className="mt-5 flex items-start gap-3 rounded-[16px] bg-surface/80 p-4 ring-1 ring-line/70">
                <Target size={19} className="mt-0.5 shrink-0 text-sage-700" />
                <div><div className="text-xs text-text-2">الهدف الرئيسي</div><div className="font-medium text-ink">{current.main_goal}</div></div>
              </div>
            )}
            {primary?.provider && (
              <Link href="/patient/team" className="mt-3 flex items-center gap-3 rounded-[16px] bg-surface/80 p-3 ring-1 ring-line/70 transition hover:ring-sand-300">
                <Avatar name={primary.provider.full_name} size="sm" />
                <div className="flex-1"><div className="text-xs text-text-2">{CARE_ROLE_LABEL.primary}</div><div className="text-sm font-medium text-ink">{primary.provider.full_name}</div></div>
                <span className="inline-flex items-center gap-1 text-xs text-text-2"><Users size={14} /> فريق رعايتي <ChevronLeft size={14} /></span>
              </Link>
            )}
          </Card>

          <section aria-labelledby="week-title">
            <h2 id="week-title" className="mb-3 text-lg font-semibold text-ink">جدول هذا الأسبوع</h2>
            <div className="overflow-hidden rounded-[22px] border border-line/80 bg-surface">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = addDays(weekStart, i);
                const home = itemsByDay.get(d);
                const inPerson = appts.some((a) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(a.starts_at)) === d);
                const isToday = d === today;
                const label = inPerson && home ? "جلسة حضورية + برنامج منزلي" : inPerson ? "جلسة حضورية" : home ? `برنامج منزلي · ${home.total} تمارين` : "راحة";
                return (
                  <div key={d} className={cn("flex items-center gap-4 border-b border-line-soft px-4 py-3.5 last:border-0", isToday && "bg-sage-50")}>
                    <div className="w-20 shrink-0">
                      <div className={cn("text-sm font-medium", isToday ? "text-sage-800" : "text-ink")}>{WEEKDAYS[i]}</div>
                      <div className="text-xs text-text-3">{fDate(d, "short")}</div>
                    </div>
                    <span className={cn("size-2 rounded-full", inPerson ? "bg-clay-400" : home ? "bg-sage-500" : "bg-sand-300")} aria-hidden="true" />
                    <div className={cn("flex-1 text-[0.9375rem]", !home && !inPerson ? "text-text-3" : "text-text")}>{label}</div>
                    {home && d <= today && <span className="text-xs text-text-2 tabular">{home.done}/{home.total}</span>}
                    {isToday && <span className="rounded-full bg-sage-600 px-2 py-0.5 text-[0.6875rem] text-white">اليوم</span>}
                  </div>
                );
              })}
            </div>
          </section>

          {program ? (
            <section aria-labelledby="program-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="program-title" className="text-lg font-semibold text-ink">البرنامج المنزلي</h2>
                <StatusBadge map={PROGRAM_STATUS} value={program.status} />
              </div>
              <Card className="mb-3 p-5">
                <div className="font-semibold text-ink">{program.title}</div>
                <div className="mt-1 text-sm text-text-2">من {fDate(program.start_date)} إلى {fDate(program.end_date)}{(program.current_version as unknown as { version: number } | null)?.version ? ` · النسخة ${(program.current_version as unknown as { version: number }).version}` : ""}</div>
                {program.instructions && <p className="mt-3 rounded-[14px] bg-sand-50 p-3 text-sm leading-relaxed text-text ring-1 ring-sand-200">{program.instructions}</p>}
              </Card>
              <ul className="space-y-2.5">
                {pes.map((pe) => (
                  <li key={pe.id}>
                    <Link href={`/patient/plan/exercise/${pe.id}`} className="group flex items-center gap-4 rounded-[20px] border border-line/80 bg-surface p-3 pe-4 transition hover:shadow-[var(--shadow-md)]">
                      <ExerciseArt region={pe.exercise_version.body_region} className="size-14 shrink-0 rounded-[14px]" animated={false} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-ink">{pe.exercise_version.name}</div>
                        <div className="text-[0.8125rem] text-text-2">{prescription(pe).join(" · ")}</div>
                        <div className="text-xs text-text-3">{daysLabel(pe.days_of_week)}</div>
                      </div>
                      <ChevronLeft className="text-text-3" size={20} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <Card><EmptyState compact title="لا يوجد برنامج منزلي نشط" description="سيظهر برنامجك هنا عند نشره." /></Card>
          )}
        </>
      )}

      {episodes.filter((e) => e.id !== current?.id).length > 0 && (
        <Card>
          <CardHeader title="رحلاتي السابقة" description="يحتفظ النظام بتاريخ كل رحلة تأهيلية بشكل منفصل." />
          <ul className="divide-y divide-line-soft">
            {episodes.filter((e) => e.id !== current?.id).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div><div className="font-medium text-ink">{e.title}</div><div className="text-xs text-text-2">{fDate(e.start_date)} — {e.end_date ? fDate(e.end_date) : "مستمرة"}</div></div>
                <StatusBadge map={EPISODE_STATUS} value={e.status} size="sm" />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
