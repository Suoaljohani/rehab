"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, Clock, Info, Pause, Play, ShieldAlert, Timer, X } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { StepDots, ProgressRing } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/field";
import { EmergencyNotice, Notice } from "@/components/ui/notice";
import { ExerciseArt } from "@/components/exercise/exercise-art";
import { useToast } from "@/components/ui/toast";
import { completeExercise, finishSession, reportIssue, startSession, trackEvent } from "@/lib/actions/patient";
import { DIFFICULTY_LABEL, ISSUE_REASON } from "@/lib/status";
import { prescription } from "@/lib/format";
import { cn } from "@/lib/cn";

export type PlayerItem = {
  id: string;
  status: string;
  name: string;
  region: string | null;
  reps: number | null; sets: number | null; hold_sec: number | null; duration_sec: number | null;
  providerNote: string | null;
  steps: string[];
  safety: string | null;
  requestFeedback: boolean;
  videoUrl: string | null;
  posterUrl: string | null;
  estSec: number;
};

type Phase = "intro" | "exercise" | "finish" | "done";

export function SessionPlayer({ programId, programTitle, instructions, items: initial }: { programId: string; programTitle: string; instructions: string | null; items: PlayerItem[] }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const firstOpen = Math.max(0, items.findIndex((i) => i.status !== "completed"));
  const allDoneInitially = items.every((i) => i.status === "completed");
  const [phase, setPhase] = useState<Phase>(allDoneInitially ? "finish" : "intro");
  const [idx, setIdx] = useState(firstOpen);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [pending, start] = useTransition();
  const startedRef = useRef(false);

  const done = items.filter((i) => i.status === "completed").length;
  const completedIdx = useMemo(() => items.map((i, n) => (i.status === "completed" ? n : -1)).filter((n) => n >= 0), [items]);
  const totalMin = Math.max(1, Math.round(items.reduce((s, i) => s + i.estSec, 0) / 60));
  const cur = items[idx];

  function begin() {
    setPhase("exercise");
    if (!startedRef.current) {
      startedRef.current = true;
      startSession(programId);
    }
  }

  function goNextOpen(fromIdx: number, list = items) {
    const next = list.findIndex((it, n) => n > fromIdx && it.status !== "completed");
    const wrap = list.findIndex((it) => it.status !== "completed");
    if (next >= 0) setIdx(next);
    else if (wrap >= 0) setIdx(wrap);
    else setPhase("finish");
  }

  function markDone(pain: number | null, difficulty: string | null) {
    const item = cur;
    start(async () => {
      const r = await completeExercise(item.id, pain, difficulty);
      if (!r.ok) {
        toast({ tone: "danger", title: "تعذّر تسجيل التمرين", body: r.error });
        return;
      }
      const list = items.map((it) => (it.id === item.id ? { ...it, status: "completed" } : it));
      setItems(list);
      setFeedbackOpen(false);
      goNextOpen(idx, list);
    });
  }

  function onDoneClick() {
    if (cur.requestFeedback) setFeedbackOpen(true);
    else markDone(null, null);
  }

  // ---------- Intro ----------
  if (phase === "intro") {
    return (
      <div className="space-y-6 animate-[rise_0.5s_var(--ease-calm)_both]">
        <TopBar title={programTitle} />
        <div className="surface-ink overflow-hidden rounded-[32px] p-7 text-ivory shadow-[var(--shadow-lg)]">
          <div className="text-sm text-ivory/65">جلسة اليوم المنزلية</div>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight">{programTitle}</h1>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-white/8 p-4 ring-1 ring-white/10"><div className="text-xs text-ivory/60">عدد التمارين</div><div className="mt-1 font-display text-2xl font-semibold">{items.length}</div></div>
            <div className="rounded-[18px] bg-white/8 p-4 ring-1 ring-white/10"><div className="text-xs text-ivory/60">المدة التقديرية</div><div className="mt-1 font-display text-2xl font-semibold">{totalMin} د</div></div>
          </div>
          {done > 0 && <div className="mt-4 text-sm text-sage-300">أكملت {done} من {items.length} — سنكمل من حيث توقفت.</div>}
        </div>
        {instructions && (
          <Notice tone="sage" icon={<Info size={18} />} title="تعليمات عامة من فريقك">{instructions}</Notice>
        )}
        <ul className="space-y-2">
          {items.map((it, n) => (
            <li key={it.id} className="flex items-center gap-3 rounded-[18px] border border-line/70 bg-surface px-4 py-3">
              <span className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold", it.status === "completed" ? "bg-sage-600 text-white" : "bg-sand-100 text-text-2")}>
                {it.status === "completed" ? <Check size={14} /> : n + 1}
              </span>
              <span className="flex-1 text-[0.9375rem] text-ink">{it.name}</span>
              <span className="text-xs text-text-2">{prescription(it)[0]}</span>
            </li>
          ))}
        </ul>
        <Button size="xl" block onClick={begin} icon={<Play size={20} />}>{done > 0 ? "متابعة الجلسة" : "ابدأ الجلسة"}</Button>
        <EmergencyNotice compact />
      </div>
    );
  }

  // ---------- Finish ----------
  if (phase === "finish" || phase === "done") {
    return <FinishView programId={programId} total={items.length} done={done} minutes={totalMin} doneState={phase === "done"} onDone={() => setPhase("done")} onBack={() => { setPhase("exercise"); setIdx(firstOpen); }} />;
  }

  // ---------- Exercise ----------
  return (
    <div className="space-y-5 animate-[fade_0.35s_var(--ease-calm)_both]" key={cur.id}>
      <TopBar title={programTitle} onFinish={done > 0 ? () => setPhase("finish") : undefined} />
      <div>
        <StepDots total={items.length} current={idx} completed={completedIdx} />
        <div className="mt-2 flex justify-between text-xs text-text-2"><span>التمرين {idx + 1} من {items.length}</span><span className="tabular">{done} / {items.length} مكتمل</span></div>
      </div>

      <Media item={cur} />

      <div>
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight text-ink">{cur.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {prescription(cur).map((p) => <span key={p} className="rounded-full bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-100">{p}</span>)}
        </div>
      </div>

      {cur.duration_sec ? <HoldTimer seconds={cur.duration_sec} /> : null}

      {cur.providerNote && (
        <div className="rounded-[18px] border border-sage-200 bg-sage-50 p-4">
          <div className="text-xs font-medium text-sage-700">ملاحظة مقدم الرعاية</div>
          <p className="mt-1 leading-relaxed text-sage-800">{cur.providerNote}</p>
        </div>
      )}

      <details className="group rounded-[18px] border border-line/80 bg-surface" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-medium text-ink">طريقة الأداء <ChevronDown size={18} className="text-text-2 transition group-open:rotate-180" /></summary>
        <ol className="space-y-3 px-4 pb-4">
          {cur.steps.map((s, n) => (
            <li key={n} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sand-100 text-xs font-semibold text-text-2">{n + 1}</span><span className="leading-relaxed">{s}</span></li>
          ))}
        </ol>
      </details>

      {cur.safety && (
        <div className="flex gap-3 rounded-[18px] border border-clay-200 bg-clay-50 p-4 text-clay-700"><ShieldAlert size={19} className="mt-0.5 shrink-0" /><p className="leading-relaxed">{cur.safety}</p></div>
      )}

      <div className="sticky bottom-24 z-10 space-y-3 rounded-[26px] border border-line/70 bg-page/90 p-3 shadow-[var(--shadow-md)] backdrop-blur md:bottom-4">
        <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
          {cur.status === "completed" ? (
            <div className="flex h-16 items-center justify-center gap-2 rounded-[18px] bg-sage-100 font-semibold text-sage-800"><Check size={20} /> مكتمل</div>
          ) : (
            <Button variant="sage" size="xl" onClick={onDoneClick} loading={pending} icon={<Check size={22} strokeWidth={2.6} />}>تم التمرين</Button>
          )}
          <Button variant="clay" size="xl" onClick={() => setIssueOpen(true)} icon={<AlertTriangle size={19} />}>واجهت مشكلة</Button>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} icon={<ArrowRight size={16} />}>السابق</Button>
          <Button variant="ghost" size="sm" disabled={idx === items.length - 1} onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))} iconEnd={<ArrowLeft size={16} />}>التالي</Button>
        </div>
      </div>

      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} onSave={markDone} pending={pending} />
      <IssueDialog open={issueOpen} onClose={() => setIssueOpen(false)} itemId={cur.id} />
    </div>
  );
}

