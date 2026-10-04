import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MessageCircleQuestion, ShieldAlert, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PE_SELECT, signedMedia, type ProgramExercise } from "@/lib/patient-data";
import { ExerciseArt } from "@/components/exercise/exercise-art";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DIFFICULTY_LEVEL, daysLabel, prescription } from "@/lib/format";

export const metadata: Metadata = { title: "تفاصيل التمرين" };

export default async function ExerciseDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["patient"], "patient");
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("program_exercises").select(PE_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const pe = data as unknown as ProgramExercise;
  const ev = pe.exercise_version;
  const [video, poster] = await Promise.all([signedMedia(ev.video_path), signedMedia(ev.thumbnail_path)]);
  return (
    <div className="space-y-5">
      <Link href="/patient/plan" className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> خطتي</Link>
      {video ? (
        <video className="aspect-[4/3] w-full rounded-[28px] bg-ink object-cover" src={video} poster={poster ?? undefined} controls playsInline preload="metadata" />
      ) : (
        <ExerciseArt region={ev.body_region} className="aspect-[4/3] w-full rounded-[28px] border border-line/60" label={ev.name} />
      )}
      <div>
        <h1 className="font-display text-[1.875rem] font-semibold leading-tight text-ink">{ev.name}</h1>
        {ev.name_en && <div className="text-sm text-text-3" dir="ltr">{ev.name_en}</div>}
        <div className="mt-4 flex flex-wrap gap-2">
          {prescription(pe).map((p) => <span key={p} className="rounded-full bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-100">{p}</span>)}
          <span className="rounded-full bg-sage-50 px-3.5 py-1.5 text-sm text-sage-700 ring-1 ring-sage-200">{daysLabel(pe.days_of_week)}</span>
        </div>
      </div>
      {pe.instructions && (
        <div className="rounded-[18px] border border-sage-200 bg-sage-50 p-4"><div className="text-xs font-medium text-sage-700">تعليمات مقدم الرعاية</div><p className="mt-1 leading-relaxed text-sage-800">{pe.instructions}</p></div>
      )}
      <Card>
        <h2 className="mb-4 font-semibold text-ink">طريقة الأداء</h2>
        <ol className="space-y-3">
          {ev.instructions.map((s, n) => (
            <li key={n} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sand-100 text-xs font-semibold text-text-2">{n + 1}</span><span className="leading-relaxed">{s}</span></li>
          ))}
        </ol>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line-soft pt-4 text-sm">
          <div><dt className="text-text-2">الوضعية</dt><dd className="mt-0.5 text-ink">{ev.position ?? "—"}</dd></div>
          <div><dt className="text-text-2">الأدوات</dt><dd className="mt-0.5 text-ink">{ev.equipment.length ? ev.equipment.join("، ") : "لا يلزم"}</dd></div>
          <div><dt className="text-text-2">المستوى</dt><dd className="mt-0.5 text-ink">{ev.difficulty ? DIFFICULTY_LEVEL[ev.difficulty] : "—"}</dd></div>
        </dl>
      </Card>
      {ev.safety_notes && <div className="flex gap-3 rounded-[18px] border border-clay-200 bg-clay-50 p-4 text-clay-700"><ShieldAlert size={19} className="mt-0.5 shrink-0" /><div><div className="font-semibold">تنبيهات السلامة</div><p className="mt-0.5 leading-relaxed">{ev.safety_notes}</p></div></div>}
      {ev.contraindications && <div className="flex gap-3 rounded-[18px] border border-danger/20 bg-danger-bg p-4 text-danger-fg"><TriangleAlert size={19} className="mt-0.5 shrink-0" /><div><div className="font-semibold">موانع الاستخدام</div><p className="mt-0.5 leading-relaxed">{ev.contraindications}</p></div></div>}
      <p className="text-center text-xs text-text-3">لا يمكن تعديل الوصفة من حسابك — تواصل مع فريقك لأي تغيير.</p>
      <ButtonLink href={`/patient/messages/new?exercise=${pe.id}`} variant="secondary" block size="lg" icon={<MessageCircleQuestion size={19} />}>اسأل عن هذا التمرين</ButtonLink>
    </div>
  );
}
