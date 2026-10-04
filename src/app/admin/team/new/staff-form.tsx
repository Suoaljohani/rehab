"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, UserPlus } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStaff } from "@/lib/actions/admin";
import { ROLE_LABEL } from "@/lib/status";

function genPassword() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const a = new Uint32Array(14);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => c[n % c.length]).join("");
}

export function StaffForm({ specialties }: { specialties: { code: string; name: string }[] }) {
  const [state, action] = useActionState(createStaff, null);
  const [pw, setPw] = useState("");
  const router = useRouter();
  useEffect(() => setPw(genPassword()), []);
  useEffect(() => { if (state?.ok) router.push(`/admin/team/${state.data}?created=1`); }, [state, router]);
  return (
    <form action={action} className="space-y-6">
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" htmlFor="fn" required><Input id="fn" name="full_name" required /></Field>
        <Field label="الاسم بالإنجليزية" htmlFor="fne"><Input id="fne" name="full_name_en" dir="ltr" /></Field>
        <Field label="البريد الإلكتروني" htmlFor="em" required><Input id="em" name="email" type="email" dir="ltr" required className="text-end" /></Field>
        <Field label="الرقم الوظيفي" htmlFor="eid"><Input id="eid" name="employee_id" dir="ltr" /></Field>
        <Field label="الدور" htmlFor="ro" required><Select id="ro" name="role" defaultValue="provider">{["provider", "supervisor", "content_reviewer", "admin"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
        <Field label="التخصص" htmlFor="sp"><Select id="sp" name="specialty_code"><option value="">—</option>{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
        <Field label="المسمى المهني" htmlFor="ti"><Input id="ti" name="title" placeholder="أخصائي علاج طبيعي" /></Field>
        <Field label="سعة الحالات" htmlFor="ca"><Input id="ca" name="capacity" type="number" min={0} defaultValue={20} /></Field>
        <Field label="الجوال" htmlFor="ph"><Input id="ph" name="phone" dir="ltr" className="text-end" /></Field>
        <Field label="كلمة مرور مؤقتة" htmlFor="pw" hint="سلّمها للموظف بقناة آمنة واطلب منه تفعيل التحقق الثنائي." required>
          <div className="flex gap-2"><Input id="pw" name="password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} minLength={10} required className="font-mono" /><button type="button" onClick={() => setPw(genPassword())} className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-line hover:bg-sand-50" aria-label="توليد كلمة مرور"><RefreshCw size={16} /></button></div>
        </Field>
      </div>
      <div className="flex justify-end"><SubmitButton icon={<UserPlus size={17} />}>إنشاء الحساب</SubmitButton></div>
    </form>
  );
}