function TopBar({ title, onFinish }: { title: string; onFinish?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href="/patient" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink" aria-label="إغلاق الجلسة والعودة"><X size={18} /></Link>
      <div className="truncate text-sm font-medium text-text-2">{title}</div>
      {onFinish ? <button onClick={onFinish} className="text-sm font-medium text-slate-600 hover:underline">إنهاء</button> : <span className="w-10" />}
    </div>
  );
}

function Media({ item }: { item: PlayerItem }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.id]);
  if (item.videoUrl && !failed) {
    return (
      <div className="overflow-hidden rounded-[28px] bg-ink shadow-[var(--shadow-md)]">
        <video
          key={item.videoUrl}
          className="aspect-[4/3] w-full bg-ink object-cover"
          src={item.videoUrl}
          poster={item.posterUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          onPlay={() => trackEvent("exercise_video_started")}
          onError={() => setFailed(true)}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line/60 shadow-[var(--shadow-sm)]">
      <ExerciseArt region={item.region} className="aspect-[4/3] w-full" label={`رسم توضيحي: ${item.name}`} />
      {failed && <div className="absolute inset-x-3 bottom-3 rounded-[14px] bg-surface/95 px-3 py-2 text-xs text-clay-700 shadow-[var(--shadow-sm)]">الفيديو غير متاح حاليًا — تابع بالتعليمات المكتوبة.</div>}
    </div>
  );
}

function HoldTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => {
      if (l <= 1) { setRunning(false); navigator.vibrate?.(200); return 0; }
      return l - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [running]);
  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-line/80 bg-surface p-4">
      <ProgressRing value={seconds - left} max={seconds} size={64} stroke={6} tone="slate" label={`متبقٍ ${left} ثانية`}>
        <span className="text-sm font-semibold text-ink tabular">{left}</span>
      </ProgressRing>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-ink"><Timer size={16} /> مؤقت التمرين</div>
        <div className="text-xs text-text-2">{seconds} ثانية لكل مجموعة</div>
      </div>
      <Button variant="secondary" size="sm" onClick={() => { if (left === 0) setLeft(seconds); setRunning((r) => !r); }} icon={running ? <Pause size={15} /> : <Play size={15} />}>
        {running ? "إيقاف" : left === 0 ? "إعادة" : "ابدأ"}
      </Button>
    </div>
  );
}

