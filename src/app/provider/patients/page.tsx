import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Search } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEngagement, getMyEpisodes } from "@/lib/provider-data";
import { PageHeader } from "@/components/ui/stat";
import { LinkTabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/ui/charts";
import { ProgressBar } from "@/components/ui/progress";
import { EPISODE_STATUS } from "@/lib/status";
import { fDate, fDateTime, fRelative, age } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "مراجعيّ" };

const FILTERS = [
  ["active", "نشطة"], ["new", "جديدة"], ["attention", "بحاجة لانتباه"], ["on_hold", "معلّقة"], ["completed", "مكتملة"], ["all", "الكل"],
] as const;

export default async function MyPatients({ searchParams }: { searchParams: Promise<{ f?: string; q?: string; scope?: string }> }) {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  const { f = "active", q = "", scope } = await searchParams;
  const supervisor = viewer.role !== "provider";
  const onlyMine = !supervisor || scope !== "all";
  const supabase = await createClient();
  const episodes = await getMyEpisodes(viewer.id, onlyMine);
  const ids = episodes.map((e) => e.id);
  const [eng, { data: flags }, { data: appts }] = await Promise.all([
    getEngagement(ids),
    ids.length ? supabase.from("attention_flags").select("episode_id, severity").eq("status", "open").in("episode_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("appointments").select("episode_id, starts_at").in("episode_id", ids).gte("starts_at", new Date().toISOString()).in("status", ["confirmed", "pending_confirmation"]).order("starts_at") : Promise.resolve({ data: [] }),
  ]);
  const flagMap = new Map<string, string[]>();
  (flags ?? []).forEach((fl) => flagMap.set(fl.episode_id, [...(flagMap.get(fl.episode_id) ?? []), fl.severity]));
  const nextAppt = new Map<string, string>();
  (appts ?? []).forEach((a) => { if (a.episode_id && !nextAppt.has(a.episode_id)) nextAppt.set(a.episode_id, a.starts_at); });

  const term = q.trim().toLowerCase();
  const isNew = (e: (typeof episodes)[number]) => e.status === "active" && Date.now() - new Date(e.created_at).getTime() < 7 * 864e5;
  const counts: Record<string, number> = { all: episodes.length };
  episodes.forEach((e) => {
    counts[e.status === "discharged" ? "completed" : e.status] = (counts[e.status === "discharged" ? "completed" : e.status] ?? 0) + 1;
    if (isNew(e)) counts.new = (counts.new ?? 0) + 1;
    if (flagMap.has(e.id)) counts.attention = (counts.attention ?? 0) + 1;
  });
  const list = episodes.filter((e) => {
    const p = e.patient as unknown as { full_name: string; mrn: string; access_id: string };
    if (term && !(p.full_name.toLowerCase().includes(term) || p.mrn.toLowerCase().includes(term) || p.access_id.toLowerCase().includes(term))) return false;
    if (f === "all") return true;
    if (f === "new") return isNew(e);
    if (f === "attention") return flagMap.has(e.id);
    if (f === "completed") return e.status === "completed" || e.status === "discharged";
    return e.status === f;
  });
  const qs = (nf: string) => `/provider/patients?f=${nf}${q ? `&q=${encodeURIComponent(q)}` : ""}${scope ? `&scope=${scope}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="مراجعيّ" description={onlyMine ? "المراجعون المرتبطون بك ضمن فريق الرعاية فقط." : "جميع مراجعي القسم (صلاحية المشرف)."}
        actions={supervisor ? <LinkTabs variant="pill" items={[{ href: "/provider/patients", label: "مراجعيّ", active: onlyMine }, { href: "/provider/patients?scope=all", label: "كل القسم", active: !onlyMine }]} /> : null} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <LinkTabs variant="pill" items={FILTERS.map(([k, l]) => ({ href: qs(k), label: l, active: f === k, count: counts[k] ?? 0 }))} />
        <form className="relative w-full max-w-xs">
          {scope && <input type="hidden" name="scope" value={scope} />}<input type="hidden" name="f" value={f} />
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input name="q" defaultValue={q} placeholder="الاسم أو رقم الملف أو رقم الدخول" aria-label="بحث في المراجعين" className="h-10 w-full rounded-full border border-line bg-surface ps-9 pe-4 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100" />
        </form>
      </div>
      {list.length === 0 ? (
        <Card><EmptyState title={term ? "لا توجد نتائج بحث" : "لا يوجد مراجعين في هذه القائمة"} description={term ? "جرّب كلمة أخرى." : "سيظهر المراجعون هنا عند إسنادهم إليك."} /></Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((e) => {
            const p = e.patient as unknown as { full_name: string; mrn: string; date_of_birth: string | null; sex: string | null };
            const en = eng.get(e.id);
            const fl = flagMap.get(e.id);
            const primary = (e.care_team as unknown as { role: string; ended_at: string | null; provider: { full_name: string } }[]).find((m) => m.role === "primary" && !m.ended_at);
            return (
              <li key={e.id}>
                <Link href={`/provider/patients/${e.id}`} className={cn("group block h-full rounded-[22px] border bg-surface p-5 shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]", fl ? "border-clay-200" : "border-line/80")}>
                  <div className="flex items-start gap-3">
                    <Avatar name={p.full_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-ink">{p.full_name}</span>
                        <StatusBadge map={EPISODE_STATUS} value={e.status} size="sm" />
                      </div>
                      <div className="text-xs text-text-2"><span dir="ltr">{p.mrn}</span>{age(p.date_of_birth) ? ` · ${age(p.date_of_birth)} سنة` : ""}</div>
                    </div>
                  </div>
                  <div className="mt-3 truncate text-sm text-text">{e.title}</div>
                  {fl && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-clay-50 px-2.5 py-1 text-xs font-medium text-clay-700"><AlertCircle size={13} /> {fl.length} {fl.length === 1 ? "تنبيه" : "تنبيهات"} مفتوحة</div>}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-3 text-xs">
                    <div><div className="text-text-3">الموعد القادم</div><div className="mt-0.5 text-text">{nextAppt.get(e.id) ? fDateTime(nextAppt.get(e.id)) : "—"}</div></div>
                    <div><div className="text-text-3">آخر نشاط</div><div className="mt-0.5 text-text">{en?.last ? fRelative(en.last) : "—"}</div></div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1"><div className="mb-1 flex justify-between text-xs"><span className="text-text-3">الالتزام (٧ أيام)</span><b className="text-ink tabular">{en?.rate != null ? `${en.rate}٪` : "—"}</b></div><ProgressBar value={en?.rate ?? 0} size="sm" label="الالتزام" /></div>
                    {en && en.spark.length > 2 && <Sparkline values={en.spark} width={64} height={24} />}
                  </div>
                  {!onlyMine && primary && <div className="mt-3 text-xs text-text-2">المسؤول: {primary.provider.full_name}</div>}
                  {!primary && e.status === "active" && <div className="mt-3 text-xs text-clay-600">بدون مقدم رعاية رئيسي</div>}
                  <div className="sr-only">بدأت {fDate(e.start_date)}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
