"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, CheckCircle2, CopyPlus, MessageSquareWarning, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { applySafetyUpdate, archiveExercise, newExerciseVersion, reviewExercise } from "@/lib/actions/exercises";

export function ReviewPanel({ versionId, exerciseId, own }: { versionId: string; exerciseId: string; own: boolean }) {
  const [decision, setDecision] = useState<null | "approved" | "changes_requested" | "rejected">(null);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const L = { approved: "اعتماد", changes_requested: "طلب تعديل", rejected: "رفض" };
  return (
    <div className="space-y-3">
      {own ? <Notice tone="warning">أنت من أنشأ هذه النسخة — يجب أن يعتمدها مراجع آخر (فصل المهام).</Notice> : (
        <div className="grid gap-2">
          <Button variant="sage" icon={<CheckCircle2 size={17} />} onClick={() => setDecision("approved")}>اعتماد النسخة</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="quiet" icon={<MessageSquareWarning size={16} />} onClick={() => setDecision("changes_requested")}>طلب تعديل</Button>
            <Button variant="danger" icon={<XCircle size={16} />} onClick={() => setDecision("rejected")}>رفض</Button>
          </div>
        </div>
      )}
      <Dialog open={!!decision} onClose={() => setDecision(null)} title={decision ? L[decision] : ""}
        description={decision === "approved" ? "ستصبح هذه النسخة متاحة لمقدمي الرعاية فورًا. البرامج السابقة تبقى على نسخها." : "الملاحظة إلزامية وتصل إلى منشئ المحتوى."}
        footer={<><Button variant="ghost" onClick={() => setDecision(null)}>إلغاء</Button><Button loading={pending} disabled={decision !== "approved" && !comment.trim()} onClick={() => start(async () => {
          const r = await reviewExercise(versionId, decision!, comment, exerciseId);
          if (!r.ok) return toast({ tone: "danger", title: "تعذّر الحفظ", body: r.error });
          toast({ tone: "success", title: "سُجّل قرار المراجعة" }); setDecision(null); router.refresh();
        })}>تأكيد</Button></>}>
        <Field label={decision === "approved" ? "ملاحظة (اختياري)" : "الملاحظة"} htmlFor="rc"><Textarea id="rc" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      </Dialog>
    </div>
  );
}

export function LifecycleActions({ exerciseId, status, canArchive, isAdmin, hasNewer, usage }: { exerciseId: string; status: string; canArchive: boolean; isAdmin: boolean; hasNewer: boolean; usage: number }) {
  const [open, setOpen] = useState<null | "version" | "archive" | "restore" | "safety">(null);
  const [text, setText] = useState("");
  const [safety, setSafety] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; data?: unknown } | undefined>, ok: string) => start(async () => {
    const r = await fn();
    if (r && !r.ok) return toast({ tone: "danger", title: "تعذّر التنفيذ", body: r.error });
    toast({ tone: "success", title: ok }); setOpen(null); router.refresh();
  });
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "archived" && !hasNewer && <Button variant="secondary" size="sm" icon={<CopyPlus size={15} />} onClick={() => { setText(""); setOpen("version"); }}>نسخة جديدة</Button>}
      {status === "approved" && isAdmin && <Button variant="clay" size="sm" icon={<ShieldAlert size={15} />} onClick={() => { setText(""); setOpen("safety"); }}>تطبيق تحديث سلامة</Button>}
      {canArchive && status !== "archived" && <Button variant="ghost" size="sm" icon={<Archive size={15} />} onClick={() => { setText(""); setOpen("archive"); }}>أرشفة</Button>}
      {canArchive && status === "archived" && <Button variant="secondary" size="sm" icon={<ArchiveRestore size={15} />} onClick={() => { setText(""); setOpen("restore"); }}>استعادة</Button>}
      <Dialog open={!!open} onClose={() => setOpen(null)}
        title={{ version: "إنشاء نسخة جديدة", archive: "أرشفة التمرين", restore: "استعادة التمرين", safety: "تطبيق تحديث سلامة إلزامي" }[open ?? "version"]}
        description={open === "archive" ? `بدل الحذف: يبقى التمرين ظاهرًا تاريخيًا في ${usage} وصفة سابقة، ولا يمكن إضافته لبرامج جديدة.` : open === "safety" ? "تُنقل جميع الوصفات في البرامج النشطة إلى النسخة المعتمدة الحالية، مع سجل تدقيق كامل." : open === "version" ? "تُنسخ النسخة المعتمدة الحالية كمسودة للتعديل. البرامج الحالية لا تتأثر." : undefined}
        footer={<><Button variant="ghost" onClick={() => setOpen(null)}>إلغاء</Button><Button loading={pending} disabled={(open === "archive" || open === "safety") && !text.trim()} onClick={() => {
          if (open === "version") run(() => newExerciseVersion(exerciseId, safety, text, "/admin/exercises"), "أُنشئت مسودة نسخة جديدة");
          if (open === "archive") run(() => archiveExercise(exerciseId, text), "أُرشف التمرين");
          if (open === "restore") run(() => archiveExercise(exerciseId, text, true), "استُعيد التمرين");
          if (open === "safety") run(() => applySafetyUpdate(exerciseId, text), "طُبّق تحديث السلامة");
        }}>تأكيد</Button></>}>
        <div className="space-y-3">
          {open === "safety" && <Notice tone="warning">استخدم هذا الإجراء فقط عند وجود تعديل سلامة يجب أن يصل لكل المراجعين الحاليين.</Notice>}
          <Field label={open === "version" ? "ملاحظة التغيير" : "السبب"} htmlFor="lt"><Textarea id="lt" rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          {open === "version" && isAdmin && <Checkbox checked={safety} onChange={(e) => setSafety(e.target.checked)} label="هذه النسخة تحديث سلامة" description="يمكن بعد اعتمادها تطبيقها إلزاميًا على البرامج النشطة." />}
        </div>
      </Dialog>
    </div>
  );
}