function FeedbackDialog({ open, onClose, onSave, pending }: { open: boolean; onClose: () => void; onSave: (pain: number | null, diff: string | null) => void; pending: boolean }) {
  const [pain, setPain] = useState<number | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  useEffect(() => { if (open) { setPain(null); setDiff(null); } }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title="أحسنت! كيف كان التمرين؟" description="اختياري — يساعد فريقك على متابعة تقدمك."
      footer={<><Button variant="ghost" onClick={() => onSave(null, null)} disabled={pending}>تخطي</Button><Button variant="sage" onClick={() => onSave(pain, diff)} loading={pending}>حفظ ومتابعة</Button></>}>
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink">مستوى الألم أثناء التمرين</legend>
          <div className="grid grid-cols-11 gap-1" role="radiogroup">
            {Array.from({ length: 11 }).map((_, n) => (
              <button key={n} type="button" role="radio" aria-checked={pain === n} onClick={() => setPain(n)}
                className={cn("aspect-square rounded-[10px] text-sm font-semibold transition tabular", pain === n ? (n >= 7 ? "bg-danger text-white" : n >= 4 ? "bg-warning text-white" : "bg-sage-600 text-white") : "bg-sand-50 text-text ring-1 ring-line hover:ring-sand-300")}>
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-text-2"><span>لا ألم</span><span>ألم شديد</span></div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink">مستوى الصعوبة</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DIFFICULTY_LABEL).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={diff === k} onClick={() => setDiff(k)}
                className={cn("rounded-full px-4 py-2 text-sm transition", diff === k ? "bg-slate-600 text-ivory" : "bg-surface text-text ring-1 ring-line hover:ring-sand-300")}>{l}</button>
            ))}
          </div>
        </fieldset>
        {pain !== null && pain >= 7 && (
          <Notice tone="warning">سيُبلَّغ فريق رعايتك بدرجة الألم المرتفعة. إذا كان الألم شديدًا أو مفاجئًا فتوقف عن التمارين.</Notice>
        )}
      </div>
    </Dialog>
  );
}

