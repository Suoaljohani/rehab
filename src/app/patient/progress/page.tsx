import type { Metadata } from "next";
import { Flame, Target, TrendingDown, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { BarChart, LineChart } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/states";
import { fDate } from "@/lib/format";

export const metadata: Metadata = { title: "تقدمي" };

export default async function ProgressPage() {
  const viewer = await requireRole(["patient"], "patient");
  const pid = viewer.patientId!;
  const supabase = await createClient();
  const since = new Date(Date.now() - 28 * 864e5).toISOString();
  const [{ data: week }, { data: daily }, { data: goals }, { count: sessions }, { data: comps }] = await Promise.all([
    supabase.rpc("adherence", {}),
    supabase.rpc("adherence_daily", { p_days: 14 }),
    supabase.from("goals").select("id, title, baseline, target, current_value, unit, higher_is_better, status, due_date, episode:episodes!inner(status, patient_id)").eq("episode.patient_id", pid).in("episode.status", ["active", "on_hold"]).neq("status", "cancelled").order("created_at"),
    supabase.from("home_sessions").select("id", { count: "exact", head: true }).eq("patient_id", pid).not("completed_at", "is", null),
    supabase.from("exercise_completions").select("pain_score, completed_at").eq("patient_id", pid).gte("completed_at", since).not("pain_score", "is", null).order("completed_at"),
  ]);
  const w = week as { rate: number | null; completed: number; eligible: number; session_rate: number | null } | null;
  const days = (daily ?? []) as { day: string; rate: number | null; eligible: number; completed: number }[];

  // streak of consecutive fully-completed days (ignores rest days)
  let streak = 0;
  for (let i = days.length - 2; i >= 0; i--) {
    const d = days[i];
    if (d.eligible === 0) continue;
    if (d.completed >= d.eligible) streak++;
    else break;
  }
  // daily average pain
  const painMap = new Map<string, number[]>();
  (comps ?? []).forEach((c) => {
    const k = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(c.completed_at));
    painMap.set(k, [...(painMap.get(k) ?? []), c.pain_score as number]);
  });
  const pain = [...painMap.entries()].map(([k, v]) => ({ label: fDate(k, "short"), value: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 }));
  const trend = pain.length > 3 ? pain[pain.length - 1].value! - pain[0].value! : 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[1.875rem] font-semibold text-ink">تقدمي</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.2fr_1fr]">
        <Card tone="sage" className="flex items-center gap-6 p-6">
          <ProgressRing value={w?.rate ?? 0} size={120} stroke={11} label={`الالتزام ${w?.rate ?? 0}٪`}>
            <div><div className="font-display text-3xl font-semibold text-ink tabular">{w?.rate ?? "—"}<span className="text-lg">{w?.rate != null ? "٪" : ""}</span></div></div>
          </ProgressRing>
          <div>
            <div className="text-sm text-sage-800">التزامك هذا الأسبوع</div>
            <div className="mt-1 font-display text-xl font-semibold text-ink">{w?.completed ?? 0} من {w?.eligible ?? 0} تمرين</div>
            <p className="mt-2 text-sm text-sage-800">{(w?.rate ?? 0) >= 80 ? "التزام رائع — هكذا يُبنى التعافي." : (w?.rate ?? 0) >= 50 ? "بداية جيدة، حاول ألا تفوّت أيام البرنامج." : "كل تمرين تنجزه خطوة للأمام."}</p>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5"><div className="text-xs text-text-2">الجلسات المنزلية</div><div className="mt-2 font-display text-3xl font-semibold text-ink tabular">{sessions ?? 0}</div><div className="mt-1 text-xs text-text-2">جلسة مكتملة</div></Card>
          <Card className="p-5"><div className="flex items-center gap-1.5 text-xs text-text-2"><Flame size={14} className="text-clay-500" /> أيام متتالية</div><div className="mt-2 font-display text-3xl font-semibold text-ink tabular">{streak}</div><div className="mt-1 text-xs text-text-2">برنامج مكتمل</div></Card>
        </div>
      </div>

      <Card>
        <CardHeader title="الالتزام اليومي" description="آخر ١٤ يومًا — أيام الراحة تظهر كخط رفيع." />
        <BarChart title="الالتزام اليومي" unit="٪" max={100} data={days.map((d) => ({ label: fDate(d.day, "short"), value: d.eligible === 0 ? null : d.rate, hint: d.eligible ? `${d.completed} من ${d.eligible}` : "راحة" }))} />
      </Card>

      <Card>
        <CardHeader title="أهدافي" description="الأهداف التي حددها فريق رعايتك." />
        {(goals ?? []).length === 0 ? <EmptyState compact title="لم تُحدد أهداف بعد" /> : (
          <ul className="space-y-5">
            {(goals ?? []).map((g) => {
              const base = Number(g.baseline ?? 0), target = Number(g.target ?? 0), cur = Number(g.current_value ?? base);
              const pct = target === base ? 100 : Math.round(((cur - base) / (target - base)) * 100);
              return (
                <li key={g.id}>
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2"><Target size={17} className="mt-0.5 text-sage-700" /><span className="font-medium text-ink">{g.title}</span></div>
                    {g.status === "achieved" ? <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-fg">تحقق ✓</span> : <span className="text-sm text-text-2 tabular">{cur} / {target} {g.unit}</span>}
                  </div>
                  <ProgressBar value={g.status === "achieved" ? 100 : pct} label={g.title} />
                  {g.due_date && g.status !== "achieved" && <div className="mt-1 text-xs text-text-3">الموعد المستهدف {fDate(g.due_date)}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {pain.length > 1 && (
        <Card>
          <CardHeader title="درجة الألم المسجّلة" description="متوسط ما سجّلته بعد التمارين (٠–١٠)." action={
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${trend <= 0 ? "bg-success-bg text-success-fg" : "bg-warning-bg text-warning-fg"}`}>
              {trend <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}{trend <= 0 ? "في تحسّن" : "في ارتفاع"}
            </span>} />
          <LineChart title="درجة الألم" max={10} data={pain} tone="clay" />
          <p className="mt-3 text-xs text-text-3">هذه البيانات لإطلاع فريقك ودعم المتابعة، ولا تُعد تشخيصًا.</p>
        </Card>
      )}
    </div>
  );
}
