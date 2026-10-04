"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { startThread } from "@/lib/actions/patient";
import { cn } from "@/lib/cn";

const CATS = [
  ["exercise_question", "سؤال عن تمرين"],
  ["pain", "ألم / صعوبة"],
  ["appointment", "موعد"],
  ["general", "استفسار عام"],
];

export function NewThread({ exercises, preselect }: { exercises: { id: string; name: string }[]; preselect?: string }) {
  const [state, action] = useActionState(startThread, null);
  const [cat, setCat] = useState(preselect ? "exercise_question" : "general");
  const router = useRouter();
  useEffect(() => { if (state?.ok && state.data) router.replace(`/patient/messages/${state.data}`); }, [state, router]);
  return (
    <form action={action} className="space-y-6">
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <fieldset>
        <legend className="mb-2.5 text-sm font-medium text-ink">نوع الرسالة</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATS.map(([k, l]) => (
            <label key={k} className={cn("cursor-pointer rounded-[14px] px-4 py-3 text-center text-sm font-medium transition", cat === k ? "bg-slate-600 text-ivory" : "bg-surface text-text ring-1 ring-line hover:ring-sand-300")}>
              <input type="radio" name="category" value={k} checked={cat === k} onChange={() => setCat(k)} className="sr-only" />{l}
            </label>
          ))}
        </div>
      </fieldset>
      {(cat === "exercise_question" || cat === "pain") && exercises.length > 0 && (
        <Field label="التمرين المرتبط" htmlFor="program_exercise" hint="ربط الرسالة بتمرين يساعد فريقك على الفهم بسرعة.">
          <Select id="program_exercise" name="program_exercise" defaultValue={preselect ?? ""}>
            <option value="">بدون تمرين محدد</option>
            {exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="الموضوع" htmlFor="subject"><Input id="subject" name="subject" maxLength={160} placeholder="مثال: سؤال عن طريقة التمرين" /></Field>
      <Field label="الرسالة" htmlFor="body"><Textarea id="body" name="body" rows={5} maxLength={4000} required /></Field>
      <Notice tone="neutral">الرسائل ليست مخصصة للحالات الطارئة. يرد فريقك خلال ساعات العمل.</Notice>
      <SubmitButton size="lg" block icon={<Send size={18} />}>إرسال</SubmitButton>
    </form>
  );
}
