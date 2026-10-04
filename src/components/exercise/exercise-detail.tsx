import { ShieldAlert, TriangleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/stat";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExerciseArt } from "./exercise-art";
import { EXERCISE_STATUS } from "@/lib/status";
import { DIFFICULTY_LEVEL, REGION_LABEL, fDateTime, prescription } from "@/lib/format";

export type VersionRow = {
  id: string; version: number; status: string; name: string; name_en: string | null; description: string | null; instructions: string[]; body_region: string | null; specialty_code: string | null;
  category: string | null; exercise_type: string | null; difficulty: string | null; equipment: string[]; position: string | null; est_duration_sec: number; default_reps: number | null; default_sets: number | null;
  default_hold_sec: number | null; default_duration_sec: number | null; safety_notes: string | null; contraindications: string | null; tags: string[]; video_path: string | null; thumbnail_path: string | null;
  change_note: string | null; is_safety_update: boolean; created_at: string; created_by: string | null; review_comment: string | null; reviewed_at: string | null;
  creator?: { full_name: string } | null; reviewer?: { full_name: string } | null;
};

export function ExerciseSummary({ v, videoUrl, specialtyName }: { v: VersionRow; videoUrl: string | null; specialtyName?: string }) {
  return (
    <div className="space-y-5">
      {videoUrl ? <video src={videoUrl} controls preload="metadata" className="aspect-video w-full rounded-[24px] bg-ink" /> : <ExerciseArt region={v.body_region} className="aspect-video rounded-[24px] border border-line/60" label={v.name} />}
      <Card>
        <CardHeader title="طريقة الأداء" description={v.description ?? undefined} />
        <ol className="space-y-3">{v.instructions.map((s, i) => <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sand-100 text-xs font-semibold text-text-2">{i + 1}</span><span className="leading-relaxed">{s}</span></li>)}</ol>
      </Card>
      <Card>
        <CardHeader title="البيانات السريرية" />
        <DescriptionList columns={3} items={[
          { label: "التخصص", value: specialtyName ?? v.specialty_code }, { label: "منطقة الجسم", value: REGION_LABEL[v.body_region ?? ""] ?? v.body_region },
          { label: "المستوى", value: DIFFICULTY_LEVEL[v.difficulty ?? ""] }, { label: "الفئة", value: v.category }, { label: "الوضعية", value: v.position },
          { label: "الأدوات", value: v.equipment.length ? v.equipment.join("، ") : "بدون" }, { label: "الوصفة الافتراضية", value: prescription({ reps: v.default_reps, sets: v.default_sets, hold_sec: v.default_hold_sec, duration_sec: v.default_duration_sec }).join(" · ") || null },
          { label: "المدة التقديرية", value: `${Math.round(v.est_duration_sec / 60)} دقيقة` }, { label: "الكلمات المفتاحية", value: v.tags.join("، ") || null },
        ]} />
      </Card>
      {v.safety_notes && <div className="flex gap-3 rounded-[18px] border border-clay-200 bg-clay-50 p-4 text-clay-700"><ShieldAlert size={19} className="mt-0.5 shrink-0" /><div><div className="font-semibold">ملاحظات السلامة</div><p className="mt-0.5">{v.safety_notes}</p></div></div>}
      {v.contraindications && <div className="flex gap-3 rounded-[18px] border border-danger/20 bg-danger-bg p-4 text-danger-fg"><TriangleAlert size={19} className="mt-0.5 shrink-0" /><div><div className="font-semibold">موانع الاستخدام</div><p className="mt-0.5">{v.contraindications}</p></div></div>}
    </div>
  );
}

export function VersionHistory({ versions, currentId }: { versions: VersionRow[]; currentId: string | null }) {
  return (
    <Card>
      <CardHeader title="سجل النسخ" description="الوصفات تشير إلى النسخة المستخدمة وقت الوصف." />
      <ol className="space-y-3">{[...versions].sort((a, b) => b.version - a.version).map((v) => (
        <li key={v.id} className="rounded-[14px] border border-line-soft p-3">
          <div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink tabular">v{v.version}{v.id === currentId && <span className="ms-2 text-xs font-normal text-sage-700">الحالية</span>}</span><StatusBadge map={EXERCISE_STATUS} value={v.status} size="sm" /></div>
          <div className="mt-1 text-xs text-text-2">{v.creator?.full_name ?? "—"} · {fDateTime(v.created_at)}</div>
          {v.change_note && <div className="mt-1 text-xs text-text">{v.change_note}</div>}
          {v.is_safety_update && <div className="mt-1 text-xs font-medium text-clay-600">تحديث سلامة إلزامي</div>}
          {v.review_comment && <div className="mt-1 rounded-[8px] bg-sand-50 p-2 text-xs text-text-2">«{v.review_comment}» — {v.reviewer?.full_name}</div>}
        </li>
      ))}</ol>
    </Card>
  );
}

export function ReviewTrail({ events }: { events: { id: string; action: string; comment: string | null; created_at: string; actor: { full_name: string } | null }[] }) {
  const L: Record<string, string> = { created: "أُنشئ", submitted: "أُرسل للمراجعة", approved: "اعتُمد", changes_requested: "طُلب تعديل", rejected: "رُفض", archived: "أُرشف", restored: "استُعيد", safety_update: "طُبّق تحديث سلامة" };
  return (
    <Card>
      <CardHeader title="مسار الحوكمة" description="من أنشأ، ومن راجع، ومن اعتمد، وأي نسخة." />
      <ol className="relative space-y-3 border-s border-line ps-5">{events.map((e) => (
        <li key={e.id} className="relative"><span className="absolute -start-[25px] top-1.5 size-2.5 rounded-full bg-slate-400 ring-4 ring-surface" />
          <div className="text-sm"><b className="text-ink">{L[e.action] ?? e.action}</b> <span className="text-text-2">— {e.actor?.full_name ?? "النظام"}</span></div>
          {e.comment && <div className="text-xs text-text-2">«{e.comment}»</div>}
          <div className="text-[0.6875rem] text-text-3">{fDateTime(e.created_at)}</div>
        </li>
      ))}</ol>
    </Card>
  );
}
