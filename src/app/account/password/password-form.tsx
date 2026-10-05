"use client";

import { useActionState, useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { changePassword } from "@/lib/actions/account";

const RULES: [string, (p: string) => boolean][] = [
  ["١٠ أحرف على الأقل", (p) => p.length >= 10],
  ["حروف لاتينية", (p) => /[A-Za-z]/.test(p)],
  ["أرقام", (p) => /\d/.test(p)],
];

export function PasswordForm({ first }: { first: boolean }) {
  const [state, action] = useActionState(changePassword, null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const strong = RULES.every(([, ok]) => ok(pw));
  const type = show ? "text" : "password";
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="first" value={first ? "1" : "0"} />
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <Field label={first ? "كلمة المرور المؤقتة" : "كلمة المرور الحالية"} htmlFor="cur" hint={first ? "التي استلمتها من مدير النظام." : undefined}>
        <Input id="cur" name="current" type={type} dir="ltr" autoComplete="current-password" required className="text-end" />
      </Field>
      <Field label="كلمة المرور الجديدة" htmlFor="new">
        <div className="relative">
          <Input id="new" name="new" type={type} dir="ltr" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} className="pe-11 text-end" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 start-0 grid w-11 place-items-center text-text-2 hover:text-ink" aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </Field>
      <ul className="flex flex-wrap gap-2" aria-label="متطلبات كلمة المرور">
        {RULES.map(([label, ok]) => (
          <li key={label} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1 transition", ok(pw) ? "bg-sage-50 text-sage-800 ring-sage-200" : "bg-surface-soft text-text-2 ring-line")}>
            <Check size={13} className={ok(pw) ? "opacity-100" : "opacity-30"} /> {label}
          </li>
        ))}
      </ul>
      <Field label="تأكيد كلمة المرور الجديدة" htmlFor="conf" error={confirm && confirm !== pw ? "غير مطابقة." : undefined}>
        <Input id="conf" name="confirm" type={type} dir="ltr" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="text-end" />
      </Field>
      <SubmitButton size="lg" block icon={<KeyRound size={18} />} pendingLabel="جارٍ الحفظ…" disabled={!strong || pw !== confirm}>
        {first ? "حفظ والمتابعة" : "تغيير كلمة المرور"}
      </SubmitButton>
    </form>
  );
}
