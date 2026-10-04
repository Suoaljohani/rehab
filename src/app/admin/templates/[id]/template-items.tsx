"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { addTemplateExercise, removeTemplateExercise, updateTemplateExercise } from "@/lib/actions/admin";
import { WEEKDAYS_SHORT } from "@/lib/format";
import { cn } from "@/lib/cn";

type Item = { id: string; exercise_id: string; name: string; reps: number | null; sets: number | null; hold_sec: number | null; duration_sec: number | null; days_of_week: number[] };

export function TemplateItems({ templateId, items, library }: { templateId: string; items: Item[]; library: { id: string; name: string }[] }) {
  const [pick, setPick] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { const r = await fn(); if (!r.ok) toast({ tone: "danger", title: "تعذّر الحفظ", body: r.error }); router.refresh(); });
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select aria-label="اختيار تمرين" value={pick} onChange={(e) => setPick(e.target.value)} className="h-10"><option value="">اختر تمرينًا معتمدًا…</option>{library.filter((l) => !items.some((i) => i.exercise_id === l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Button disabled={!pick} loading={pending} icon={<Plus size={16} />} onClick={() => { run(() => addTemplateExercise(templateId, pick)); setPick(""); }}>إضافة</Button>
      </div>
      <ul className="space-y-2">{items.map((it) => (
        <li key={it.id} className="rounded-[16px] border border-line/80 bg-surface p-4">
          <div className="flex items-center justify-between gap-3"><span className="font-medium text-ink">{it.name}</span><button onClick={() => run(() => removeTemplateExercise(it.id, templateId))} className="text-danger-fg" aria-label="إزالة"><Trash2 size={16} /></button></div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {([["reps", "تكرار"], ["sets", "مجموعات"], ["hold_sec", "ثبات ث"], ["duration_sec", "مدة ث"]] as const).map(([k, l]) => (
              <label key={k} className="text-xs text-text-2">{l}<input type="number" min={0} defaultValue={it[k] ?? ""} onBlur={(e) => run(() => updateTemplateExercise(it.id, templateId, { [k]: num(e.target.value) }))} className="mt-1 h-9 w-full rounded-[10px] border border-line px-2 text-center text-sm text-ink" /></label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">{WEEKDAYS_SHORT.map((d, i) => {
            const on = it.days_of_week.includes(i);
            return <button key={d} onClick={() => run(() => updateTemplateExercise(it.id, templateId, { days_of_week: on ? it.days_of_week.filter((x) => x !== i) : [...it.days_of_week, i].sort() }))} aria-pressed={on} className={cn("rounded-[8px] py-1.5 text-[0.6875rem]", on ? "bg-sage-600 text-white" : "bg-surface text-text-2 ring-1 ring-line")}>{d}</button>;
          })}</div>
        </li>
      ))}</ul>
    </div>
  );
}
