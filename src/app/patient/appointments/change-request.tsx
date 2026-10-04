"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { requestAppointmentChange } from "@/lib/actions/patient";

export function ChangeRequest({ appointmentId, pending: alreadyPending }: { appointmentId: string; pending?: string | null }) {
  const [open, setOpen] = useState<null | "change" | "cancel">(null);
  const [reason, setReason] = useState("");
  const [pref, setPref] = useState("");
  const [busy, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (alreadyPending) return <span className="rounded-full bg-warning-bg px-3 py-1 text-xs font-medium text-warning-fg">طلب {alreadyPending === "cancel" ? "إلغاء" : "تغيير"} قيد المراجعة</span>;
  function submit() {
    if (!open) return;
    start(async () => {
      const r = await requestAppointmentChange(appointmentId, open, reason, pref);
      if (!r.ok) return toast({ tone: "danger", title: "تعذّر إرسال الطلب", body: r.error });
      toast({ tone: "success", title: "تم إرسال طلبك", body: "سيراجعه القسم ويتواصل معك." });
      setOpen(null);
      router.refresh();
    });
  }
  return (
    <>
      <div className="flex gap-2">
        <Button variant="quiet" size="sm" onClick={() => setOpen("change")}>طلب تغيير</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen("cancel")}>طلب إلغاء</Button>
      </div>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open === "cancel" ? "طلب إلغاء الموعد" : "طلب تغيير الموعد"}
        description="لا يتغير الجدول مباشرة — يراجع القسم طلبك ويؤكده معك."
        footer={<><Button variant="ghost" onClick={() => setOpen(null)}>تراجع</Button><Button onClick={submit} loading={busy}>إرسال الطلب</Button></>}>
        <div className="space-y-4">
          <Field label="السبب" htmlFor="reason"><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={600} /></Field>
          {open === "change" && <Field label="الوقت المفضل" htmlFor="pref" hint="مثال: الأحد أو الثلاثاء صباحًا"><Input id="pref" value={pref} onChange={(e) => setPref(e.target.value)} maxLength={200} /></Field>}
          {open === "cancel" && <Notice tone="warning">إلغاء الجلسات المتكرر قد يؤثر على تقدمك. فكّر في طلب التغيير بدلًا من الإلغاء.</Notice>}
        </div>
      </Dialog>
    </>
  );
}
