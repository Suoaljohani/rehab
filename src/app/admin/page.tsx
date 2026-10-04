import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, CalendarDays, ClipboardList, Dumbbell, FileClock, HeartPulse, Inbox, MessageCircle, UserX, Users } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, SectionTitle, Stat } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart, HBarList } from "@/components/ui/charts";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { REQUEST_STATUS } from "@/lib/status";
import { fDate, fRelative, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "مركز القيادة" };

export default async function CommandCenter() {
  const viewer = await getViewer();
  if (!viewer || !["supervisor", "admin", "super_admin"].includes(viewer.role)) redirect("/admin/exercises");
  const supabase = await createClient();
  await supabase.rpc("refresh_attention_flags");
  const [{ data: k }, { data: eng }, { data: caseload }, { data: requests }, { data: unassigned }, { data: specs }] = await Promise.all([
    supabase.rpc("admin_kpis"),
    supabase.rpc("engagement_report", { p_days: 28 }),
    supabase.rpc("provider_caseload"),
    supabase.from("appointment_requests").select("id, reference, full_name, status, created_at, specialty:specialties(name)").in("status", ["new", "under_review", "need_information"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("attention_flags").select("id, created_at, episode:episodes(id, title, patient:patients(id, full_name))").eq("kind", "unassigned").eq("status", "open").limit(5),
    supabase.from("specialties").select("code, name"),
  ]);
  const K = (k ?? {}) as Record<string, number | null>;
  const E = (eng ?? {}) as { weekly?: { week: string; eligible: number; completed: number }[]; sessions_assigned?: number; sessions_completed?: number; inactive_patients?: number; avg_pain?: number | null; feelings?: Record<string, number> };
  const specName = new Map((specs ?? []).map((s) => [s.code, s.name]));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow={fDate(todayISO(), "day")} title="مركز القيادة" description="حالة قسم التأهيل الطبي في لمحة واحدة." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="المراجعون النشطون" value={K.active_patients ?? 0} icon={<Users size={18} />} tone="ink" hint={`${K.active_episodes ?? 0} رحلة نشطة`} href="/admin/patients" />
        <Stat label="مواعيد اليوم" value={K.todays_appointments ?? 0} icon={<CalendarDays size={18} />} href="/admin/appointments?tab=appointments" hint={`${K.no_shows_30d ?? 0} عدم حضور خلال ٣٠ يومًا`} />
        <Stat label="طلبات المواعيد" value={K.appointment_requests ?? 0} icon={<Inbox size={18} />} tone={(K.appointment_requests ?? 0) > 0 ? "attention" : "default"} href="/admin/appointments" hint={`${K.change_requests ?? 0} طلب تغيير`} />
        <Stat label="بدون مقدم رعاية" value={K.unassigned ?? 0} icon={<UserX size={18} />} tone={(K.unassigned ?? 0) > 0 ? "attention" : "default"} href="/admin/assignments" hint="بانتظار التوزيع" />
        <Stat label="برامج منزلية نشطة" value={K.active_programs ?? 0} icon={<Dumbbell size={18} />} tone="sage" hint={`التزام ٧ أيام: ${K.adherence_7d ?? "—"}٪`} />
        <Stat label="تنبيهات الانتباه" value={K.attention_flags ?? 0} icon={<HeartPulse size={18} />} href="/provider" hint="عبر جميع الفرق" />
        <Stat label="رسائل المراجعين" value={K.unread_patient_messages ?? 0} icon={<MessageCircle size={18} />} hint="بانتظار رد الفريق" />
        <Stat label="تمارين بانتظار الاعتماد" value={K.pending_reviews ?? 0} icon={<FileClock size={18} />} href="/admin/exercises?tab=in_review" hint="Exercise Studio" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="الالتزام الأسبوعي للقسم" description="نسبة التمارين المنجزة من المؤهلة — آخر ٤ أسابيع" action={<Link href="/admin/reports" className="text-sm text-slate-600 hover:underline">التقارير</Link>} />
          <BarChart title="الالتزام الأسبوعي للقسم" unit="٪" max={100} height={200}
            data={(E.weekly ?? []).map((w) => ({ label: `أسبوع ${fDate(w.week, "short")}`, value: w.eligible ? Math.round((w.completed / w.eligible) * 100) : null, hint: `${w.completed} من ${w.eligible}` }))} />
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line-soft pt-5 text-center">
            <div><div className="font-display text-2xl font-semibold text-ink tabular">{E.sessions_completed ?? 0}<span className="text-sm text-text-3">/{E.sessions_assigned ?? 0}</span></div><div className="text-xs text-text-2">جلسات منزلية مكتملة</div></div>
            <div><div className="font-display text-2xl font-semibold text-ink tabular">{E.inactive_patients ?? 0}</div><div className="text-xs text-text-2">مراجعون غير نشطين (٧ أيام)</div></div>
            <div><div className="font-display text-2xl font-semibold text-ink tabular">{E.avg_pain ?? "—"}</div><div className="text-xs text-text-2">متوسط الألم المُبلّغ</div></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="عبء الحالات" description="الحالات النشطة مقابل السعة" action={<Link href="/admin/assignments" className="text-sm text-slate-600 hover:underline">التوزيع</Link>} />
          <HBarList title="عبء الحالات" tone="slate"
            data={(caseload ?? []).map((c: { full_name: string; active_episodes: number; capacity: number; specialty_code: string | null }) => ({ label: c.full_name, value: c.active_episodes, hint: `السعة ${c.capacity} · ${specName.get(c.specialty_code ?? "") ?? ""}` }))}
            max={Math.max(...(caseload ?? []).map((c: { capacity: number }) => c.capacity), 1)} />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle action={<Link href="/admin/appointments" className="text-sm text-slate-600 hover:underline">الكل</Link>}>أحدث طلبات المواعيد</SectionTitle>
          {(requests ?? []).length === 0 ? <Card><EmptyState compact icon={<Inbox size={22} />} title="لا توجد طلبات معلّقة" /></Card> : (
            <ul className="overflow-hidden rounded-[20px] border border-line/80 bg-surface">
              {(requests ?? []).map((r) => (
                <li key={r.id} className="border-b border-line-soft last:border-0"><Link href={`/admin/appointments?request=${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#FCFAF7]">
                  <div><div className="font-medium text-ink">{r.full_name}</div><div className="text-xs text-text-2"><span dir="ltr">{r.reference}</span> · {(r.specialty as unknown as { name: string } | null)?.name ?? "خدمة غير محددة"} · {fRelative(r.created_at)}</div></div>
                  <StatusBadge map={REQUEST_STATUS} value={r.status} size="sm" />
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <SectionTitle action={<Link href="/admin/assignments" className="text-sm text-slate-600 hover:underline">لوحة التوزيع</Link>}>رحلات بدون مقدم رعاية</SectionTitle>
          {(unassigned ?? []).length === 0 ? <Card><EmptyState compact icon={<ClipboardList size={22} />} title="كل الرحلات النشطة موزّعة" /></Card> : (
            <ul className="overflow-hidden rounded-[20px] border border-clay-200 bg-surface">
              {(unassigned ?? []).map((u) => {
                const ep = u.episode as unknown as { id: string; title: string; patient: { id: string; full_name: string } };
                return (
                  <li key={u.id} className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3.5 last:border-0">
                    <div><div className="font-medium text-ink">{ep.patient.full_name}</div><div className="text-xs text-text-2">{ep.title} · منذ {fRelative(u.created_at)}</div></div>
                    <Link href="/admin/assignments" className="rounded-full bg-slate-600 px-3 py-1 text-xs font-medium text-ivory hover:bg-ink">تعيين</Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-[16px] bg-sand-50 px-4 py-3 text-xs text-text-2 ring-1 ring-sand-200"><Activity size={14} /> المؤشرات تشغيلية ولا تُستخدم لتقييم الأداء المهني دون سياسة مستقلة.</div>
        </section>
      </div>
    </div>
  );
}
