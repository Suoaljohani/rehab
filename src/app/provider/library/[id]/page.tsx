import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { loadExercise } from "@/lib/exercise-data";
import { ExerciseSummary, ReviewTrail, VersionHistory } from "@/components/exercise/exercise-detail";
import { ExerciseForm, MediaUploader } from "@/components/exercise/exercise-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EXERCISE_STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "تمرين" };

export default async function ProviderExercise({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  const { id } = await params;
  const d = await loadExercise(id);
  if (!d || !d.shown) notFound();
  const editable = d.latest && ["draft", "changes_requested", "rejected"].includes(d.latest.status) && d.latest.created_by === viewer.id;
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/provider/library" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> مكتبة التمارين</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-[2rem] font-semibold text-ink">{d.shown.name}</h1><div className="text-sm text-text-2"><span dir="ltr">{d.ex.code}</span> · {d.shown.name_en}</div></div>
        <StatusBadge map={EXERCISE_STATUS} value={d.ex.status} />
      </div>
      {d.ex.status === "archived" && <Notice tone="neutral" className="mb-5">هذا التمرين مؤرشف ولا يمكن إضافته لبرامج جديدة. يبقى ظاهرًا تاريخيًا في البرامج السابقة.</Notice>}
      {editable ? (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="p-6">
            {d.latest!.status === "changes_requested" && d.latest!.review_comment && <Notice tone="warning" className="mb-5" title="ملاحظات المراجعة">{d.latest!.review_comment}</Notice>}
            <ExerciseForm mode="edit" versionId={d.latest!.id} exerciseId={d.ex.id} initial={d.latest!} specialties={d.specialties} back="/provider/library" />
          </Card>
          <div className="space-y-5"><Card><CardHeader title="الوسائط" /><MediaUploader versionId={d.latest!.id} exerciseId={d.ex.id} videoPath={d.latest!.video_path} thumbPath={d.latest!.thumbnail_path} videoUrl={d.latestVideo} /></Card><ReviewTrail events={d.events} /></div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ExerciseSummary v={d.shown} videoUrl={d.videoUrl} specialtyName={d.specialtyName} />
          <div className="space-y-5"><VersionHistory versions={d.versions} currentId={d.ex.current_version_id} /><ReviewTrail events={d.events} /></div>
        </div>
      )}
    </div>
  );
}
