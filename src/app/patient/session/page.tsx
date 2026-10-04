import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getPrograms, getTodayItems, signedMedia } from "@/lib/patient-data";
import { SessionPlayer, type PlayerItem } from "@/components/patient/session-player";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "جلسة اليوم" };

export default async function SessionPage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const viewer = await requireRole(["patient"], "patient");
  const { program } = await searchParams;
  const [programs, all] = await Promise.all([getPrograms(viewer.patientId!), getTodayItems(viewer.patientId!)]);
  const prog = programs.find((p) => p.id === program) ?? programs.find((p) => p.status === "active");
  if (!prog) return <ErrorState kind="archived" title="لا يوجد برنامج نشط" description="لم نجد برنامجًا منزليًا نشطًا لك." action={<Link href="/patient" className={buttonClasses("primary")}>العودة</Link>} />;
  if (prog.status !== "active")
    return <ErrorState kind="archived" title="البرنامج غير متاح حاليًا" description={prog.status === "paused" ? "أوقف فريق رعايتك هذا البرنامج مؤقتًا." : "هذا البرنامج غير نشط."} action={<Link href="/patient" className={buttonClasses("primary")}>العودة</Link>} />;
  const its = all.filter((i) => i.program_id === prog.id);
  if (its.length === 0) return <EmptyState title="لا توجد تمارين مجدولة اليوم" description="استمتع بيوم الراحة." action={<Link href="/patient" className={buttonClasses("primary")}>العودة</Link>} />;

  const items: PlayerItem[] = await Promise.all(
    its.map(async (i) => {
      const pe = i.program_exercise;
      const ev = pe.exercise_version;
      const [videoUrl, posterUrl] = await Promise.all([signedMedia(ev.video_path), signedMedia(ev.thumbnail_path)]);
      return {
        id: i.id, status: i.status, name: ev.name, region: ev.body_region,
        reps: pe.reps, sets: pe.sets, hold_sec: pe.hold_sec, duration_sec: pe.duration_sec,
        providerNote: pe.instructions, steps: ev.instructions ?? [], safety: ev.safety_notes, requestFeedback: pe.request_feedback,
        videoUrl, posterUrl, estSec: ev.est_duration_sec ?? 120,
      };
    }),
  );
  return <SessionPlayer programId={prog.id} programTitle={prog.title} instructions={prog.instructions} items={items} />;
}
