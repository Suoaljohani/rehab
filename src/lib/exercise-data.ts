import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedMedia } from "@/lib/patient-data";
import type { VersionRow } from "@/components/exercise/exercise-detail";

export async function loadExercise(id: string) {
  const supabase = await createClient();
  const { data: ex } = await supabase.from("exercises").select("id, code, status, current_version_id, latest_version_id, created_by, archive_reason, archived_at").eq("id", id).maybeSingle();
  if (!ex) return null;
  const [{ data: versions }, { data: events }, { data: specs }, { count: usage }] = await Promise.all([
    supabase.from("exercise_versions").select("*, creator:profiles!exercise_versions_created_by_fkey(full_name), reviewer:profiles!exercise_versions_reviewed_by_fkey(full_name)").eq("exercise_id", id).order("version"),
    supabase.from("exercise_review_events").select("id, action, comment, created_at, actor:profiles(full_name)").eq("exercise_id", id).order("created_at"),
    supabase.from("specialties").select("code, name"),
    supabase.from("program_exercises").select("id", { count: "exact", head: true }).eq("exercise_id", id),
  ]);
  const vs = (versions ?? []) as unknown as VersionRow[];
  const current = vs.find((v) => v.id === ex.current_version_id) ?? null;
  const latest = vs.find((v) => v.id === ex.latest_version_id) ?? vs[vs.length - 1];
  const shown = current ?? latest;
  const videoUrl = await signedMedia(shown?.video_path);
  const latestVideo = latest && latest.id !== shown?.id ? await signedMedia(latest.video_path) : videoUrl;
  return {
    ex, versions: vs, current, latest, shown, videoUrl, latestVideo, usage: usage ?? 0,
    events: (events ?? []) as unknown as { id: string; action: string; comment: string | null; created_at: string; actor: { full_name: string } | null }[],
    specialties: specs ?? [],
    specialtyName: (specs ?? []).find((s) => s.code === shown?.specialty_code)?.name,
  };
}
