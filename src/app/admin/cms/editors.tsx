"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/errors";
import { saveCmsBlock, saveFaq, saveService } from "@/lib/actions/admin";

type Json = Record<string, unknown>;

function useSaver() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast({ tone: "danger", title: "تعذّر الحفظ", body: r.error });
      else { toast({ tone: "success", title: r.message ?? "تم الحفظ" }); after?.(); router.refresh(); }
    });
  return { pending, run };
}

function SaveBar({ pending, dirty, onSave, children }: { pending: boolean; dirty: boolean; onSave: () => void; children?: ReactNode }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
      <span className="text-xs text-text-2">{dirty ? "تغييرات غير منشورة" : "مطابق للنسخة المنشورة"}{children}</span>
      <Button size="sm" icon={<Save size={15} />} loading={pending} disabled={!dirty} onClick={onSave}>نشر التحديث</Button>
    </div>
  );
}

/** Flat object block (hero, contact): one field per key. */
export function ObjectBlockEditor({ blockKey, initial, fields }: { blockKey: string; initial: Json; fields: { key: string; label: string; multiline?: boolean; hint?: string; dir?: "ltr" }[] }) {
  const [v, setV] = useState<Json>(initial ?? {});
  const [base, setBase] = useState(JSON.stringify(initial ?? {}));
  const { pending, run } = useSaver();
  const dirty = JSON.stringify(v) !== base;
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`${blockKey}-${f.key}`} hint={f.hint} className={f.multiline ? "sm:col-span-2" : undefined}>
            {f.multiline
              ? <Textarea id={`${blockKey}-${f.key}`} rows={3} value={(v[f.key] as string) ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
              : <Input id={`${blockKey}-${f.key}`} dir={f.dir} value={(v[f.key] as string) ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value || null })} />}
          </Field>
        ))}
      </div>
      <SaveBar pending={pending} dirty={dirty} onSave={() => run(() => saveCmsBlock(blockKey, v), () => setBase(JSON.stringify(v)))} />
    </div>
  );
}

/** List of rows inside a block (hours rows, guide sections). */
export function RowsBlockEditor({ blockKey, listKey, initial, cols, addLabel }: { blockKey: string; listKey: string; initial: Json; cols: { key: string; label: string; multiline?: boolean }[]; addLabel: string }) {
  const startRows = ((initial?.[listKey] as Json[]) ?? []).map((r) => ({ ...r }));
  const [rows, setRows] = useState<Json[]>(startRows);
  const [base, setBase] = useState(JSON.stringify(startRows));
  const { pending, run } = useSaver();
  const dirty = JSON.stringify(rows) !== base;
  const set = (i: number, k: string, val: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
  return (
    <div>
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-3 rounded-[16px] bg-surface-soft p-4 ring-1 ring-line-soft">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface font-display text-sm text-slate-700 ring-1 ring-line">{i + 1}</span>
            <div className={cols.some((c) => c.multiline) ? "grid flex-1 gap-3" : "grid flex-1 gap-3 sm:grid-cols-2"}>
              {cols.map((c) => (
                <Field key={c.key} label={c.label} htmlFor={`${blockKey}-${i}-${c.key}`}>
                  {c.multiline
                    ? <Textarea id={`${blockKey}-${i}-${c.key}`} rows={2} value={(r[c.key] as string) ?? ""} onChange={(e) => set(i, c.key, e.target.value)} />
                    : <Input id={`${blockKey}-${i}-${c.key}`} value={(r[c.key] as string) ?? ""} onChange={(e) => set(i, c.key, e.target.value)} />}
                </Field>
              ))}
            </div>
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center self-start rounded-full text-text-2 hover:bg-danger-bg hover:text-danger-fg" aria-label="إزالة"><Trash2 size={16} /></button>
          </li>
        ))}
      </ol>
      <Button variant="ghost" size="sm" className="mt-3" icon={<Plus size={15} />} onClick={() => setRows([...rows, Object.fromEntries(cols.map((c) => [c.key, ""]))])}>{addLabel}</Button>
      <SaveBar pending={pending} dirty={dirty} onSave={() => run(() => saveCmsBlock(blockKey, { ...initial, [listKey]: rows.filter((r) => cols.some((c) => String(r[c.key] ?? "").trim())) }), () => setBase(JSON.stringify(rows)))} />
    </div>
  );
}

export function BannerEditor({ initial }: { initial: { enabled?: boolean; text?: string } }) {
  const [v, setV] = useState({ enabled: !!initial?.enabled, text: initial?.text ?? "" });
  const [base, setBase] = useState(JSON.stringify(v));
  const { pending, run } = useSaver();
  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-[14px] ring-1 ring-line">
        <div className="bg-surface-soft px-3 py-1.5 text-[11px] text-text-3">معاينة</div>
        {v.enabled && v.text ? <div className="bg-sage-700 px-4 py-2 text-center text-sm text-white">{v.text}</div> : <div className="px-4 py-2 text-center text-sm text-text-3">الشريط مخفي</div>}
      </div>
      <Field label="نص الشريط" htmlFor="bn-text" hint="جملة واحدة قصيرة — مثل تغيير ساعات العمل في الأعياد."><Input id="bn-text" maxLength={160} value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} /></Field>
      <Checkbox className="mt-4" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} label="إظهار الشريط أعلى الموقع العام" />
      <SaveBar pending={pending} dirty={JSON.stringify(v) !== base} onSave={() => run(() => saveCmsBlock("announcement_banner", v), () => setBase(JSON.stringify(v)))} />
    </div>
  );
}

type Svc = { id: string; slug: string; name: string; summary: string; description: string | null; conditions: string[]; access_steps: string[]; instructions: string[]; sort: number; is_published: boolean };

