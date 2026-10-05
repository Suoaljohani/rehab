"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarPlus, FileText, HelpCircle, MessageCircleQuestion, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { v: "referral", label: "لدي إحالة للتأهيل", d: "أرسل طلبك مع بيانات الإحالة وسيتواصل معك القسم.", icon: FileText, go: "/request?type=referral" },
  { v: "returning", label: "سبق أن راجعت القسم", d: "ادخل إلى حسابك برقم هويتك لمتابعة برنامجك.", icon: RotateCcw, go: "/login/patient" },
  { v: "new_appointment", label: "أريد موعدًا جديدًا", d: "قدّم طلب موعد وسيراجعه القسم ويؤكد معك.", icon: CalendarPlus, go: "/request" },
  { v: "find_service", label: "أريد معرفة الخدمة المناسبة", d: "تعرّف على خدمات التأهيل والحالات التي تخدمها.", icon: HelpCircle, go: "/services" },
  { v: "inquiry", label: "لدي استفسار", d: "اطّلع على الأسئلة الشائعة أو تواصل مع القسم.", icon: MessageCircleQuestion, go: "/contact" },
];

export function StartWizard() {
  const [choice, setChoice] = useState<string | null>(null);
  const router = useRouter();
  const selected = OPTIONS.find((o) => o.v === choice);
  return (
    <div>
      <fieldset>
        <legend className="mb-5 font-display text-2xl font-semibold text-ink">كيف يمكننا مساعدتك؟</legend>
        <div className="grid gap-3">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = choice === o.v;
            return (
              <label key={o.v} className={`group flex cursor-pointer items-center gap-4 rounded-[20px] border bg-surface p-5 transition ${active ? "border-slate-500 shadow-[0_0_0_3px_var(--color-slate-100)]" : "border-line hover:border-sand-300"}`}>
                <input type="radio" name="journey" value={o.v} className="sr-only" checked={active} onChange={() => setChoice(o.v)} />
                <span className={`grid size-12 shrink-0 place-items-center rounded-[14px] transition ${active ? "bg-slate-600 text-ivory" : "bg-sand-100 text-slate-600"}`}><Icon size={22} /></span>
                <span className="flex-1">
                  <span className="block text-[1.0625rem] font-semibold text-ink">{o.label}</span>
                  <span className="mt-0.5 block text-sm text-text-2">{o.d}</span>
                </span>
                <span className={`grid size-6 place-items-center rounded-full border-2 ${active ? "border-slate-600" : "border-slate-300"}`}>{active && <span className="size-2.5 rounded-full bg-slate-600" />}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-8 flex justify-end">
        <Button size="lg" disabled={!selected} iconEnd={<ArrowLeft size={18} />} onClick={() => selected && router.push(selected.go)}>متابعة</Button>
      </div>
    </div>
  );
}
