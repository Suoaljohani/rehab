"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Save, Send } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { publishAnnouncement, saveAnnouncement, saveMessageTemplate } from "@/lib/actions/admin";

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
