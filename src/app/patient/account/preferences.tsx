"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { updatePreferences } from "@/lib/actions/patient";
import { cn } from "@/lib/cn";

type Prefs = { exercise: boolean; appointments: boolean; messages: boolean; announcements: boolean };

export function Preferences({ initial }: { initial: Prefs }) {
  const [p, setP] = useState(initial);
  const [, start] = useTransition();
  const toast = useToast();
  function toggle(k: keyof Prefs) {
    const next = { ...p, [k]: !p[k] };
    setP(next);
    start(async () => {
      const r = await updatePreferences(next);
      if (!r.ok) { setP(p); toast({ tone: "danger", title: "تعذّر الحفظ", body: r.error }); }
    });
  }
  const rows: [keyof Prefs, string, string][] = [
    ["exercise", "تذكير بتمارين اليوم", "تنبيه يومي عند وجود تمارين"],
    ["appointments", "تذكير بالمواعيد", "قبل الموعد بيوم"],
    ["messages", "الرسائل الجديدة", "عند رد فريق رعايتك"],
    ["announcements", "إعلانات القسم", "ورش وتثقيف وتحديثات عامة"],
  ];
  return (
    <ul className="divide-y divide-line-soft">
      {rows.map(([k, l, d]) => (
        <li key={k} className="flex items-center justify-between gap-4 py-3.5">
          <div><div className="font-medium text-ink">{l}</div><div className="text-xs text-text-2">{d}</div></div>
          <button role="switch" aria-checked={p[k]} aria-label={l} onClick={() => toggle(k)}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", p[k] ? "bg-sage-600" : "bg-disabled")}>
            <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all", p[k] ? "start-6" : "start-1")} />
          </button>
        </li>
      ))}
      <li className="py-3.5 text-xs text-text-3">التنبيهات التشغيلية المهمة (مثل تغيير موعد أو تحديث برنامجك) تصلك دائمًا.</li>
    </ul>
  );
}
