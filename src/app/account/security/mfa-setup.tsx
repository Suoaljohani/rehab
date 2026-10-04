"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

type Factor = { id: string; status: string; friendly_name?: string | null; created_at: string };

export function MfaSetup() {
  const supabase = createClient();
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.all ?? []) as Factor[]);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setError(null);
    setBusy(true);
    for (const f of factors.filter((f) => f.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `masar-${Date.now()}` });
    setBusy(false);
    if (error || !data) return setError("تعذّر بدء التفعيل. تأكد من تفعيل MFA في إعدادات المشروع.");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify() {
    if (!enroll) return;
    setBusy(true);
    setError(null);
    const { data: ch } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    const { error } = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch!.id, code });
    setBusy(false);
    if (error) return setError("الرمز غير صحيح. حاول مجددًا.");
    setEnroll(null);
    setCode("");
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    await load();
    router.refresh();
  }

  const verified = factors.filter((f) => f.status === "verified");
  return (
    <div className="space-y-5">
      {error && <Notice tone="danger">{error}</Notice>}
      {verified.length > 0 ? (
        <div className="space-y-3">
          <Notice tone="success">التحقق الثنائي مفعّل على حسابك. سيُطلب منك الرمز عند كل تسجيل دخول.</Notice>
          {verified.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-[14px] border border-line bg-surface px-4 py-3">
              <span className="text-sm text-ink">تطبيق المصادقة</span>
              <Button variant="danger" size="sm" onClick={() => remove(f.id)} loading={busy}>إزالة</Button>
            </div>
          ))}
        </div>
      ) : enroll ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[200px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="رمز QR للتحقق الثنائي" className="size-[200px] rounded-[16px] border border-line bg-white p-2" />
          <div className="space-y-4">
            <ol className="list-decimal space-y-1.5 ps-5 text-sm text-text">
              <li>افتح تطبيق المصادقة (Google Authenticator أو Microsoft Authenticator).</li>
              <li>امسح الرمز، أو أدخل المفتاح يدويًا: <code className="rounded bg-sand-50 px-1.5 text-xs" dir="ltr">{enroll.secret}</code></li>
              <li>أدخل الرمز المكوّن من ٦ أرقام.</li>
            </ol>
            <Field label="الرمز" htmlFor="totp"><Input id="totp" dir="ltr" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="max-w-48 text-center font-mono text-lg tracking-[0.4em]" /></Field>
            <Button onClick={verify} loading={busy} disabled={code.length !== 6}>تأكيد التفعيل</Button>
          </div>
        </div>
      ) : (
        <Button onClick={start} loading={busy}>تفعيل التحقق الثنائي</Button>
      )}
    </div>
  );
}
