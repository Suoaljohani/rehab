"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pencil, Save, Send } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { publishAnnouncement, saveAnnouncement, saveMessageTemplate } from "@/lib/actions/admin";
import { updateAnnouncement, updateMessageTemplate } from "@/lib/actions/manage";
import { Dialog } from "@/components/ui/overlay";

export function AnnouncementForm() {
  const [state, action] = useActionState(saveAnnouncement, null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (state?.ok) { toast({ tone: "success", title: state.message ?? "تم" }); router.refresh(); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <Field label="العنوان" htmlFor="at"><Input id="at" name="title" required /></Field>
      <Field label="النص" htmlFor="ab"><Textarea id="ab" name="body" rows={4} required /></Field>
      <Field label="الجمهور" htmlFor="aa"><Select id="aa" name="audience"><option value="all">الجميع</option><option value="patients">المراجعون</option><option value="staff">الموظفون</option></Select></Field>
      <div className="flex justify-end gap-2"><SubmitButton variant="secondary" icon={<Save size={16} />}>حفظ كمسودة</SubmitButton><SubmitButton name="publish" value="1" icon={<Megaphone size={16} />}>نشر وإشعار</SubmitButton></div>
    </form>
  );
}

export function PublishButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return <Button size="sm" variant="secondary" loading={pending} icon={<Send size={14} />} onClick={() => start(async () => { const r = await publishAnnouncement(id); if (!r.ok) toast({ tone: "danger", title: "تعذّر النشر", body: r.error }); else { toast({ tone: "success", title: `وصل الإعلان إلى ${r.data} مستخدم` }); router.refresh(); } })}>نشر</Button>;
}

export function TemplateMsgForm() {
  const [state, action] = useActionState(saveMessageTemplate, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok && <Notice tone="danger">{state.error}</Notice>}
      <div className="grid grid-cols-2 gap-3"><Field label="الاسم" htmlFor="tn"><Input id="tn" name="name" required /></Field><Field label="التصنيف" htmlFor="tc"><Select id="tc" name="category"><option value="general">عام</option><option value="appointment">موعد</option><option value="program">برنامج</option></Select></Field></div>
      <Field label="النص" htmlFor="tb"><Textarea id="tb" name="body" rows={3} required /></Field>
      <div className="flex justify-end"><SubmitButton size="sm">إضافة القالب</SubmitButton></div>
    </form>
  );
}

export function AnnouncementEdit({ ann }: { ann: { id: string; title: string; body: string; audience: string } }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(ann);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => { setV(ann); setErr(null); setOpen(true); }} className="grid size-8 place-items-center rounded-full text-text-2 hover:bg-sand-100 hover:text-ink" aria-label={`تعديل ${ann.title}`}><Pencil size={15} /></button>
      <Dialog open={open} onClose={() => setOpen(false)} title="تعديل الإعلان" description="التعديل يغيّر نص الإعلان في المنصة. الإشعارات المرسلة سابقًا لا تتغير."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button loading={pending} icon={<Save size={16} />} onClick={() => start(async () => { const r = await updateAnnouncement(ann.id, v); if (!r.ok) return setErr(r.error); toast({ tone: "success", title: r.message ?? "تم" }); setOpen(false); router.refresh(); })}>حفظ</Button></>}>
        <div className="space-y-4">
          {err && <Notice tone="danger">{err}</Notice>}
          <Field label="العنوان" htmlFor={`ae-t-${ann.id}`}><Input id={`ae-t-${ann.id}`} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
          <Field label="النص" htmlFor={`ae-b-${ann.id}`}><Textarea id={`ae-b-${ann.id}`} rows={4} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></Field>
          <Field label="الجمهور" htmlFor={`ae-a-${ann.id}`}><Select id={`ae-a-${ann.id}`} value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value })}><option value="all">الجميع</option><option value="patients">المراجعون</option><option value="staff">الموظفون</option></Select></Field>
        </div>
      </Dialog>
    </>
  );
}

export function TemplateMsgEdit({ tpl }: { tpl: { id: string; name: string; body: string; category: string } }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(tpl);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => { setV(tpl); setErr(null); setOpen(true); }} className="grid size-8 place-items-center rounded-full text-text-2 hover:bg-sand-100 hover:text-ink" aria-label={`تعديل ${tpl.name}`}><Pencil size={15} /></button>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" title="تعديل قالب الرسالة"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button loading={pending} icon={<Save size={16} />} onClick={() => start(async () => { const r = await updateMessageTemplate(tpl.id, v); if (!r.ok) return setErr(r.error); toast({ tone: "success", title: r.message ?? "تم" }); setOpen(false); router.refresh(); })}>حفظ</Button></>}>
        <div className="space-y-4">
          {err && <Notice tone="danger">{err}</Notice>}
          <Field label="الاسم" htmlFor={`te-n-${tpl.id}`}><Input id={`te-n-${tpl.id}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="التصنيف" htmlFor={`te-c-${tpl.id}`}><Select id={`te-c-${tpl.id}`} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}><option value="general">عام</option><option value="appointment">موعد</option><option value="program">برنامج</option></Select></Field>
          <Field label="النص" htmlFor={`te-b-${tpl.id}`}><Textarea id={`te-b-${tpl.id}`} rows={4} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></Field>
        </div>
      </Dialog>
    </>
  );
}
