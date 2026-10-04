import { CalendarDays, Play } from "lucide-react";
import { ProgressRing, StepDots } from "@/components/ui/progress";
import { ExerciseArt } from "@/components/exercise/exercise-art";

/** Composed product vignette: the patient "Today" screen with floating context cards. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto h-[540px] w-full max-w-[520px]" aria-hidden="true">
      <div className="absolute inset-x-10 bottom-0 top-16 rounded-[48px] bg-sand-200/60 blur-3xl" />
      {/* phone */}
      <div className="absolute left-1/2 top-0 w-[290px] -translate-x-1/2 overflow-hidden rounded-[44px] border-[9px] border-ink bg-page shadow-[var(--shadow-lg)]">
        <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-ink" />
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.6875rem] text-text-2">الأحد ٤ أكتوبر</div>
              <div className="text-sm font-semibold text-ink">صباح الخير، محمد</div>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-sage-100 text-[0.625rem] font-semibold text-sage-700">م ع</span>
          </div>
          <div className="surface-ink rounded-[24px] p-4 text-ivory">
            <div className="text-[0.6875rem] text-ivory/65">برنامج اليوم</div>
            <div className="mt-1 font-display text-xl font-semibold">لديك ٤ تمارين اليوم</div>
            <div className="text-[0.75rem] text-ivory/65">المدة المتوقعة ١١ دقيقة</div>
            <div className="mt-3"><StepDots total={4} current={0} tone="light" /></div>
            <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-ivory text-sm font-medium text-ink"><Play size={15} /> ابدأ تمارين اليوم</div>
          </div>
          <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
            <ExerciseArt region="knee" className="h-28" />
            <div className="p-3">
              <div className="text-sm font-semibold text-ink">رفع الساق المستقيمة</div>
              <div className="mt-1 text-[0.6875rem] text-text-2">١٢ تكرار · ٣ مجموعات</div>
            </div>
          </div>
        </div>
      </div>
      {/* floating adherence */}
      <div className="absolute end-0 top-28 w-48 rounded-[24px] border border-sage-200 bg-surface/95 p-4 shadow-[var(--shadow-md)] backdrop-blur animate-[rise_0.9s_var(--ease-calm)_0.2s_both]">
        <div className="flex items-center gap-3">
          <ProgressRing value={87} size={56} stroke={6}><span className="text-xs font-semibold text-ink">87٪</span></ProgressRing>
          <div><div className="text-xs text-text-2">الالتزام</div><div className="text-sm font-semibold text-ink">هذا الأسبوع</div></div>
        </div>
      </div>
      {/* floating appointment */}
      <div className="absolute bottom-16 start-0 w-56 rounded-[24px] border border-line bg-surface/95 p-4 shadow-[var(--shadow-md)] backdrop-blur animate-[rise_0.9s_var(--ease-calm)_0.4s_both]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[12px] bg-clay-50 text-clay-600"><CalendarDays size={18} /></span>
          <div><div className="text-xs text-text-2">الجلسة الحضورية القادمة</div><div className="text-sm font-semibold text-ink">الخميس · ١٠:٣٠ ص</div></div>
        </div>
      </div>
      {/* floating message */}
      <div className="absolute bottom-0 end-6 w-60 rounded-[22px] border border-line bg-surface/95 p-3.5 shadow-[var(--shadow-md)] backdrop-blur animate-[rise_0.9s_var(--ease-calm)_0.6s_both]">
        <div className="text-[0.6875rem] text-text-2">أ. نورة العتيبي</div>
        <div className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink">أحسنت! زدنا تكرارات رفع الساق إلى ١٢ هذا الأسبوع.</div>
      </div>
    </div>
  );
}
