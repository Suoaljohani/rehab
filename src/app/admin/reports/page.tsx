import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart, HBarList, LineChart } from "@/components/ui/charts";
import { LinkTabs } from "@/components/ui/tabs";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { APPOINTMENT_STATUS, FEELING_LABEL } from "@/lib/status";
import { fDate } from "@/lib/format";

export const metadata: Metadata = { title: "التقارير" };

export default async function Reports({ searchParams }: { searchParams: Promise<{ tab?: string; days?: string }> }) {
  await requireRole(["supervisor", "admin", "super_admin"]);
  const { tab = "operations", days = "28" } = await searchParams;
  const d = Math.min(180, Math.max(7, Number(days) || 28));
  const since = new Date(Date.now() - d * 864e5).toISOString();
  const supabase = await createClient();
  const tabs = [["operations", "التشغيل"], ["engagement", "التفاعل"], ["outcomes", "النتائج السريرية"], ["providers", "مقدمو الرعاية"]].map(([k, l]) => ({ href: `/admin/reports?tab=${k}&days=${d}`, label: l, active: tab === k }));
  const ranges = [7, 28, 90].map((n) => ({ href: `/admin/reports?tab=${tab}&days=${n}`, label: `${n} يومًا`, active: d === n }));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="التقارير والتحليلات" description="بيانات تشغيلية وإحصائية للقسم — لا تُقدّم تشخيصًا ولا تقييمًا مهنيًا دون سياسة مستقلة."
        actions={<a href={`/admin/reports/export?days=${d}`} className={buttonClasses("quiet")}><Download size={17} /> تصدير CSV</a>} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><LinkTabs items={tabs} /><LinkTabs variant="pill" items={ranges} /></div>
      {tab === "operations" && <Operations since={since} />}
      {tab === "engagement" && <Engagement days={d} />}
      {tab === "outcomes" && <Outcomes since={since} />}
      {tab === "providers" && <Providers />}
    </div>
  );
}

async function Operations({ since }: { since: string }) {
  const supabase = await createClient();
  const [{ data: k }, { data: eps }, { data: appts }, { data: reqs }] = await Promise.all([
    supabase.rpc("admin_kpis"),
    supabase.from("episodes").select("status, specialty_code, created_at, specialty:specialties(name)"),
    supabase.from("appointments").select("status").gte("starts_at", since),
    supabase.from("appointment_requests").select("status, created_at").gte("created_at", since),
  ]);
  const K = (k ?? {}) as Record<string, number>;
  const bySpec = new Map<string, number>();
  (eps ?? []).filter((e) => e.status === "active").forEach((e) => { const n = (e.specialty as unknown as { name: string }).name; bySpec.set(n, (bySpec.get(n) ?? 0) + 1); });
  const apptBy = new Map<string, number>();
  (appts ?? []).forEach((a) => apptBy.set(a.status, (apptBy.get(a.status) ?? 0) + 1));
  const total = (appts ?? []).length;
  const noShow = apptBy.get("no_show") ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="مراجعون نشطون" value={K.active_patients ?? 0} tone="ink" />
        <Stat label="رحلات جديدة (٣٠ يومًا)" value={K.new_episodes_30d ?? 0} />
        <Stat label="رحلات مكتملة (٣٠ يومًا)" value={K.completed_episodes_30d ?? 0} tone="sage" />
        <Stat label="معدل عدم الحضور" value={`${total ? Math.round((noShow / total) * 100) : 0}٪`} tone={noShow ? "attention" : "default"} hint={`${noShow} من ${total} موعد`} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader title="الرحلات النشطة حسب التخصص" /><HBarList title="الرحلات حسب التخصص" tone="slate" data={[...bySpec.entries()].map(([l, v]) => ({ label: l, value: v }))} /></Card>
        <Card><CardHeader title="المواعيد حسب الحالة" description="خلال الفترة المحددة" /><HBarList title="المواعيد حسب الحالة" data={[...apptBy.entries()].sort((a, b) => b[1] - a[1]).map(([s, v]) => ({ label: APPOINTMENT_STATUS[s]?.label ?? s, value: v }))} /></Card>
        <Card><CardHeader title="طلبات المواعيد" description={`${(reqs ?? []).length} طلب خلال الفترة`} /><HBarList title="الطلبات" tone="clay" data={Object.entries((reqs ?? []).reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {})).map(([s, v]) => ({ label: ({ new: "جديد", under_review: "قيد المراجعة", need_information: "بحاجة لمعلومات", accepted: "مقبول", scheduled: "تمت الجدولة", rejected: "مرفوض", closed: "مغلق" } as Record<string, string>)[s] ?? s, value: v }))} /></Card>
        <Card><CardHeader title="البرامج المنزلية" /><div className="grid grid-cols-2 gap-4"><Stat label="نشطة" value={K.active_programs ?? 0} tone="sage" /><Stat label="التزام ٧ أيام" value={`${K.adherence_7d ?? "—"}٪`} /></div></Card>
      </div>
    </div>
  );
}

