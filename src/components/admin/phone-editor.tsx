"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { digitsOnly } from "@/lib/identity";
import { updatePatientPhone } from "@/lib/actions/admin";

export function PhoneEditor({ patientId, phone }: { patientId: string; phone: string | null }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const valid = /^05\d{8}$/.test(v);
  return (
    <>
      <span className="inline-flex items-center gap-2">
        <span dir="ltr">{phone ?? "—"}</span>
        <button type="button" onClick={() => { setV(phone ?? ""); setError(null); setOpen(true); }} className="grid size-7 place-items-center rounded-full text-text-2 hover:bg-sand-100 hover:text-ink" aria-label="تعديل رقم الجوال"><Pencil size={13} /></button>
      </span>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title="تعديل رقم الجوال" description="إليه تُرسل رموز دخول المراجع. يُسجَّل التعديل في سجل التدقيق."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button disabled={!valid || v === phone} loading={pending} icon={<Smartphone size={16} />}
          onClick={() => start(async () => { const r = await updatePatientPhone(patientId, v); if (!r.ok) return setError(r.error); toast({ tone: "success", title: r.message ?? "تم" }); setOpen(false); router.refresh(); })}>حفظ الرقم</Button></>}>
        <div className="space-y-3">
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="رقم الجوال" htmlFor="pp" hint="بالصيغة 05XXXXXXXX — رقم خاص بالمراجع، لا يُشارك مع مراجع آخر." error={v && !valid ? "صيغة غير صحيحة." : undefined}>
            <Input id="pp" dir="ltr" inputMode="tel" maxLength={10} value={v} onChange={(e) => { setV(digitsOnly(e.target.value).slice(0, 10)); setError(null); }} className="text-end font-mono" />
          </Field>
          <p className="text-xs text-text-2">تحقّق من الرقم مع المراجع شخصيًا قبل الحفظ — أي شخص يملك هذا الجوال يستطيع الدخول إلى ملفه.</p>
        </div>
      </Dialog>
    </>
  );
}
