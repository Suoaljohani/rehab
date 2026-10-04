"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, FilePlus2, Pause, Pencil, Play, Plus, Send, Square, X } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import {
  acknowledgeIssue, addOutcome, createProgram, duplicateProgram, reviseProgram, saveGoal, saveNote, setEpisodeStatus, setProgramStatus, startStaffThread,
} from "@/lib/actions/provider";
import type { ActionResult } from "@/lib/errors";
import { todayISO, addDays } from "@/lib/format";

function useCloseOnOk(state: ActionResult | null, close: () => void) {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast({ tone: "success", title: state.message ?? "تم الحفظ" });
      close();
      router.refresh();
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------------- Session / internal notes ---------------- */
export type NoteValues = { id?: string; note_date?: string; session_type?: string | null; pain_score?: number | null; patient_report?: string | null; functional_observation?: string | null; interventions?: string | null; progress?: string | null; plan?: string | null; internal_note?: string | null };

type TriggerProps = { label: string; variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };
function Trigger({ t, onClick }: { t: TriggerProps; onClick: () => void }) {
  return <Button variant={t.variant ?? "primary"} size={t.size ?? "sm"} icon={t.icon} onClick={onClick}>{t.label}</Button>;
}

export function NoteDialog({ episodeId, kind, initial, ...t }: { episodeId: string; kind: "session" | "internal"; initial?: NoteValues } & TriggerProps) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveNote, null);
  useCloseOnOk(state, () => setOpen(false));
  const v = initial ?? {};
  return (
    <>
      <Trigger t={t} onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={() => setOpen(false)} size="lg" title={kind === "internal" ? (v.id ? "تعديل ملاحظة داخلية" : "ملاحظة داخلية جديدة") : v.id ? "تعديل ملاحظة الجلسة" : "تسجيل جلسة"}
        description={kind === "internal" ? "غير مرئية للمراجع." : v.id ? "سيُحفظ الإصدار السابق في سجل المراجعات." : "Quick Clinical Note — تُربط باسمك وبتاريخ التسجيل."}>
        <form action={action} id={`note-${kind}`} className="space-y-4">
          <input type="hidden" name="episode_id" value={episodeId} />
          <input type="hidden" name="kind" value={kind} />
          {v.id && <input type="hidden" name="id" value={v.id} />}
          {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
          {kind === "internal" ? (
            <>
              <Notice tone="internal" title="ملاحظة داخلية — غير مرئية للمراجع" />
              <Field label="التاريخ" htmlFor="nd"><Input id="nd" type="date" name="note_date" defaultValue={v.note_date ?? todayISO()} /></Field>
              <Field label="الملاحظة" htmlFor="in"><Textarea id="in" name="internal_note" rows={5} defaultValue={v.internal_note ?? ""} required /></Field>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="التاريخ" htmlFor="nd"><Input id="nd" type="date" name="note_date" defaultValue={v.note_date ?? todayISO()} /></Field>
                <Field label="نوع الجلسة" htmlFor="st">
                  <Select id="st" name="session_type" defaultValue={v.session_type ?? "جلسة علاجية"}>
                    {["تقييم أولي", "جلسة علاجية", "إعادة تقييم", "جلسة خروج", "متابعة عن بعد"].map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="الألم (٠–١٠)" htmlFor="ps"><Input id="ps" type="number" min={0} max={10} name="pain_score" defaultValue={v.pain_score ?? ""} /></Field>
              </div>
              <Field label="ما ذكره المراجع" htmlFor="pr"><Textarea id="pr" name="patient_report" rows={2} defaultValue={v.patient_report ?? ""} /></Field>
              <Field label="الملاحظة الوظيفية" htmlFor="fo"><Textarea id="fo" name="functional_observation" rows={2} defaultValue={v.functional_observation ?? ""} /></Field>
              <Field label="التدخلات" htmlFor="iv"><Textarea id="iv" name="interventions" rows={2} defaultValue={v.interventions ?? ""} /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="التقدم" htmlFor="pg"><Textarea id="pg" name="progress" rows={2} defaultValue={v.progress ?? ""} /></Field>
                <Field label="الخطة" htmlFor="pl"><Textarea id="pl" name="plan" rows={2} defaultValue={v.plan ?? ""} /></Field>
              </div>
              <Field label="ملاحظة داخلية (اختياري — غير مرئية للمراجع)" htmlFor="in2"><Textarea id="in2" name="internal_note" rows={2} defaultValue={v.internal_note ?? ""} className="bg-clay-50/40" /></Field>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><SubmitButton>حفظ</SubmitButton></div>
        </form>
      </Dialog>
    </>
  );
}

/* ---------------- Goals ---------------- */
export type GoalValues = { id?: string; title?: string; baseline?: number | null; target?: number | null; current_value?: number | null; unit?: string | null; due_date?: string | null; status?: string };

export function GoalDialog({ episodeId, initial, ...t }: { episodeId: string; initial?: GoalValues } & TriggerProps) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveGoal, null);
  useCloseOnOk(state, () => setOpen(false));
  const v = initial ?? {};
  return (
    <>
      <Trigger t={t} onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={() => setOpen(false)} title={v.id ? "تحديث الهدف" : "هدف جديد"}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="episode_id" value={episodeId} />
          {v.id && <input type="hidden" name="id" value={v.id} />}
          {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
          <Field label="عنوان الهدف" htmlFor="gt"><Input id="gt" name="title" defaultValue={v.title ?? ""} required /></Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="خط الأساس" htmlFor="gb"><Input id="gb" name="baseline" type="number" step="any" defaultValue={v.baseline ?? ""} /></Field>
            <Field label="المستهدف" htmlFor="gtg"><Input id="gtg" name="target" type="number" step="any" defaultValue={v.target ?? ""} /></Field>
            <Field label="الحالي" htmlFor="gc"><Input id="gc" name="current_value" type="number" step="any" defaultValue={v.current_value ?? ""} /></Field>
            <Field label="الوحدة" htmlFor="gu"><Input id="gu" name="unit" defaultValue={v.unit ?? ""} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الاستحقاق" htmlFor="gd"><Input id="gd" name="due_date" type="date" defaultValue={v.due_date ?? ""} /></Field>
            <Field label="الحالة" htmlFor="gs"><Select id="gs" name="status" defaultValue={v.status ?? "active"}><option value="active">نشط</option><option value="achieved">تحقق</option><option value="not_achieved">لم يتحقق</option><option value="cancelled">ملغى</option></Select></Field>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><SubmitButton>حفظ</SubmitButton></div>
        </form>
      </Dialog>
    </>
  );
}

export function OutcomeForm({ episodeId, measures }: { episodeId: string; measures: string[] }) {
  const [state, action] = useActionState(addOutcome, null);
  const [k, setK] = useState(0);
  useCloseOnOk(state, () => setK((x) => x + 1));
  return (
    <form key={k} action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_0.8fr_0.7fr_auto] sm:items-end">
      <input type="hidden" name="episode_id" value={episodeId} />
      <Field label="المقياس" htmlFor="om"><Input id="om" name="measure" list="measures" placeholder="مثال: درجة الألم" required /><datalist id="measures">{measures.map((m) => <option key={m} value={m} />)}</datalist></Field>
      <Field label="القيمة" htmlFor="ov"><Input id="ov" name="value" type="number" step="any" required /></Field>
      <Field label="الوحدة" htmlFor="ou"><Input id="ou" name="unit" placeholder="/10" /></Field>
      <SubmitButton icon={<Plus size={16} />}>تسجيل</SubmitButton>
      {state && !state.ok && <p className="text-sm text-danger-fg sm:col-span-4">{state.error}</p>}
    </form>
  );
}

/* ---------------- Episode status ---------------- */
export function EpisodeStatusControl({ episodeId, status }: { episodeId: string; status: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const options: [string, string][] = status === "active" ? [["on_hold", "تعليق مؤقت"], ["completed", "إكمال الرحلة"], ["discharged", "خروج"]] : status === "on_hold" ? [["active", "إعادة التفعيل"], ["completed", "إكمال الرحلة"]] : [["active", "إعادة فتح"]];
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {options.map(([s, l]) => <Button key={s} variant={s === "active" ? "secondary" : "quiet"} size="sm" onClick={() => { setReason(""); setOpen(s); }}>{l}</Button>)}
      </div>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={options.find((o) => o[0] === open)?.[1] ?? ""}
        description={open === "completed" || open === "discharged" ? "ستُغلق البرامج المنزلية النشطة وتُلغى التمارين المستقبلية. يبقى السجل محفوظًا للقراءة." : open === "on_hold" ? "تُوقف البرامج النشطة مؤقتًا ولا تُحتسب الفترة في الالتزام." : undefined}
        footer={<><Button variant="ghost" onClick={() => setOpen(null)}>تراجع</Button><Button loading={pending} onClick={() => start(async () => {
          const r = await setEpisodeStatus(episodeId, open!, reason);
          if (!r.ok) return toast({ tone: "danger", title: "تعذّر التحديث", body: r.error });
          toast({ tone: "success", title: "تم تحديث حالة الرحلة" });
          setOpen(null); router.refresh();
        })}>تأكيد</Button></>}>
        <Field label="السبب / ملاحظة" htmlFor="er"><Textarea id="er" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></Field>
      </Dialog>
    </>
  );
}

/* ---------------- Programs ---------------- */
export function NewProgramDialog({ episodeId, templates, disabled }: { episodeId: string; templates: { id: string; name: string; duration_weeks: number }[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createProgram, null);
  const [tpl, setTpl] = useState("");
  const weeks = templates.find((t) => t.id === tpl)?.duration_weeks ?? 4;
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled} icon={<FilePlus2 size={17} />}>إنشاء برنامج جديد</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="برنامج منزلي جديد" description="يُنشأ كمسودة ولا يظهر للمراجع قبل النشر.">
        <form action={action} className="space-y-4">
          <input type="hidden" name="episode_id" value={episodeId} />
          {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
          <Field label="البدء من قالب (اختياري)" htmlFor="tp" hint="ينشئ نسخة مستقلة يمكنك تخصيصها؛ تعديل القالب لاحقًا لا يغيّر هذا البرنامج.">
            <Select id="tp" name="template_id" value={tpl} onChange={(e) => setTpl(e.target.value)}>
              <option value="">برنامج فارغ</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="عنوان البرنامج" htmlFor="pt"><Input id="pt" name="title" required defaultValue={templates.find((t) => t.id === tpl)?.name ?? ""} key={tpl} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البداية" htmlFor="ps"><Input id="ps" name="start_date" type="date" defaultValue={todayISO()} required /></Field>
            <Field label="تاريخ النهاية" htmlFor="pe"><Input id="pe" name="end_date" type="date" defaultValue={addDays(todayISO(), weeks * 7)} key={weeks} required /></Field>
          </div>
          <Field label="تعليمات عامة للمراجع" htmlFor="pi"><Textarea id="pi" name="instructions" rows={3} placeholder="مثال: نفّذ التمارين بعد تناول الدواء بنصف ساعة…" /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><SubmitButton>إنشاء وفتح المنشئ</SubmitButton></div>
        </form>
      </Dialog>
    </>
  );
}

export function ProgramActions({ programId, status, episodeId, hasDraft }: { programId: string; status: string; episodeId: string; hasDraft: boolean }) {
  const [confirm, setConfirm] = useState<null | "paused" | "active" | "completed" | "cancelled">(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult | undefined | void>) => start(async () => {
    const r = await fn();
    if (r && !r.ok) toast({ tone: "danger", title: "تعذّر التنفيذ", body: r.error });
    else router.refresh();
  });
  const live = ["active", "scheduled", "paused"].includes(status);
  const labels = { paused: "إيقاف مؤقت", active: "استئناف", completed: "إنهاء البرنامج", cancelled: "إلغاء البرنامج" };
  return (
    <div className="flex flex-wrap gap-2">
      {(live || status === "draft") && <Button size="sm" icon={<Pencil size={15} />} loading={pending && !confirm} onClick={() => run(() => reviseProgram(programId))}>{hasDraft || status === "draft" ? "متابعة التعديل" : "تعديل"}</Button>}
      <Button size="sm" variant="quiet" icon={<Copy size={15} />} onClick={() => run(() => duplicateProgram(programId))}>نسخ</Button>
      {(status === "active" || status === "scheduled") && <Button size="sm" variant="quiet" icon={<Pause size={15} />} onClick={() => setConfirm("paused")}>إيقاف مؤقت</Button>}
      {status === "paused" && <Button size="sm" variant="secondary" icon={<Play size={15} />} onClick={() => setConfirm("active")}>استئناف</Button>}
      {live && <Button size="sm" variant="quiet" icon={<Square size={14} />} onClick={() => setConfirm("completed")}>إنهاء</Button>}
      {status === "draft" && <Button size="sm" variant="ghost" icon={<X size={15} />} onClick={() => setConfirm("cancelled")}>إلغاء المسودة</Button>}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm ? labels[confirm] : ""}
        description={confirm === "paused" ? "لن تُنشأ تمارين جديدة أثناء الإيقاف، ولا تُحتسب الفترة ضد الالتزام." : confirm === "completed" ? "تُلغى التمارين المستقبلية ويبقى التاريخ محفوظًا." : undefined}
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>تراجع</Button><Button loading={pending} onClick={() => start(async () => {
          const r = await setProgramStatus(programId, confirm!, reason, episodeId);
          if (!r.ok) return toast({ tone: "danger", title: "تعذّر التنفيذ", body: r.error });
          setConfirm(null); router.refresh();
        })}>تأكيد</Button></>}>
        <Field label="السبب (يظهر للمراجع في الخط الزمني)" htmlFor="pr"><Textarea id="pr" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Dialog>
    </div>
  );
}

