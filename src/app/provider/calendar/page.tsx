import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { AppointmentActions } from "@/components/provider/appointment-actions";
import { APPOINTMENT_STATUS } from "@/lib/status";
import { WEEKDAYS, addDays, fDate, fTime, todayISO, weekdayIndex } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "التقويم" };

export default async function Calendar({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  const { week } = await searchParams;
  const today = todayISO();
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today;
  const start = addDays(anchor, -weekdayIndex(anchor));
  const end = addDays(start, 6);
  const supabase = await createClient();
  const [{ data }, { data: avail }] = await Promise.all([
    supabase.from("appointments").select("id, starts_at, duration_min, location, status, episode_id, patient:patients(full_name), specialty:specialties(name)")
      .eq("provider_id", viewer.id).gte("starts_at", `${start}T00:00:00+03:00`).lte("starts_at", `${end}T23:59:59+03:00`).order("starts_at"),
    supabase.from("provider_availability").select("weekday, start_time, end_time, location").eq("provider_id", viewer.id),
  ]);
  const byDay = new Map<string, NonNullable<typeof data>>();
  (data ?? []).forEach((a) => { const k = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(a.starts_at)); byDay.set(k, [...(byDay.get(k) ?? []), a]); });
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="التقويم" description={`${fDate(start)} — ${fDate(end)} · ${(data ?? []).length} جلسات`}
        actions={<div className="flex items-center gap-2">
          <Link href={`/provider/calendar?week=${addDays(start, -7)}`} className={buttonClasses("quiet", "sm")} aria-label="الأسبوع السابق"><ChevronRight size={16} /></Link>
          <Link href="/provider/calendar" className={buttonClasses("quiet", "sm")}>هذا الأسبوع</Link>
          <Link href={`/provider/calendar?week=${addDays(start, 7)}`} className={buttonClasses("quiet", "sm")} aria-label="الأسبوع التالي"><ChevronLeft size={16} /></Link>
        </div>} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(start, i);
          const list = byDay.get(d) ?? [];
          const isToday = d === today;
          const av = (avail ?? []).find((x) => x.weekday === i);
          return (
            <section key={d} className={cn("min-h-40 rounded-[20px] border p-3", isToday ? "border-sage-300 bg-sage-50/60" : "border-line/80 bg-surface")} aria-label={WEEKDAYS[i]}>
              <div className="mb-3 flex items-baseline justify-between">
                <div><div className={cn("text-sm font-semibold", isToday ? "text-sage-800" : "text-ink")}>{WEEKDAYS[i]}</div><div className="text-xs text-text-3">{fDate(d, "short")}</div></div>
                {av ? <span className="text-[0.625rem] text-text-3 tabular">{av.start_time.slice(0, 5)}–{av.end_time.slice(0, 5)}</span> : <span className="text-[0.625rem] text-text-3">إجازة</span>}
              </div>
              <ul className="space-y-2">
                {list.map((a) => (
                  <li key={a.id} className={cn("rounded-[14px] border-s-4 bg-surface p-2.5 shadow-[var(--shadow-xs)] ring-1 ring-line-soft", a.status === "completed" ? "border-success" : a.status === "no_show" ? "border-danger" : a.status === "checked_in" ? "border-info" : "border-slate-500")}>
                    <div className="text-xs font-semibold text-ink tabular">{fTime(a.starts_at)} · {a.duration_min}د</div>
                    <Link href={a.episode_id ? `/provider/patients/${a.episode_id}` : "#"} className="mt-0.5 block truncate text-sm text-ink hover:underline">{(a.patient as unknown as { full_name: string })?.full_name}</Link>
                    <div className="truncate text-[0.6875rem] text-text-2">{a.location}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1"><StatusBadge map={APPOINTMENT_STATUS} value={a.status} size="sm" /></div>
                    {d === today && <div className="mt-1.5"><AppointmentActions id={a.id} status={a.status} /></div>}
                  </li>
                ))}
                {list.length === 0 && <li className="py-4 text-center text-xs text-text-3">—</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
