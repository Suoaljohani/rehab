"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ListPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { handleChange, saveWaitlist, setApptStatus, setWaitlistStatus, updateRequest } from "@/lib/actions/admin";
import { APPOINTMENT_STATUS, REQUEST_STATUS } from "@/lib/status";
import { WEEKDAYS_SHORT } from "@/lib/format";

export function RequestStatusForm({ id, status }: { id: string; status: string }) {
  const [s, setS] = useState(status);
  const [internal, setInternal] = useState("");
  const [pub, setPub] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-3">
      <Field label="تحديث الحالة" htmlFor="rs"><Select id="rs" value={s} onChange={(e) => setS(e.target.value)}>{Object.entries(REQUEST_STATUS).filter(([k]) => k !== "scheduled").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
      <Field label="رسالة تظهر للمراجع عند المتابعة" htmlFor="rp" hint={s === "rejected" ? "إلزامية عند الرفض." : undefined}><Textarea id="rp" rows={2} value={pub} onChange={(e) => setPub(e.target.value)} /></Field>
      <Field label="ملاحظة داخلية" htmlFor="ri"><Textarea id="ri" rows={2} value={internal} onChange={(e) => setInternal(e.target.value)} /></Field>
      <Button block loading={pending} onClick={() => start(async () => {
        const r = await updateRequest(id, s, internal, pub);
        if (!r.ok) return toast({ tone: "danger", title: "تعذّر التحديث", body: r.error });
        toast({ tone: "success", title: "تم تحديث الطلب" }); setInternal(""); setPub(""); router.refresh();
      })}>حفظ</Button>
    </div>
  );
}

export function ApptStatusMenu({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <select aria-label="تغيير حالة الموعد" disabled={pending} value={status} onChange={(e) => start(async () => {
      const r = await setApptStatus(id, e.target.value);
      if (!r.ok) toast({ tone: "danger", title: "تعذّر التحديث", body: r.error }); else router.refresh();
    })} className="h-8 rounded-[10px] border border-line bg-surface px-2 text-xs">
      {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

export function ChangeDecision({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState<null | "approved" | "declined">(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <div className="flex gap-1.5">
        <Button size="sm" variant="sage" icon={<Check size={14} />} onClick={() => setOpen("approved")}>موافقة</Button>
        <Button size="sm" variant="quiet" icon={<X size={14} />} onClick={() => setOpen("declined")}>رفض</Button>
      </div>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open === "approved" ? "الموافقة على الطلب" : "رفض الطلب"} size="sm"
        description={open === "approved" ? "سيُحدَّث الموعد ويُشعر المراجع. لإعادة الجدولة أنشئ موعدًا جديدًا." : "سيُشعر المراجع بالقرار."}
        footer={<><Button variant="ghost" onClick={() => setOpen(null)}>إلغاء</Button><Button loading={pending} onClick={() => start(async () => {
          const r = await handleChange(id, open!, note);
          if (!r.ok) return toast({ tone: "danger", title: "تعذّر التنفيذ", body: r.error });
          setOpen(null); router.refresh();
        })}>تأكيد</Button></>}>
        <Field label="ملاحظة للمراجع" htmlFor="cn"><Textarea id="cn" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Dialog>
    </>
  );
}

export function WaitlistForm({ specialties }: { specialties: { code: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveWaitlist, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) { setOpen(false); router.refresh(); } }, [state, router]);
  return (
    <>
      <Button size="sm" icon={<ListPlus size={15} />} onClick={() => setOpen(true)}>إضافة لقائمة الانتظار</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة لقائمة الانتظار" description="لا يحدد النظام أولوية سريرية تلقائيًا دون قواعد معتمدة.">
        <form action={action} className="space-y-4">
          {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="الاسم" htmlFor="wn"><Input id="wn" name="full_name" required /></Field>
            <Field label="الجوال" htmlFor="wp"><Input id="wp" name="phone" dir="ltr" /></Field>
            <Field label="الخدمة" htmlFor="ws"><Select id="ws" name="specialty_code">{specialties.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></Field>
            <Field label="الوقت المفضل" htmlFor="wt"><Input id="wt" name="preferred_time" placeholder="صباحًا" /></Field>
            <Field label="الأولوية (حسب السياسة المعتمدة)" htmlFor="wpr"><Select id="wpr" name="priority"><option value="routine">اعتيادية</option><option value="soon">قريبًا</option><option value="priority">أولوية</option></Select></Field>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium text-ink">الأيام المفضلة</legend><div className="flex flex-wrap gap-2">{WEEKDAYS_SHORT.map((d, i) => <label key={d} className="flex items-center gap-1.5 rounded-full bg-sand-50 px-3 py-1.5 text-sm ring-1 ring-sand-200"><input type="checkbox" name="preferred_days" value={i} />{d}</label>)}</div></fieldset>
          <Field label="ملاحظات" htmlFor="wno"><Textarea id="wno" name="notes" rows={2} /></Field>
          <div className="flex justify-end"><SubmitButton>إضافة</SubmitButton></div>
        </form>
      </Dialog>
    </>
  );
}

export function WaitlistStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select aria-label="الحالة" disabled={pending} value={status} onChange={(e) => start(async () => { await setWaitlistStatus(id, e.target.value); router.refresh(); })} className="h-8 rounded-[10px] border border-line bg-surface px-2 text-xs">
      <option value="waiting">بالانتظار</option><option value="offered">عُرض موعد</option><option value="scheduled">تمت الجدولة</option><option value="removed">أُزيل</option>
    </select>
  );
}