export function ServiceEditor({ service }: { service: Svc }) {
  const pick = (s: Svc) => ({ name: s.name, summary: s.summary, description: s.description ?? "", conditions: s.conditions.join("\n"), access_steps: s.access_steps.join("\n"), instructions: s.instructions.join("\n"), sort: s.sort, is_published: s.is_published });
  const [v, setV] = useState(pick(service));
  const [base, setBase] = useState(JSON.stringify(v));
  const { pending, run } = useSaver();
  const lines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);
  const id = service.id.slice(0, 6);
  return (
    <details className="group rounded-[18px] bg-surface ring-1 ring-line open:shadow-[var(--shadow-sm)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <div className="font-semibold text-ink">{v.name}</div>
          <div className="mt-0.5 font-mono text-xs text-text-3" dir="ltr">/services/{service.slug}</div>
        </div>
        <Badge size="sm" tone={v.is_published ? "success" : "muted"} dot>{v.is_published ? "منشورة" : "مخفية"}</Badge>
      </summary>
      <div className="border-t border-line-soft px-5 pb-5 pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="اسم الخدمة" htmlFor={`sn-${id}`}><Input id={`sn-${id}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="الترتيب" htmlFor={`so-${id}`}><Input id={`so-${id}`} type="number" min={0} value={v.sort} onChange={(e) => setV({ ...v, sort: Number(e.target.value) })} /></Field>
          <Field label="الملخص" htmlFor={`ss-${id}`} className="sm:col-span-2"><Textarea id={`ss-${id}`} rows={2} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} /></Field>
          <Field label="الوصف" htmlFor={`sd-${id}`} className="sm:col-span-2"><Textarea id={`sd-${id}`} rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="الحالات التي نعالجها" hint="سطر لكل حالة" htmlFor={`sc-${id}`}><Textarea id={`sc-${id}`} rows={5} value={v.conditions} onChange={(e) => setV({ ...v, conditions: e.target.value })} /></Field>
          <Field label="خطوات الوصول" hint="سطر لكل خطوة" htmlFor={`sa-${id}`}><Textarea id={`sa-${id}`} rows={5} value={v.access_steps} onChange={(e) => setV({ ...v, access_steps: e.target.value })} /></Field>
          <Field label="تعليمات قبل الزيارة" hint="سطر لكل تعليمة" htmlFor={`si-${id}`}><Textarea id={`si-${id}`} rows={5} value={v.instructions} onChange={(e) => setV({ ...v, instructions: e.target.value })} /></Field>
        </div>
        <Checkbox className="mt-4" checked={v.is_published} onChange={(e) => setV({ ...v, is_published: e.target.checked })} label="منشورة على الموقع العام" description="إخفاء الخدمة لا يحذفها ويمكن إعادتها في أي وقت." />
        <SaveBar pending={pending} dirty={JSON.stringify(v) !== base} onSave={() => run(() => saveService(service.id, { name: v.name, summary: v.summary, description: v.description || null, conditions: lines(v.conditions), access_steps: lines(v.access_steps), instructions: lines(v.instructions), sort: v.sort, is_published: v.is_published }), () => setBase(JSON.stringify(v)))} />
      </div>
    </details>
  );
}

type Faq = { id?: string; question: string; answer: string; sort: number; is_published: boolean };

export function FaqEditor({ faq, isNew }: { faq: Faq; isNew?: boolean }) {
  const [v, setV] = useState<Faq>(faq);
  const [base, setBase] = useState(JSON.stringify(faq));
  const { pending, run } = useSaver();
  const key = faq.id?.slice(0, 6) ?? "new";
  const dirty = JSON.stringify(v) !== base;
  return (
    <div className={isNew ? "rounded-[18px] border border-dashed border-slate-300 bg-surface-soft p-5" : "rounded-[18px] bg-surface p-5 ring-1 ring-line"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_6rem]">
        <Field label={isNew ? "سؤال جديد" : "السؤال"} htmlFor={`fq-${key}`}><Input id={`fq-${key}`} value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} /></Field>
        <Field label="الترتيب" htmlFor={`fs-${key}`}><Input id={`fs-${key}`} type="number" min={0} value={v.sort} onChange={(e) => setV({ ...v, sort: Number(e.target.value) })} /></Field>
        <Field label="الإجابة" htmlFor={`fa-${key}`} className="sm:col-span-2"><Textarea id={`fa-${key}`} rows={3} value={v.answer} onChange={(e) => setV({ ...v, answer: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {isNew ? <span className="text-xs text-text-2">يُنشر مباشرة بعد الإضافة.</span> : (
          <Button variant="quiet" size="sm" icon={v.is_published ? <EyeOff size={15} /> : <Eye size={15} />} loading={pending}
            onClick={() => run(() => saveFaq({ id: faq.id, question: v.question, answer: v.answer, sort: v.sort, is_published: !v.is_published }), () => { const n = { ...v, is_published: !v.is_published }; setV(n); setBase(JSON.stringify(n)); })}>
            {v.is_published ? "إخفاء من الموقع" : "إعادة النشر"}
          </Button>
        )}
        <div className="flex items-center gap-2">
          {!isNew && !v.is_published && <Badge size="sm" tone="muted">مخفي</Badge>}
          <Button size="sm" icon={isNew ? <Plus size={15} /> : <Save size={15} />} loading={pending} disabled={!dirty || !v.question.trim() || !v.answer.trim()}
            onClick={() => run(() => saveFaq({ id: faq.id, question: v.question.trim(), answer: v.answer.trim(), sort: v.sort, is_published: v.is_published }), () => { if (isNew) setV(faq); else setBase(JSON.stringify(v)); })}>
            {isNew ? "إضافة" : "حفظ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
