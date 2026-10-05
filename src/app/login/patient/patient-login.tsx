"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, KeyRound, LogIn, MessageSquareText, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { requestPatientCode, verifyPatientCode } from "@/lib/actions/auth";
import { digitsOnly, maskNationalId } from "@/lib/identity";

const CODE_LENGTH = 6;

export function PatientLogin({ next }: { next?: string }) {
  const [step, setStep] = useState<"id" | "code">("id");
  const [nationalId, setNationalId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);
  const submitted = useRef<string | null>(null);

  // resend countdown
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (pending || nationalId.length !== 10) return;
    setError(null);
    start(async () => {
      const res = await requestPatientCode(nationalId);
      if (!res.ok) return setError(res.error);
      setWait(res.data?.cooldown ?? 60);
      setCode("");
      submitted.current = null;
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 60);
    });
  }

  function verify(value = code) {
    if (pending || value.length !== CODE_LENGTH || submitted.current === value) return;
    submitted.current = value;
    setError(null);
    start(async () => {
      const res = await verifyPatientCode(nationalId, value, next);
      if (res && !res.ok) {
        setError(res.error);
        setCode("");
        submitted.current = null;
        codeRef.current?.focus();
      }
    });
  }

  if (step === "id") {
    return (
      <form onSubmit={send} className="space-y-5" noValidate>
        <Field label="رقم الهوية الوطنية / الإقامة" htmlFor="nid" hint="الرقم المسجّل لدى قسم التأهيل الطبي — ١٠ أرقام." error={error}>
          <Input id="nid" name="national_id" dir="ltr" autoComplete="username" inputMode="numeric" maxLength={10} placeholder="1XXXXXXXXX" value={nationalId}
            onChange={(e) => { setNationalId(digitsOnly(e.target.value).slice(0, 10)); setError(null); }}
            className="h-14 text-center font-mono text-xl tracking-[0.25em]" aria-invalid={!!error} required />
        </Field>
        <Button type="submit" size="lg" block loading={pending} disabled={nationalId.length !== 10} icon={<MessageSquareText size={18} />}>إرسال رمز التحقق</Button>
        <p className="text-center text-xs leading-relaxed text-text-2">سيصلك رمز من ٦ أرقام برسالة نصية على جوالك المسجّل لدى القسم.</p>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-5" noValidate>
      <button type="button" onClick={() => { setStep("id"); setCode(""); setError(null); }} className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink">
        <ArrowRight size={16} /> تغيير رقم الهوية <span dir="ltr" className="font-mono text-xs text-text-3">{maskNationalId(nationalId)}</span>
      </button>
      <Notice tone="sage" icon={<KeyRound size={18} />} title="تحقق من رسائلك">
        إذا كان رقم الهوية مسجّلًا لدينا فستصلك خلال لحظات رسالة فيها رمز التحقق على جوالك المسجّل. الرمز صالح لمدة قصيرة ولا تشاركه مع أحد.
      </Notice>
      <Field label="رمز التحقق" htmlFor="code" error={error}>
        <Input ref={codeRef} id="code" name="one-time-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={CODE_LENGTH} placeholder="••••••" value={code}
          onChange={(e) => {
            const v = digitsOnly(e.target.value).slice(0, CODE_LENGTH);
            setCode(v);
            setError(null);
            if (v.length === CODE_LENGTH) verify(v);
          }}
          className="h-14 text-center font-mono text-2xl tracking-[0.5em]" aria-invalid={!!error} aria-describedby="code-help" required />
      </Field>
      <Button type="submit" size="lg" block loading={pending} disabled={code.length !== CODE_LENGTH} icon={<LogIn size={18} />}>دخول</Button>
      <div id="code-help" className="space-y-2 text-center text-sm">
        {wait > 0 ? (
          <p className="text-text-2">يمكنك طلب رمز جديد بعد <span className="font-mono tabular-nums text-ink">{wait}</span> ثانية</p>
        ) : (
          <button type="button" onClick={() => send()} disabled={pending} className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:underline disabled:opacity-50">
            <RotateCw size={14} /> إعادة إرسال الرمز
          </button>
        )}
        <p className="text-xs text-text-3">لم تصلك الرسالة؟ تأكد أن رقم جوالك مسجّل لدى القسم، أو تواصل مع الاستقبال لتحديثه.</p>
      </div>
    </form>
  );
}
