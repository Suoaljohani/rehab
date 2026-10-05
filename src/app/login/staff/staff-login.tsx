"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { staffSignIn } from "@/lib/actions/auth";

export function StaffLogin({ next }: { next?: string }) {
  const [state, action] = useActionState(staffSignIn, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <Field label="البريد الإلكتروني الوظيفي" htmlFor="email">
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="username" required placeholder="name@masar.health" className="text-end" />
      </Field>
      <Field label="كلمة المرور" htmlFor="password">
        <Input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required className="text-end" />
      </Field>
      <SubmitButton size="lg" block icon={<LogIn size={18} />} pendingLabel="جارٍ التحقق…">تسجيل الدخول</SubmitButton>
    </form>
  );
}
