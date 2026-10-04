"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { saveTemplate } from "@/lib/actions/admin";

export function TemplateForm({ specialties, initial }: { specialties: { code: string; name: string }[]; initial?: { id: string; name: string; specialty_code: string | null; category: string | null; description: string | null; instructions: string | null; duration_weeks: number; status: string } }) {
  const [state, action] = useActionState(saveTemplate, null);
  const router = useRouter();
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) { toast({ tone: "success", title: state.message ?? "تم الحفظ" }); if (!initial) router.push(`/admin/templates/${state.data}`); else router.refresh(); }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = initial;
  return (
    <form action={action} className="space-y-4">
      {v && <input type="hidden" name="id" value={v.id} />}
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="اسم القالب" htmlFor="tn" className="sm:col-span-2"><Input id="tn" name="name" defaultValue={v?.name} required /></Field>
        <Field label="التخصص" htmlFor="ts"><Select id="ts" name="specialty_code" defaultValue={v?.specialty_code ?? ""}><option value="">—</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
        <Field label="الحالة / الفئة" htmlFor="tc"><Input id="tc" name="category" defaultValue={v?.category ?? ""} placeholder="الركبة" /></Field>
        <Field label="المدة (أسابيع)" htmlFor="tw"><Input id="tw" name="duration_weeks" type="number" min={1} max={52} defaultValue={v?.duration_weeks ?? 4} /></Field>
        <Field label="حالة القالب" htmlFor="tst"><Select id="tst" name="status" defaultValue={v?.status ?? "active"}><option value="active">نشط</option><option value="draft">مسودة</option><option value="archived">مؤرشف</option></Select></Field>
        <Field label="الوصف" htmlFor="td" className="sm:col-span-2"><Textarea id="td" name="description" rows={2} defaultValue={v?.description ?? ""} /></Field>
        <Field label="التعليمات الافتراضية للمراجع" htmlFor="ti" className="sm:col-span-2"><Textarea id="ti" name="instructions" rows={3} defaultValue={v?.instructions ?? ""} /></Field>
      </div>
      <div className="flex justify-end"><SubmitButton icon={<Save size={16} />}>{v ? "حفظ (نسخة جديدة من القالب)" : "إنشاء القالب"}</SubmitButton></div>
    </form>
  );
}