function IssueDialog({ open, onClose, itemId }: { open: boolean; onClose: () => void; itemId: string }) {
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  useEffect(() => { if (open) { setReason(null); setComment(""); setSent(false); } }, [open]);
  function submit() {
    if (!reason) return;
    start(async () => {
      const r = await reportIssue(itemId, reason, comment);
      if (!r.ok) return toast({ tone: "danger", title: "تعذّر الإرسال", body: r.error });
      setSent(true);
    });
  }
  return (
    <Dialog open={open} onClose={onClose} title={sent ? "تم تسجيل ملاحظتك" : "ما المشكلة التي واجهتها؟"}
      footer={sent ? <Button onClick={onClose}>متابعة</Button> : <><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={submit} disabled={!reason} loading={pending}>إرسال لفريق الرعاية</Button></>}>
      {sent ? (
        <div className="space-y-4">
          <Notice tone="sage" icon={<Check size={18} />}>تم تسجيل ملاحظتك ليطلع عليها فريق الرعاية.</Notice>
          <EmergencyNotice />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2">
            {Object.entries(ISSUE_REASON).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setReason(k)} aria-pressed={reason === k}
                className={cn("flex items-center justify-between rounded-[14px] px-4 py-3.5 text-start transition", reason === k ? "bg-slate-50 ring-2 ring-slate-500" : "bg-surface ring-1 ring-line hover:ring-sand-300")}>
                <span className="font-medium text-ink">{l}</span>
                <span className={cn("grid size-5 place-items-center rounded-full border-2", reason === k ? "border-slate-600" : "border-slate-300")}>{reason === k && <span className="size-2 rounded-full bg-slate-600" />}</span>
              </button>
            ))}
          </div>
          <Textarea placeholder="تعليق قصير (اختياري)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} />
          <EmergencyNotice compact />
        </div>
      )}
    </Dialog>
  );
}

function FinishView({ programId, total, done, minutes, doneState, onDone, onBack }: { programId: string; total: number; done: number; minutes: number; doneState: boolean; onDone: () => void; onBack: () => void }) {
  const [feeling, setFeeling] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const all = done >= total;
  function submit() {
    start(async () => {
      const r = await finishSession(programId, feeling, note);
      if (!r.ok) return toast({ tone: "danger", title: "تعذّر الحفظ", body: r.error });
      onDone();
    });
  }
  if (doneState) {
    return (
      <div className="py-10 text-center animate-[rise_0.5s_var(--ease-calm)_both]">
        <div className="mx-auto grid size-24 place-items-center rounded-full bg-sage-600 text-white shadow-[var(--shadow-md)]"><Check size={42} strokeWidth={2.4} /></div>
        <h1 className="mt-6 font-display text-[2rem] font-semibold text-ink">شكرًا لك</h1>
        <p className="mt-2 text-text-2">وصلت ملاحظاتك إلى فريق رعايتك. نراك غدًا.</p>
        <Link href="/patient" className={buttonClasses("primary", "lg", "mt-8")}>العودة إلى اليوم</Link>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-[rise_0.5s_var(--ease-calm)_both]">
      <div className="surface-sage rounded-[32px] border border-sage-200 p-8 text-center">
        <div className="mx-auto w-fit"><ProgressRing value={done} max={total} size={120} stroke={10}><span className="font-display text-3xl font-semibold text-ink">{all ? <Check size={44} className="text-sage-700" strokeWidth={2.4} /> : `${done}/${total}`}</span></ProgressRing></div>
        <h1 className="mt-5 font-display text-[1.875rem] font-semibold leading-tight text-ink">{all ? "أحسنت، أنهيت برنامج اليوم." : `أكملت ${done} من ${total} تمارين`}</h1>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm text-sage-800">
          <span>{done} تمارين</span><span className="size-1 rounded-full bg-sage-500" /><span className="inline-flex items-center gap-1"><Clock size={14} /> ~{minutes} دقيقة</span>
        </div>
        {!all && <button onClick={onBack} className="mt-4 text-sm font-medium text-slate-600 hover:underline">العودة لإكمال التمارين المتبقية</button>}
      </div>
      <fieldset>
        <legend className="mb-3 font-semibold text-ink">كيف تشعر بعد البرنامج؟</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {[["better", "أفضل", "🙂"], ["same", "كما هو", "😐"], ["worse", "أسوأ", "🙁"]].map(([k, l, e]) => (
            <button key={k} type="button" onClick={() => setFeeling(k)} aria-pressed={feeling === k}
              className={cn("flex flex-col items-center gap-1.5 rounded-[18px] py-4 transition", feeling === k ? "bg-slate-50 ring-2 ring-slate-500" : "bg-surface ring-1 ring-line hover:ring-sand-300")}>
              <span className="text-2xl" aria-hidden="true">{e}</span><span className="text-sm font-medium text-ink">{l}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="note" className="mb-1.5 block font-semibold text-ink">ملاحظة لمقدم الرعاية</label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري — أي شيء تود أن يعرفه فريقك" rows={3} maxLength={1000} />
      </div>
      {feeling === "worse" && <EmergencyNotice />}
      <Button size="xl" block onClick={submit} loading={pending}>إرسال وإنهاء الجلسة</Button>
    </div>
  );
}