export function IssueAction({ issueId, status, episodeId }: { issueId: string; status: string; episodeId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (status === "resolved") return <span className="text-xs text-success-fg">تمت المعالجة</span>;
  return (
    <Button size="sm" variant="quiet" loading={pending} onClick={() => start(async () => { await acknowledgeIssue(issueId, status === "open" ? "acknowledged" : "resolved", episodeId); router.refresh(); })}>
      {status === "open" ? "تم الاطلاع" : "تمت المعالجة"}
    </Button>
  );
}

/* ---------------- Messaging ---------------- */
export function StaffThreadDialog({ patientId, episodeId }: { patientId: string; episodeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(startStaffThread, null);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} icon={<Send size={15} />}>رسالة جديدة</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="رسالة إلى المراجع">
        <form action={action} className="space-y-4">
          <input type="hidden" name="patient_id" value={patientId} /><input type="hidden" name="episode_id" value={episodeId} />
          {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="الموضوع" htmlFor="ss"><Input id="ss" name="subject" required /></Field>
            <Field label="التصنيف" htmlFor="sc"><Select id="sc" name="category"><option value="general">عام</option><option value="exercise_question">تمرين</option><option value="appointment">موعد</option></Select></Field>
          </div>
          <Field label="الرسالة" htmlFor="sb"><Textarea id="sb" name="body" rows={5} required /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><SubmitButton icon={<Send size={16} />}>إرسال</SubmitButton></div>
        </form>
      </Dialog>
    </>
  );
}
