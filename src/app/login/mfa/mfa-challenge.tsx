"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

export function MfaChallenge({ next }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const f = data?.totp?.find((x) => x.status === "verified");
      if (f) setFactorId(f.id);
      else router.replace(next || "/admin");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !ch) {
      setBusy(false);
      return setError("تعذّر بدء التحقق. حاول مجددًا.");
    }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
    setBusy(false);
    if (vErr) return setError("الرمز غير صحيح أو منتهي الصلاحية.");
    router.replace(next || "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      <Notice tone="info" icon={<ShieldCheck size={18} />}>أدخل الرمز المكوّن من ٦ أرقام من تطبيق المصادقة على جوالك.</Notice>
      <Field label="رمز التحقق الثنائي" htmlFor="totp" error={error}>
        <Input id="totp" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-14 text-center font-mono text-2xl tracking-[0.5em]" />
      </Field>
      <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6 || !factorId}>تحقق</Button>
    </form>
  );
}
