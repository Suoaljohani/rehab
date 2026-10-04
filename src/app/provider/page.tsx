import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardList, HeartPulse, MessageCircle, Users } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOpenFlags } from "@/lib/provider-data";
import { getStaffBadges } from "@/lib/staff-data";
import { FlagList } from "@/components/provider/flag-list";
import { PageHeader, SectionTitle, Stat } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { AppointmentActions } from "@/components/provider/appointment-actions";
import { APPOINTMENT_STATUS } from "@/lib/status";
import { fDate, fRelative, fTime, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "يومي" };

const EVENT_TONE: Record<string, string> = { PATIENT_FEEDBACK: "bg-clay-400", HOME_SESSION_COMPLETED: "bg-sage-500", PROGRAM_PUBLISHED: "bg-slate-600", PROGRAM_UPDATED: "bg-slate-600", MESSAGE_SENT: "bg-info" };

export default async function ProviderToday() {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  const supabase = await createClient();
  await supabase.rpc("refresh_attention_flags");
  const today = todayISO();
  const [flags, badges, { data: appts }, { count: active }, { data: events }, { count: ending }] = await Promise.all([
    getOpenFlags(),
    getStaffBadges(viewer),
    supabase.from("appointments").select("id, starts_at, duration_min, location, status, episode_id, patient:patients(full_name), episode:episodes(title)")
      .eq("provider_id", viewer.id).gte("starts_at", `${today}T00:00:00+03:00`).lte("starts_at", `${today}T23:59:59+03:00`).order("starts_at"),
    supabase.from("care_team_members").select("id, episode:episodes!inner(status)", { count: "exact", head: true }).eq("provider_id", viewer.id).is("ended_at", null).eq("episode.status", "active"),
    supabase.from("timeline_events").select("id, type, title, detail, created_at, episode_id, patient:patients(full_name)").gte("created_at", new Date(Date.now() - 2 * 864e5).toISOString()).neq("type", "INTERNAL_NOTE").order("created_at", { ascending: false }).limit(12),
    supabase.from("attention_flags").select("id", { count: "exact", head: true }).eq("status", "open").eq("kind", "program_ending"),
  ]);
  const high = flags.filter((f) => f.severity === "high").length;
  const hour = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Riyadh", hour: "numeric", hour12: false }).format(new Date()));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow={fDate(today, "day")} title={`${hour < 12 ? "صباح الخير" : "مساء الخير"}، ${viewer.fullName.split(" ")[0]}`} description="هذا ما يحتاج انتباهك اليوم." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="جلسات اليوم" value={(appts ?? []).length} icon={<CalendarDays size={18} />} tone="ink" hint={(appts ?? [])[0] ? `الأولى ${fTime(appts![0].starts_at)}` : "لا توجد جلسات"} href="/provider/calendar" />
        <Stat label="بحاجة إلى انتباه" value={flags.length} icon={<HeartPulse size={18} />} tone={flags.length ? "attention" : "default"} hint={high ? `${high} مهمة` : "لا توجد حالات عاجلة"} />
        <Stat label="رسائل جديدة" value={badges.messages} icon={<MessageCircle size={18} />} href="/provider/messages" hint="من المراجعين" />
        <Stat label="مراجعون نشطون" value={active ?? 0} icon={<Users size={18} />} tone="sage" href="/provider/patients" hint={ending ? `${ending} برنامج ينتهي قريبًا` : undefined} />
      </div>
      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="attention">
          <SectionTitle><span id="attention">مركز الانتباه</span></SectionTitle>
          <FlagList flags={flags} />
          <p className="mt-3 text-xs text-text-3">التنبيهات مبنية على قواعد يحددها القسم ولا تُعد توصيات طبية.</p>
        </section>
        <div className="space-y-8">
          <section aria-labelledby="sessions">
            <SectionTitle action={<Link href="/provider/calendar" className="text-sm text-slate-600 hover:underline">التقويم</Link>}><span id="sessions">جلسات اليوم</span></SectionTitle>
            {(appts ?? []).length === 0 ? <Card><EmptyState compact icon={<CalendarDays size={22} />} title="لا توجد جلسات حضورية اليوم" /></Card> : (
              <ul className="space-y-2.5">
                {(appts ?? []).map((a) => (
                  <li key={a.id} className="rounded-[18px] border border-line/80 bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-[4.5rem] shrink-0 text-center"><div className="whitespace-nowrap text-[0.9375rem] font-semibold text-ink tabular">{fTime(a.starts_at)}</div><div className="text-[0.6875rem] text-text-3">{a.duration_min} د</div></div>
                      <div className="min-w-0 flex-1 border-s border-line-soft ps-3">
                        <Link href={a.episode_id ? `/provider/patients/${a.episode_id}` : "#"} className="font-semibold text-ink hover:underline">{(a.patient as unknown as { full_name: string })?.full_name}</Link>
                        <div className="text-sm text-text-2">{(a.episode as unknown as { title: string } | null)?.title} · {a.location}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge map={APPOINTMENT_STATUS} value={a.status} size="sm" /><AppointmentActions id={a.id} status={a.status} /></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="events">
            <SectionTitle><span id="events">أحداث حديثة</span></SectionTitle>
            {(events ?? []).length === 0 ? <Card><EmptyState compact icon={<ClipboardList size={22} />} title="لا أحداث خلال آخر يومين" /></Card> : (
              <ul className="rounded-[20px] border border-line/80 bg-surface px-4 py-2">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="flex gap-3 border-b border-line-soft py-3 last:border-0">
                    <span className={`mt-2 size-2 shrink-0 rounded-full ${EVENT_TONE[e.type] ?? "bg-sand-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm"><Link href={`/provider/patients/${e.episode_id}`} className="font-medium text-ink hover:underline">{(e.patient as unknown as { full_name: string })?.full_name}</Link> <span className="text-text">— {e.title}</span></div>
                      <div className="text-xs text-text-3">{fRelative(e.created_at)}</div>
                    </div>
                    <Avatar name={(e.patient as unknown as { full_name: string })?.full_name} size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
