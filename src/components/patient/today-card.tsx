import Link from "next/link";
import { Check, Clock, Play, RotateCw } from "lucide-react";
import { StepDots } from "@/components/ui/progress";
import { buttonClasses } from "@/components/ui/button";

export function TodayCard({ total, done, minutes, programId, programTitle }: { total: number; done: number; minutes: number; programId: string; programTitle: string }) {
  const finished = total > 0 && done >= total;
  const started = done > 0 && !finished;
  const completedIdx = Array.from({ length: done }, (_, i) => i);
  if (finished) {
    return (
      <section className="surface-sage relative overflow-hidden rounded-[30px] border border-sage-200 p-6 sm:p-8" aria-labelledby="today-title">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-sage-600 text-white shadow-[var(--shadow-sm)]"><Check size={28} strokeWidth={2.6} /></span>
          <div>
            <h2 id="today-title" className="font-display text-[1.75rem] font-semibold leading-tight text-ink">أنهيت برنامج اليوم</h2>
            <p className="text-sage-800">{total} من {total} تمارين — أحسنت، استمر على هذا الإيقاع.</p>
          </div>
        </div>
        <div className="mt-5"><StepDots total={total} current={-1} completed={completedIdx} /></div>
      </section>
    );
  }
  return (
    <section className="surface-ink relative overflow-hidden rounded-[30px] p-6 text-ivory shadow-[var(--shadow-lg)] sm:p-8" aria-labelledby="today-title">
      <svg className="pointer-events-none absolute -bottom-10 -start-10 h-48 opacity-[0.08]" viewBox="0 0 200 120" fill="none" aria-hidden="true">
        <path d="M10 110c30 0 42-20 56-52C84 20 100 10 130 10c30 0 46 16 60 36" stroke="#F7F3EE" strokeWidth="10" strokeLinecap="round" />
      </svg>
      <div className="relative">
        <div className="text-sm text-ivory/65">{programTitle}</div>
        <h2 id="today-title" className="mt-1.5 font-display text-[1.875rem] font-semibold leading-tight sm:text-[2.125rem]">
          {started ? `أكملت ${done} من ${total}` : `لديك ${total} ${total === 1 ? "تمرين" : total <= 10 ? "تمارين" : "تمرينًا"} اليوم`}
        </h2>
        <div className="mt-2 flex items-center gap-2 text-sm text-ivory/70"><Clock size={15} /> المدة المتوقعة {minutes} دقيقة</div>
        <div className="mt-5"><StepDots total={total} current={done} completed={completedIdx} tone="light" /></div>
        <div className="mt-2 text-xs text-ivory/55 tabular">{done} / {total}</div>
        <Link href={`/patient/session?program=${programId}`} className={buttonClasses("ink-light", "xl", "mt-6 w-full")}>
          {started ? <RotateCw size={20} /> : <Play size={20} />}
          {started ? "متابعة الجلسة" : "ابدأ تمارين اليوم"}
        </Link>
      </div>
    </section>
  );
}
