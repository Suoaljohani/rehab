"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowRight, ArrowUp, Check, CircleAlert, Clock, Eye, Plus, Rocket, Search, SlidersHorizontal, Trash2, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/overlay";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { StepDots } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import { ExerciseArt } from "@/components/exercise/exercise-art";
import { useToast } from "@/components/ui/toast";
import {
  addProgramExercise, discardDraft, publishProgram, removeProgramExercise, reorderProgramExercises, updateProgramMeta, updatePrescription, type PrescriptionPatch,
} from "@/lib/actions/provider";
import { DIFFICULTY_LEVEL, REGION_LABEL, WEEKDAYS_SHORT, daysLabel, prescription, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";

export type LibEx = {
  id: string; versionId: string; version: number; name: string; name_en: string | null; region: string | null; specialty: string | null; category: string | null; type: string | null;
  difficulty: string | null; equipment: string[]; position: string | null; est: number; reps: number | null; sets: number | null; hold: number | null; dur: number | null; tags: string[];
};
export type Line = {
  id: string; exercise_id: string; exercise_version_id: string; order_index: number; reps: number | null; sets: number | null; hold_sec: number | null; duration_sec: number | null;
  schedule_type: string; days_of_week: number[]; specific_dates: string[]; interval_days: number | null; start_date: string | null; end_date: string | null;
  instructions: string | null; is_required: boolean; request_feedback: boolean;
};
type Props = {
  program: { id: string; title: string; status: string; start_date: string; end_date: string; instructions: string | null; episode_id: string };
  version: { id: string; version: number; instructions: string | null };
  isRevision: boolean;
  patientName: string;
  lines: Line[];
  library: LibEx[];
  specialties: { code: string; name: string }[];
};

export function ProgramBuilder({ program, version, isRevision, patientName, lines: initialLines, library, specialties }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [lines, setLines] = useState<Line[]>(() => [...initialLines].sort((a, b) => a.order_index - b.order_index));
  const [selected, setSelected] = useState<string | null>(initialLines[0]?.id ?? null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [meta, setMeta] = useState({ title: program.title, start: program.start_date, end: program.end_date, instructions: version.instructions ?? program.instructions ?? "" });
  const [preview, setPreview] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"library" | "workspace" | "prescription">("workspace");
  const [pending, start] = useTransition();
  const byId = useMemo(() => new Map(library.map((l) => [l.id, l])), [library]);
  const exOf = (l: Line) => byId.get(l.exercise_id);

  // ----- autosave -----
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function patchLine(id: string, patch: PrescriptionPatch) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } as Line : l)));
    setSaving("saving");
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const r = await updatePrescription(id, patch);
      if (!r.ok) { toast({ tone: "danger", title: "لم يُحفظ التعديل", body: r.error }); setSaving("idle"); }
      else setSaving("saved");
    }, 450);
  }
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function patchMeta(next: Partial<typeof meta>) {
    const m = { ...meta, ...next };
    setMeta(m);
    setSaving("saving");
    if (metaTimer.current) clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(async () => {
      const r = await updateProgramMeta(program.id, version.id, isRevision ? { instructions: m.instructions || null } : { title: m.title, start_date: m.start, end_date: m.end, instructions: m.instructions || null });
      if (!r.ok) toast({ tone: "danger", title: "لم يُحفظ", body: r.error });
      setSaving(r.ok ? "saved" : "idle");
    }, 600);
  }

  function add(exId: string) {
    start(async () => {
      const r = await addProgramExercise(version.id, exId);
      if (!r.ok) return toast({ tone: "danger", title: "تعذّرت الإضافة", body: r.error });
      const ex = byId.get(exId)!;
      const line: Line = {
        id: r.data!, exercise_id: exId, exercise_version_id: ex.versionId, order_index: lines.length + 1, reps: ex.reps, sets: ex.sets, hold_sec: ex.hold, duration_sec: ex.dur,
        schedule_type: "weekly", days_of_week: [0, 1, 2, 3, 4, 5, 6], specific_dates: [], interval_days: null, start_date: null, end_date: null, instructions: null, is_required: true, request_feedback: true,
      };
      setLines((ls) => [...ls, line]);
      setSelected(line.id);
      setSaving("saved");
      setMobilePane("prescription");
    });
  }
  function remove(id: string) {
    start(async () => {
      const r = await removeProgramExercise(id);
      if (!r.ok) return toast({ tone: "danger", title: "تعذّر الحذف", body: r.error });
      setLines((ls) => ls.filter((l) => l.id !== id));
      if (selected === id) setSelected(null);
    });
  }
  function move(id: string, dir: -1 | 1) {
    const i = lines.findIndex((l) => l.id === id);
    const j = i + dir;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    setLines(next);
    reorderProgramExercises(next.map((l) => l.id));
  }

  // ----- validation (mirrors publish_program_version) -----
  const problems = useMemo(() => {
    const out: string[] = [];
    if (lines.length === 0) out.push("أضف تمرينًا واحدًا على الأقل.");
    lines.forEach((l) => {
      const n = exOf(l)?.name ?? "تمرين";
      if (l.schedule_type === "weekly" && l.days_of_week.length === 0) out.push(`${n}: لم تُحدَّد أيام التنفيذ.`);
      if (l.schedule_type === "dates" && l.specific_dates.length === 0) out.push(`${n}: لم تُحدَّد تواريخ.`);
      if (l.schedule_type === "interval" && !l.interval_days) out.push(`${n}: حدّد الفاصل بالأيام.`);
      if (!l.reps && !l.duration_sec && !l.hold_sec) out.push(`${n}: حدّد التكرارات أو المدة.`);
    });
    if (meta.end < meta.start) out.push("تاريخ النهاية قبل تاريخ البداية.");
    return out;
  }, [lines, meta]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalMin = Math.max(1, Math.round(lines.reduce((s, l) => s + (exOf(l)?.est ?? 120), 0) / 60));
  const sel = lines.find((l) => l.id === selected) ?? null;

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* ---------- header ---------- */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/provider/patients/${program.episode_id}?tab=program`} className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> ملف {patientName}</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {isRevision ? <h1 className="font-display text-[1.75rem] font-semibold text-ink">{program.title}</h1> : (
              <input aria-label="عنوان البرنامج" value={meta.title} onChange={(e) => patchMeta({ title: e.target.value })} className="min-w-[16rem] rounded-[10px] bg-transparent font-display text-[1.75rem] font-semibold text-ink outline-none hover:bg-surface focus:bg-surface focus:ring-2 focus:ring-slate-100" />
            )}
            <Badge tone="muted" dot>{isRevision ? `مسودة النسخة ${version.version}` : "مسودة — لم يُنشر بعد"}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-2">
            <span>{lines.length} تمارين · ~{totalMin} دقيقة يوميًا</span>
            <span className="inline-flex items-center gap-1" aria-live="polite">{saving === "saving" ? <><Clock size={13} /> جارٍ الحفظ…</> : saving === "saved" ? <><Check size={13} className="text-success" /> حُفظت المسودة</> : "المسودة محفوظة تلقائيًا"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isRevision && <Button variant="ghost" icon={<Undo2 size={16} />} onClick={() => start(async () => { const r = await discardDraft(version.id, program.id); if (r.ok) router.push(`/provider/patients/${program.episode_id}?tab=program`); else toast({ tone: "danger", title: "تعذّر", body: r.error }); })}>تجاهل التعديلات</Button>}
          <Button variant="secondary" icon={<Eye size={17} />} onClick={() => setPreview(true)}>معاينة كمراجع</Button>
          <Button icon={<Rocket size={17} />} onClick={() => setPublishOpen(true)}>نشر للمراجع</Button>
        </div>
      </div>

      {!isRevision && (
        <div className="mb-5 grid gap-3 rounded-[20px] border border-line/80 bg-surface p-4 sm:grid-cols-[auto_auto_1fr]">
          <Field label="البداية" htmlFor="ms"><Input id="ms" type="date" value={meta.start} onChange={(e) => patchMeta({ start: e.target.value })} /></Field>
          <Field label="النهاية" htmlFor="me"><Input id="me" type="date" value={meta.end} onChange={(e) => patchMeta({ end: e.target.value })} /></Field>
          <Field label="تعليمات عامة للمراجع" htmlFor="mi"><Input id="mi" value={meta.instructions} onChange={(e) => patchMeta({ instructions: e.target.value })} placeholder="تظهر في بداية كل جلسة" /></Field>
        </div>
      )}
      {isRevision && (
        <div className="mb-5 rounded-[20px] border border-line/80 bg-surface p-4">
          <Field label="تعليمات عامة للمراجع" htmlFor="mi2"><Input id="mi2" value={meta.instructions} onChange={(e) => patchMeta({ instructions: e.target.value })} /></Field>
        </div>
      )}

      {/* mobile pane switcher */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-[14px] border border-line bg-surface-soft/60 p-1 xl:hidden">
        {([["library", "المكتبة"], ["workspace", `البرنامج (${lines.length})`], ["prescription", "الوصفة"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMobilePane(k)} className={cn("rounded-[10px] py-2 text-sm", mobilePane === k ? "bg-surface font-semibold text-ink shadow-[var(--shadow-xs)]" : "text-text-2")}>{l}</button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_1fr_380px]">
        <div className={cn(mobilePane !== "library" && "hidden xl:block")}>
          <LibraryPanel library={library} specialties={specialties} added={new Set(lines.map((l) => l.exercise_id))} onAdd={add} pending={pending} />
        </div>

        {/* ---------- workspace ---------- */}
        <section className={cn("min-w-0", mobilePane !== "workspace" && "hidden xl:block")} aria-label="التمارين المختارة">
          <div className="rounded-[24px] border border-line/80 bg-surface-soft/50 p-3">
            <div className="flex items-center justify-between px-2 pb-3 pt-1"><h2 className="font-semibold text-ink">تمارين البرنامج</h2><span className="text-xs text-text-2">رتّب التمارين حسب تسلسل التنفيذ</span></div>
            {lines.length === 0 ? (
              <div className="rounded-[18px] border-2 border-dashed border-line bg-surface"><EmptyState compact title="ابدأ بإضافة تمارين من المكتبة" description="اختر التمارين المناسبة ثم حدّد الوصفة والأيام لكل تمرين." /></div>
            ) : (
              <ol className="space-y-2">
                {lines.map((l, i) => {
                  const ex = exOf(l);
                  const active = l.id === selected;
                  return (
                    <li key={l.id}>
                      <div role="button" tabIndex={0} onClick={() => { setSelected(l.id); setMobilePane("prescription"); }} onKeyDown={(e) => e.key === "Enter" && setSelected(l.id)}
                        className={cn("group flex cursor-pointer items-center gap-3 rounded-[18px] border bg-surface p-3 transition", active ? "border-slate-500 shadow-[0_0_0_3px_var(--color-slate-100)]" : "border-line/80 hover:border-sand-300")}>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sand-100 text-xs font-semibold text-text-2 tabular">{i + 1}</span>
                        <ExerciseArt region={ex?.region} className="size-12 shrink-0 rounded-[12px]" animated={false} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-ink">{ex?.name}</div>
                          <div className="truncate text-xs text-text-2">{prescription(l).join(" · ") || <span className="text-clay-600">لم تُحدد الوصفة</span>}</div>
                          <div className="truncate text-xs text-text-3">{l.schedule_type === "daily" ? "يوميًا" : l.schedule_type === "dates" ? `${l.specific_dates.length} تواريخ محددة` : l.schedule_type === "interval" ? `كل ${l.interval_days ?? "?"} أيام` : daysLabel(l.days_of_week)}{!l.is_required && " · اختياري"}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); move(l.id, -1); }} disabled={i === 0} className="grid size-8 place-items-center rounded-full hover:bg-sand-100 disabled:opacity-30" aria-label="تحريك لأعلى"><ArrowUp size={15} /></button>
                          <button onClick={(e) => { e.stopPropagation(); move(l.id, 1); }} disabled={i === lines.length - 1} className="grid size-8 place-items-center rounded-full hover:bg-sand-100 disabled:opacity-30" aria-label="تحريك لأسفل"><ArrowDown size={15} /></button>
                          <button onClick={(e) => { e.stopPropagation(); remove(l.id); }} className="grid size-8 place-items-center rounded-full text-danger-fg hover:bg-danger-bg" aria-label="إزالة"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          {problems.length > 0 && lines.length > 0 && (
            <Notice tone="warning" className="mt-4" icon={<CircleAlert size={18} />} title="قبل النشر">
              <ul className="list-disc ps-4">{problems.slice(0, 5).map((p) => <li key={p}>{p}</li>)}</ul>
            </Notice>
          )}
        </section>

        {/* ---------- prescription panel ---------- */}
        <aside className={cn(mobilePane !== "prescription" && "hidden xl:block")} aria-label="إعدادات الوصفة">
          <div className="sticky top-20 rounded-[24px] border border-line/80 bg-surface p-5 shadow-[var(--shadow-sm)]">
            {!sel ? <EmptyState compact icon={<SlidersHorizontal size={22} />} title="اختر تمرينًا" description="لتحديد التكرارات والأيام والتعليمات." /> : (
              <PrescriptionPanel key={sel.id} line={sel} ex={exOf(sel)} onPatch={(p) => patchLine(sel.id, p)} programStart={meta.start} programEnd={meta.end} />
            )}
          </div>
        </aside>
      </div>

      <PreviewDialog open={preview} onClose={() => setPreview(false)} title={meta.title} lines={lines} exOf={exOf} totalMin={totalMin} instructions={meta.instructions} />
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} problems={problems} isRevision={isRevision} versionId={version.id} versionNo={version.version} episodeId={program.episode_id} start={meta.start} patientName={patientName} />
    </div>
  );
}

function LibraryPanel({ library, specialties, added, onAdd, pending }: { library: LibEx[]; specialties: { code: string; name: string }[]; added: Set<string>; onAdd: (id: string) => void; pending: boolean }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState({ region: "", specialty: "", type: "", difficulty: "", equipment: "", position: "" });
  const [showFilters, setShowFilters] = useState(false);
  const opts = (k: keyof LibEx) => [...new Set(library.flatMap((l) => (Array.isArray(l[k]) ? (l[k] as string[]) : [l[k] as string])).filter(Boolean))].sort();
  const list = library.filter((l) => {
    const t = q.trim().toLowerCase();
    if (t && !(l.name.includes(t) || (l.name_en ?? "").toLowerCase().includes(t) || l.tags.some((x) => x.includes(t)))) return false;
    if (f.region && l.region !== f.region) return false;
    if (f.specialty && l.specialty !== f.specialty) return false;
    if (f.type && l.category !== f.type) return false;
    if (f.difficulty && l.difficulty !== f.difficulty) return false;
    if (f.equipment && !(f.equipment === "none" ? l.equipment.length === 0 : l.equipment.includes(f.equipment))) return false;
    if (f.position && l.position !== f.position) return false;
    return true;
  });
  const active = Object.values(f).filter(Boolean).length;
  return (
    <section className="flex max-h-[calc(100dvh-7rem)] flex-col rounded-[24px] border border-line/80 bg-surface shadow-[var(--shadow-sm)] xl:sticky xl:top-20" aria-label="مكتبة التمارين">
      <div className="border-b border-line-soft p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-ink">مكتبة التمارين</h2><Badge tone="success" size="sm">المعتمدة فقط</Badge></div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الكلمات المفتاحية" aria-label="بحث في المكتبة" className="h-10 w-full rounded-[12px] border border-line bg-page/50 ps-9 pe-3 text-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100" />
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600"><SlidersHorizontal size={14} /> الفلاتر {active > 0 && <span className="rounded-full bg-slate-600 px-1.5 text-xs text-ivory">{active}</span>}</button>
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Select aria-label="منطقة الجسم" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} className="h-9 text-sm"><option value="">منطقة الجسم</option>{opts("region").map((o) => <option key={o} value={o}>{REGION_LABEL[o] ?? o}</option>)}</Select>
            <Select aria-label="التخصص" value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} className="h-9 text-sm"><option value="">التخصص</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select>
            <Select aria-label="النوع" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="h-9 text-sm"><option value="">النوع</option>{opts("category").map((o) => <option key={o}>{o}</option>)}</Select>
            <Select aria-label="المستوى" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })} className="h-9 text-sm"><option value="">المستوى</option>{opts("difficulty").map((o) => <option key={o} value={o}>{DIFFICULTY_LEVEL[o] ?? o}</option>)}</Select>
            <Select aria-label="الأدوات" value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} className="h-9 text-sm"><option value="">الأدوات</option><option value="none">بدون أدوات</option>{opts("equipment").map((o) => <option key={o}>{o}</option>)}</Select>
            <Select aria-label="الوضعية" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} className="h-9 text-sm"><option value="">الوضعية</option>{opts("position").map((o) => <option key={o}>{o}</option>)}</Select>
            {active > 0 && <button onClick={() => setF({ region: "", specialty: "", type: "", difficulty: "", equipment: "", position: "" })} className="col-span-2 text-start text-xs text-text-2 hover:text-ink">مسح الفلاتر</button>}
          </div>
        )}
      </div>
      <ul className="scrollbar-calm flex-1 space-y-1 overflow-y-auto p-2">
        {list.length === 0 && <li><EmptyState compact title="لا توجد نتائج" /></li>}
        {list.map((l) => {
          const isAdded = added.has(l.id);
          return (
            <li key={l.id} className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-page">
              <ExerciseArt region={l.region} className="size-11 shrink-0 rounded-[10px]" animated={false} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-ink">{l.name}</div><div className="truncate text-xs text-text-2">{REGION_LABEL[l.region ?? ""] ?? l.region} · {DIFFICULTY_LEVEL[l.difficulty ?? ""] ?? ""}</div></div>
              <button onClick={() => onAdd(l.id)} disabled={isAdded || pending} aria-label={isAdded ? "مضاف" : `إضافة ${l.name}`}
                className={cn("grid size-8 shrink-0 place-items-center rounded-full transition", isAdded ? "bg-sage-100 text-sage-700" : "bg-slate-600 text-ivory hover:bg-ink disabled:opacity-50")}>
                {isAdded ? <Check size={15} /> : <Plus size={15} />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NumField({ label, value, onChange, suffix }: { label: string; value: number | null; onChange: (v: number | null) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-2">{label}</span>
      <div className="flex items-center rounded-[12px] border border-line bg-surface focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-100">
        <button type="button" onClick={() => onChange(Math.max(0, (value ?? 0) - 1) || null)} className="h-10 w-9 text-lg text-text-2 hover:text-ink" aria-label={`إنقاص ${label}`}>−</button>
        <input inputMode="numeric" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value.replace(/\D/g, ""))))} className="h-10 w-full min-w-0 bg-transparent text-center font-semibold text-ink outline-none tabular" aria-label={label} />
        <button type="button" onClick={() => onChange((value ?? 0) + 1)} className="h-10 w-9 text-lg text-text-2 hover:text-ink" aria-label={`زيادة ${label}`}>+</button>
      </div>
      {suffix && <span className="mt-0.5 block text-[0.6875rem] text-text-3">{suffix}</span>}
    </label>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div><div className="text-sm font-medium text-ink">{label}</div>{desc && <div className="text-xs text-text-2">{desc}</div>}</div>
      <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-sage-600" : "bg-disabled")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all", checked ? "start-[22px]" : "start-0.5")} />
      </button>
    </div>
  );
}

function PrescriptionPanel({ line, ex, onPatch, programStart, programEnd }: { line: Line; ex?: LibEx; onPatch: (p: PrescriptionPatch) => void; programStart: string; programEnd: string }) {
  const [newDate, setNewDate] = useState("");
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ExerciseArt region={ex?.region} className="size-14 shrink-0 rounded-[14px]" animated={false} />
        <div className="min-w-0"><div className="truncate font-semibold text-ink">{ex?.name}</div><div className="text-xs text-text-2">نسخة التمرين {ex?.version} · {REGION_LABEL[ex?.region ?? ""] ?? ""}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="التكرارات" value={line.reps} onChange={(v) => onPatch({ reps: v })} />
        <NumField label="المجموعات" value={line.sets} onChange={(v) => onPatch({ sets: v })} />
        <NumField label="الثبات (ث)" value={line.hold_sec} onChange={(v) => onPatch({ hold_sec: v })} />
        <NumField label="المدة (ث)" value={line.duration_sec} onChange={(v) => onPatch({ duration_sec: v })} />
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-text-2">الجدولة</legend>
        <div className="grid grid-cols-4 gap-1 rounded-[12px] bg-surface-soft/70 p-1">
          {([["weekly", "أيام"], ["daily", "يوميًا"], ["dates", "تواريخ"], ["interval", "تكرار"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => onPatch({ schedule_type: k })} aria-pressed={line.schedule_type === k}
              className={cn("rounded-[9px] py-1.5 text-xs", line.schedule_type === k ? "bg-surface font-semibold text-ink shadow-[var(--shadow-xs)]" : "text-text-2")}>{l}</button>
          ))}
        </div>
        {line.schedule_type === "weekly" && (
          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEKDAYS_SHORT.map((d, i) => {
              const on = line.days_of_week.includes(i);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => onPatch({ days_of_week: on ? line.days_of_week.filter((x) => x !== i) : [...line.days_of_week, i].sort() })}
                  className={cn("rounded-[10px] py-2 text-[0.6875rem] font-medium transition", on ? "bg-sage-600 text-white" : "bg-surface text-text-2 ring-1 ring-line hover:ring-sand-300")}>{d}</button>
              );
            })}
          </div>
        )}
        {line.schedule_type === "dates" && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2"><Input type="date" value={newDate} min={programStart} max={programEnd} onChange={(e) => setNewDate(e.target.value)} className="h-9" aria-label="إضافة تاريخ" />
              <Button size="sm" variant="secondary" disabled={!newDate} onClick={() => { if (!line.specific_dates.includes(newDate)) onPatch({ specific_dates: [...line.specific_dates, newDate].sort() }); setNewDate(""); }}>إضافة</Button></div>
            <div className="flex flex-wrap gap-1.5">{line.specific_dates.map((d) => <button key={d} onClick={() => onPatch({ specific_dates: line.specific_dates.filter((x) => x !== d) })} className="rounded-full bg-sage-50 px-2.5 py-1 text-xs text-sage-800 ring-1 ring-sage-200" dir="ltr">{d} ×</button>)}</div>
          </div>
        )}
        {line.schedule_type === "interval" && <div className="mt-3 w-40"><NumField label="كل (أيام)" value={line.interval_days} onChange={(v) => onPatch({ interval_days: v ? Math.min(30, v) : null })} /></div>}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="من (اختياري)" htmlFor="ls"><Input id="ls" type="date" value={line.start_date ?? ""} min={programStart} max={programEnd} onChange={(e) => onPatch({ start_date: e.target.value || null })} className="h-9 text-sm" /></Field>
        <Field label="إلى (اختياري)" htmlFor="le"><Input id="le" type="date" value={line.end_date ?? ""} min={programStart} max={programEnd} onChange={(e) => onPatch({ end_date: e.target.value || null })} className="h-9 text-sm" /></Field>
      </div>
      <Field label="تعليمات مقدم الرعاية" htmlFor="li"><Textarea id="li" rows={3} defaultValue={line.instructions ?? ""} onChange={(e) => onPatch({ instructions: e.target.value || null })} placeholder="مثال: ارفع الساق ببطء وحافظ على الركبة مستقيمة." /></Field>
      <div className="divide-y divide-line-soft border-t border-line-soft pt-2">
        <Toggle label="تمرين إلزامي" desc="الاختياري لا يدخل في التزام الجلسة" checked={line.is_required} onChange={(v) => onPatch({ is_required: v })} />
        <Toggle label="طلب تقييم الألم والصعوبة" checked={line.request_feedback} onChange={(v) => onPatch({ request_feedback: v })} />
      </div>
    </div>
  );
}

function PreviewDialog({ open, onClose, title, lines, exOf, totalMin, instructions }: { open: boolean; onClose: () => void; title: string; lines: Line[]; exOf: (l: Line) => LibEx | undefined; totalMin: number; instructions: string }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [open]);
  const today = new Date().getDay();
  const todays = lines.filter((l) => l.schedule_type === "daily" || (l.schedule_type === "weekly" && l.days_of_week.includes(today)) || l.schedule_type !== "weekly");
  const cur = todays[i];
  return (
    <Dialog open={open} onClose={onClose} title="معاينة كمراجع" description="هكذا سيظهر البرنامج للمراجع على جواله." size="lg">
      <div className="grid gap-6 md:grid-cols-2">
        <Phone>
          <div className="text-[0.6875rem] text-text-2">اليوم</div>
          <div className="surface-ink mt-2 rounded-[22px] p-4 text-ivory">
            <div className="text-[0.6875rem] text-ivory/65">{title}</div>
            <div className="mt-1 font-display text-lg font-semibold">لديك {todays.length} تمارين اليوم</div>
            <div className="text-[0.6875rem] text-ivory/65">المدة المتوقعة {totalMin} دقيقة</div>
            <div className="mt-3"><StepDots total={Math.max(1, todays.length)} current={0} tone="light" /></div>
            <div className="mt-3 rounded-[12px] bg-ivory py-2 text-center text-xs font-medium text-ink">ابدأ تمارين اليوم</div>
          </div>
          {instructions && <div className="mt-3 rounded-[14px] bg-sage-50 p-2.5 text-[0.6875rem] text-sage-800 ring-1 ring-sage-200">{instructions}</div>}
          <ul className="mt-3 space-y-1.5">{todays.map((l) => <li key={l.id} className="flex items-center gap-2 rounded-[12px] border border-line bg-surface p-2"><ExerciseArt region={exOf(l)?.region} className="size-8 rounded-[8px]" animated={false} /><div className="min-w-0"><div className="truncate text-[0.75rem] font-medium text-ink">{exOf(l)?.name}</div><div className="text-[0.625rem] text-text-2">{prescription(l).join(" · ")}</div></div></li>)}</ul>
        </Phone>
        <Phone>
          {cur ? (
            <>
              <StepDots total={todays.length} current={i} />
              <ExerciseArt region={exOf(cur)?.region} className="mt-3 aspect-[4/3] rounded-[18px]" />
              <div className="mt-3 font-display text-lg font-semibold text-ink">{exOf(cur)?.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">{prescription(cur).map((p) => <span key={p} className="rounded-full bg-slate-50 px-2 py-0.5 text-[0.625rem] text-slate-700">{p}</span>)}</div>
              {cur.instructions && <div className="mt-2 rounded-[12px] bg-sage-50 p-2 text-[0.6875rem] text-sage-800">{cur.instructions}</div>}
              <div className="mt-3 grid grid-cols-2 gap-1.5"><div className="rounded-[12px] bg-sage-600 py-2.5 text-center text-xs font-medium text-white">تم التمرين</div><div className="rounded-[12px] bg-clay-100 py-2.5 text-center text-xs text-clay-700">واجهت مشكلة</div></div>
              <div className="mt-2 flex justify-between text-[0.6875rem]"><button disabled={i === 0} onClick={() => setI(i - 1)} className="text-slate-600 disabled:opacity-30">السابق</button><button disabled={i >= todays.length - 1} onClick={() => setI(i + 1)} className="text-slate-600 disabled:opacity-30">التالي</button></div>
            </>
          ) : <EmptyState compact title="لا توجد تمارين اليوم" />}
        </Phone>
      </div>
      <p className="mt-4 text-center text-xs text-text-3">المعاينة تعكس جدول اليوم ({WEEKDAYS_SHORT[today]}) حسب الأيام المحددة.</p>
    </Dialog>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[36px] border-[8px] border-ink bg-page p-3.5 shadow-[var(--shadow-md)]"><div className="mx-auto mb-3 h-4 w-20 rounded-full bg-ink" />{children}</div>;
}

function PublishDialog({ open, onClose, problems, isRevision, versionId, versionNo, episodeId, start, patientName }: { open: boolean; onClose: () => void; problems: string[]; isRevision: boolean; versionId: string; versionNo: number; episodeId: string; start: string; patientName: string }) {
  const [eff, setEff] = useState(isRevision ? todayISO() : start);
  const [summary, setSummary] = useState("");
  const [pending, run] = useTransition();
  const toast = useToast();
  const router = useRouter();
  function publish() {
    run(async () => {
      const r = await publishProgram(versionId, eff, summary || null, episodeId);
      if (!r.ok) return toast({ tone: "danger", title: "لم يُنشر البرنامج", body: r.error });
      toast({ tone: "success", title: `تم نشر النسخة ${r.data?.version}`, body: `أُنشئ ${r.data?.items} موعد تمرين، وأُرسل إشعار للمراجع.` });
      router.push(`/provider/patients/${episodeId}?tab=program`);
    });
  }
  return (
    <Dialog open={open} onClose={onClose} title={`نشر النسخة ${versionNo} إلى ${patientName}`}
      description="عند النشر: يتم التحقق من البرنامج، حفظ نسخة، تحديث الحالة، إنشاء الجدول، تسجيل الحدث في سجل التدقيق، وإشعار المراجع."
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={publish} loading={pending} disabled={problems.length > 0} icon={<Rocket size={16} />}>نشر الآن</Button></>}>
      <div className="space-y-4">
        {problems.length > 0 ? (
          <Notice tone="warning" title="يجب معالجة ما يلي أولًا"><ul className="list-disc ps-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>
        ) : <Notice tone="sage" icon={<Check size={18} />}>البرنامج جاهز للنشر.</Notice>}
        <Field label="تاريخ السريان" htmlFor="eff" hint={isRevision ? "التغيير يطبق من هذا التاريخ؛ لا يتغير سجل النشاط السابق." : "لن تظهر تمارين قبل هذا التاريخ."}>
          <Input id="eff" type="date" value={eff} min={todayISO()} onChange={(e) => setEff(e.target.value)} />
        </Field>
        <Field label="ملخص التغيير" htmlFor="sum" hint="يظهر في سجل النسخ والخط الزمني."><Textarea id="sum" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={isRevision ? "مثال: زيادة التكرارات وإضافة تمرين الجسر" : "النسخة الأولى"} /></Field>
      </div>
    </Dialog>
  );
}
