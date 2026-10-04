import Link from "next/link";
import { Search } from "lucide-react";
import { ExerciseArt } from "./exercise-art";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { EXERCISE_STATUS } from "@/lib/status";
import { DIFFICULTY_LEVEL, REGION_LABEL } from "@/lib/format";
import { cn } from "@/lib/cn";

export type LibCard = { id: string; code: string; status: string; name: string; name_en: string | null; region: string | null; difficulty: string | null; specialty: string | null; equipment: string[]; hasVideo: boolean; pending?: string | null };

export function LibraryFilters({ base, q, region, specialty, difficulty, status, specialties, statuses }: { base: string; q?: string; region?: string; specialty?: string; difficulty?: string; status?: string; specialties: { code: string; name: string }[]; statuses?: string[] }) {
  const sel = "h-10 rounded-[12px] border border-line bg-surface px-3 text-sm outline-none focus:border-slate-300";
  return (
    <form action={base} className="mb-6 flex flex-wrap items-center gap-2 rounded-[20px] border border-line/80 bg-surface p-3">
      <div className="relative min-w-56 flex-1">
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-3" />
        <input name="q" defaultValue={q} placeholder="ابحث بالاسم العربي أو الإنجليزي" aria-label="بحث" className="h-10 w-full rounded-[12px] border border-line bg-page/40 ps-9 pe-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100" />
      </div>
      <select name="region" defaultValue={region ?? ""} aria-label="منطقة الجسم" className={sel}><option value="">كل المناطق</option>{Object.entries(REGION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select name="specialty" defaultValue={specialty ?? ""} aria-label="التخصص" className={sel}><option value="">كل التخصصات</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
      <select name="difficulty" defaultValue={difficulty ?? ""} aria-label="المستوى" className={sel}><option value="">كل المستويات</option>{Object.entries(DIFFICULTY_LEVEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      {statuses && <select name="status" defaultValue={status ?? ""} aria-label="الحالة" className={sel}><option value="">كل الحالات</option>{statuses.map((s) => <option key={s} value={s}>{EXERCISE_STATUS[s]?.label}</option>)}</select>}
      <button className="h-10 rounded-[12px] bg-slate-600 px-4 text-sm font-medium text-ivory hover:bg-ink">تصفية</button>
    </form>
  );
}

export function LibraryGrid({ items, hrefBase, showStatus }: { items: LibCard[]; hrefBase: string; showStatus?: boolean }) {
  if (items.length === 0) return <div className="rounded-[24px] border border-line bg-surface"><EmptyState title="لا توجد نتائج" description="جرّب تغيير الفلاتر أو كلمة البحث." /></div>;
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {items.map((e) => (
        <li key={e.id}>
          <Link href={`${hrefBase}/${e.id}`} className="group block overflow-hidden rounded-[22px] border border-line/80 bg-surface shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
            <div className="relative">
              <ExerciseArt region={e.region} className="aspect-[16/10]" animated={false} label={e.name} />
              <span className="absolute start-3 top-3 rounded-full bg-surface/90 px-2.5 py-0.5 text-[0.6875rem] font-medium text-text-2 backdrop-blur" dir="ltr">{e.code}</span>
              {e.hasVideo && <span className="absolute end-3 top-3 rounded-full bg-ink/80 px-2 py-0.5 text-[0.625rem] text-ivory">فيديو</span>}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2"><div className="font-semibold text-ink">{e.name}</div>{showStatus && <StatusBadge map={EXERCISE_STATUS} value={e.status} size="sm" />}</div>
              {e.name_en && <div className="text-xs text-text-3" dir="ltr">{e.name_en}</div>}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[0.6875rem]">
                <span className="rounded-full bg-sand-50 px-2 py-0.5 text-text-2 ring-1 ring-sand-200">{REGION_LABEL[e.region ?? ""] ?? "—"}</span>
                {e.difficulty && <span className={cn("rounded-full px-2 py-0.5 ring-1", e.difficulty === "advanced" ? "bg-clay-50 text-clay-700 ring-clay-100" : "bg-sage-50 text-sage-700 ring-sage-200")}>{DIFFICULTY_LEVEL[e.difficulty]}</span>}
                {e.equipment.length === 0 ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-700 ring-1 ring-slate-100">بدون أدوات</span> : <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-700 ring-1 ring-slate-100">{e.equipment[0]}</span>}
              </div>
              {e.pending && <div className="mt-2 text-xs text-info-fg">{e.pending}</div>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
