"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { requestPatientCode, verifyPatientCode } from "@/lib/actions/auth";
import { digitsOnly, maskNationalId } from "@/lib/identity";

export function PatientLogin({ next }: { next?: string }) {
  const [step, setStep] = useState<"id" | "code">("id");
  const [nationalId, setNationalId] = useState("");
  const [code, setCode] = useState("");
  const [masked, setMasked] = useState<string | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const res = await requestPatientCode(nationalId);
      if (!res.ok) return setError(res.error);
      setMasked(res.data?.maskedPhone ?? null);
      setDemo(res.data?.demoCode ?? null);
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 50);
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await verifyPatientCode(nationalId, code, next);
      if (res && !res.ok) setError(res.error);
    });
  }

  if (step === "id") {
    return (
      <form onSubmit={send} className="space-y-5" noValidate>
        <Field label="رقم الهوية الوطنية / الإقامة" htmlFor="nid" hint="الرقم المسجّل لدى قسم التأهيل الطبي — ١٠ أرقام." error={error}>
          <Input id="nid" name="national_id" dir="ltr" autoComplete="username" inputMode="numeric" maxLength={10} placeholder="1XXXXXXXXX" value={nationalId}
            onChange={(e) => setNationalId(digitsOnly(e.target.value).slice(0, 10))} className="h-14 text-center font-mono text-xl tracking-[0.25em]" aria-invalid={!!error} required />
        </Field>
        <Button type="submit" size="lg" block loading={pending} disabled={nationalId.length !== 10} icon={<KeyRound size={18} />}>إرسال رمز التحقق</Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-5" noValidate>
      <button type="button" onClick={() => { setStep("id"); setCode(""); setError(null); }} className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink">
        <ArrowRight size={16} /> تغيير رقم الهوية <span dir="ltr" className="font-mono text-xs text-text-3">{maskNationalId(nationalId)}</span>
      </button>
      <Notice tone="sage" icon={<ShieldCheck size={18} />}>
        {masked ? <>أرسلنا رمزًا من ٦ أرقام إلى جوالك المنتهي بـ <b dir="ltr">{masked}</b>.</> : "إذا كان رقم الهوية مسجّلًا لدينا فسيصلك رمز التحقق على جوالك المسجّل."}
      </Notice>
      {demo && (
        <div className="rounded-[14px] border border-dashed border-clay-300 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          وضع العرض مفعّل — رمز التحقق: <b className="font-mono text-base tracking-widest" dir="ltr">{demo}</b>
        </div>
      )}
      <Field label="رمز التحقق" htmlFor="code" error={error}>
        <Input ref={codeRef} id="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code}
          onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))} className="h-14 text-center font-mono text-2xl tracking-[0.5em]" aria-invalid={!!error} required />
      </Field>
      <Button type="submit" size="lg" block loading={pending} disabled={code.length !== 6}>دخول</Button>
      <button type="button" onClick={() => send()} disabled={pending} className="block w-full text-center text-sm text-slate-600 hover:underline">إعادة إرسال الرمز</button>
    </form>
  );
}