async function Engagement({ days }: { days: number }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("engagement_report", { p_days: days });
  const E = (data ?? {}) as { weekly: { week: string; eligible: number; completed: number }[]; sessions_assigned: number; sessions_completed: number; exercises_assigned: number; exercises_completed: number; inactive_patients: number; issues: number; feelings: Record<string, number> };
  const rate = E.exercises_assigned ? Math.round((E.exercises_completed / E.exercises_assigned) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="جلسات منزلية مكلّفة" value={E.sessions_assigned ?? 0} />
        <Stat label="جلسات منزلية مكتملة" value={E.sessions_completed ?? 0} tone="sage" hint={`${E.sessions_assigned ? Math.round((E.sessions_completed / E.sessions_assigned) * 100) : 0}٪`} />
        <Stat label="إكمال التمارين" value={`${rate}٪`} hint={`${E.exercises_completed} من ${E.exercises_assigned}`} />
        <Stat label="مراجعون غير نشطين" value={E.inactive_patients ?? 0} tone={E.inactive_patients ? "attention" : "default"} hint={`${E.issues} بلاغ تمرين`} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card><CardHeader title="الالتزام الأسبوعي" /><BarChart title="الالتزام الأسبوعي" unit="٪" max={100} data={(E.weekly ?? []).map((w) => ({ label: fDate(w.week, "short"), value: w.eligible ? Math.round((w.completed / w.eligible) * 100) : null, hint: `${w.completed} من ${w.eligible}` }))} /></Card>
        <Card><CardHeader title="شعور المراجعين بعد الجلسة" description="Patient-reported" /><HBarList title="الشعور" tone="sage" data={Object.entries(E.feelings ?? {}).map(([k, v]) => ({ label: FEELING_LABEL[k], value: v }))} /></Card>
      </div>
    </div>
  );
}

async function Outcomes({ since }: { since: string }) {
  const supabase = await createClient();
  const [{ data: comps }, { data: goals }] = await Promise.all([
    supabase.from("exercise_completions").select("pain_score, completed_at, difficulty").gte("completed_at", since).not("pain_score", "is", null).order("completed_at"),
    supabase.from("goals").select("status"),
  ]);
  const weeks = new Map<string, number[]>();
  (comps ?? []).forEach((c) => { const d = new Date(c.completed_at); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); const k = d.toISOString().slice(0, 10); weeks.set(k, [...(weeks.get(k) ?? []), c.pain_score!]); });
  const diff = (comps ?? []).reduce<Record<string, number>>((m, c) => (c.difficulty ? { ...m, [c.difficulty]: (m[c.difficulty] ?? 0) + 1 } : m), {});
  const G = (goals ?? []).reduce<Record<string, number>>((m, g) => ({ ...m, [g.status]: (m[g.status] ?? 0) + 1 }), {});
  return (
    <div className="space-y-6">
      <Notice tone="neutral">يعرض هذا القسم البيانات المسجّلة فقط ولا يقدّم تشخيصًا أو توصيات علاجية.</Notice>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader title="متوسط الألم المُبلّغ أسبوعيًا" /><LineChart title="الألم" max={10} tone="clay" data={[...weeks.entries()].sort().map(([k, v]) => ({ label: fDate(k, "short"), value: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 }))} /></Card>
        <Card><CardHeader title="الصعوبة المُبلّغة" /><HBarList title="الصعوبة" data={Object.entries(diff).map(([k, v]) => ({ label: ({ very_easy: "سهل جدًا", easy: "سهل", appropriate: "مناسب", difficult: "صعب", very_difficult: "صعب جدًا" } as Record<string, string>)[k], value: v }))} /></Card>
        <Card><CardHeader title="تقدم الأهداف" /><div className="grid grid-cols-3 gap-4"><Stat label="نشطة" value={G.active ?? 0} /><Stat label="تحققت" value={G.achieved ?? 0} tone="sage" /><Stat label="لم تتحقق" value={G.not_achieved ?? 0} /></div></Card>
      </div>
    </div>
  );
}

async function Providers() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("provider_caseload");
  const rows = (data ?? []) as { full_name: string; active_episodes: number; primary_episodes: number; capacity: number; title: string | null }[];
  return (
    <div className="space-y-6">
      <Notice tone="warning">المؤشرات المبسطة هنا لتنظيم عبء العمل فقط، ولا تُستخدم لتقييم الأداء المهني دون سياسة مستقلة معتمدة.</Notice>
      <Card><CardHeader title="عبء الحالات" description="الرحلات النشطة لكل مقدم رعاية (رئيسي + فريق)" /><HBarList title="عبء الحالات" tone="slate" max={Math.max(1, ...rows.map((r) => r.capacity))} data={rows.map((r) => ({ label: r.full_name, value: r.active_episodes, hint: `رئيسي ${r.primary_episodes} · السعة ${r.capacity}` }))} /></Card>
    </div>
  );
}
