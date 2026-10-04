import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadExercise } from "@/lib/exercise-data";
import { ExerciseSummary, ReviewTrail, VersionHistory } from "@/components/exercise/exercise-detail";
import { ExerciseForm, MediaUploader } from "@/components/exercise/exercise-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EXERCISE_STATUS } from "@/lib/status";
import { LifecycleActions, ReviewPanel } from "./studio-actions";

export const metadata: Metadata = { title: "Exercise Studio" };

export default async function StudioExercise({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(["content_reviewer", "supervisor", "admin", "super_admin"]);
  const { id } = await params;
  const d = await loadExercise(id);
  if (!d || !d.latest) notFound();
  const latest = d.latest;
  const editable = ["draft", "changes_requested", "rejected"].includes(latest.status);
  const inReview = latest.status === "in_review";
  const isAdmin = ["admin", "super_admin"].includes(viewer.role);
  const canArchive = ["content_reviewer", "admin", "super_admin"].includes(viewer.role);
  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/admin/exercises" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> Exercise Studio</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3"><h1 className="font-display text-[2rem] font-semibold text-ink">{latest.name}</h1><StatusBadge map={EXERCISE_STATUS} value={d.ex.status} /></div>
          <div className="text-sm text-text-2"><span dir="ltr">{d.ex.code}</span> · أحدث نسخة v{latest.version} ({EXERCISE_STATUS[latest.status]?.label}) · مستخدم في {d.usage} وصفة</div>
        </div>
        <LifecycleActions exerciseId={d.ex.id} status={d.ex.status} canArchive={canArchive} isAdmin={isAdmin} hasNewer={latest.id !== d.ex.current_version_id && !!d.ex.current_version_id} usage={d.usage} />
      </div>
      {d.ex.status === "archived" && <Notice tone="neutral" className="mb-5">مؤرشف — {d.ex.archive_reason}</Notice>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {editable ? (
            <Card className="p-6">
              <CardHeader title={`تحرير المسودة — النسخة ${latest.version}`} description="الحقول قابلة للتعديل فقط قبل الاعتماد. المحتوى المعتمد لا يُعدّل — يُنشأ له نسخة جديدة." />
              {latest.review_comment && latest.status !== "draft" && <Notice tone="warning" className="mb-5" title="ملاحظات المراجعة">{latest.review_comment}</Notice>}
              <ExerciseForm mode="edit" versionId={latest.id} exerciseId={d.ex.id} initial={latest} specialties={d.specialties} back="/admin/exercises" />
            </Card>
          ) : (
            <ExerciseSummary v={inReview ? latest : d.shown!} videoUrl={inReview ? d.latestVideo : d.videoUrl} specialtyName={d.specialtyName} />
          )}
        </div>
        <div className="space-y-6">
          {inReview && (
            <Card tone="soft" className="p-5">
              <CardHeader title={`مراجعة النسخة ${latest.version}`} description={`أرسلها ${latest.creator?.full_name ?? "—"} للمراجعة.`} />
              {["content_reviewer", "admin", "super_admin", "supervisor"].includes(viewer.role) ? <ReviewPanel versionId={latest.id} exerciseId={d.ex.id} own={latest.created_by === viewer.id} /> : <p className="text-sm text-text-2">بانتظار مراجع المحتوى.</p>}
            </Card>
          )}
          {editable && <Card><CardHeader title="الوسائط" /><MediaUploader versionId={latest.id} exerciseId={d.ex.id} videoPath={latest.video_path} thumbPath={latest.thumbnail_path} videoUrl={d.latestVideo} /></Card>}
          <VersionHistory versions={d.versions} currentId={d.ex.current_version_id} />
          <ReviewTrail events={d.events} />
        </div>
      </div>
    </div>
  );
}
