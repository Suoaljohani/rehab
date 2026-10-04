"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";

function parseList(v: FormDataEntryValue | null) {
  return String(v ?? "").split(/\n|،|,/).map((s) => s.trim()).filter(Boolean);
}
function payload(fd: FormData) {
  const n = (k: string) => (fd.get(k) === null || fd.get(k) === "" ? null : Number(fd.get(k)));
  const s = (k: string) => (String(fd.get(k) ?? "").trim() || null);
  return {
    name: s("name") ?? "", name_en: s("name_en"), description: s("description"),
    instructions: String(fd.get("instructions") ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
    specialty_code: s("specialty_code"), body_region: s("body_region"), category: s("category"), exercise_type: s("exercise_type"),
    difficulty: s("difficulty"), equipment: parseList(fd.get("equipment")), position: s("position"),
    est_duration_sec: n("est_duration_sec") ?? 120, default_reps: n("default_reps"), default_sets: n("default_sets"),
    default_hold_sec: n("default_hold_sec"), default_duration_sec: n("default_duration_sec"),
    safety_notes: s("safety_notes"), contraindications: s("contraindications"), tags: parseList(fd.get("tags")), change_note: s("change_note"),
  };
}

export async function createExercise(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const back = String(fd.get("back") || "/admin/exercises");
  const { data, error } = await supabase.rpc("create_exercise", { p: payload(fd) });
  if (error) return { ok: false, error: humanError(error) };
  redirect(`${back}/${data}`);
}

export async function saveExerciseDraft(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const versionId = String(fd.get("version_id"));
  const p = payload(fd);
  if (!p.name) return { ok: false, error: "اكتب اسم التمرين." };
  const { error } = await supabase.from("exercise_versions").update(p).eq("id", versionId);
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/admin/exercises");
  if (fd.get("submit") === "1") {
    const { error: e2 } = await supabase.rpc("submit_exercise_version", { p_version: versionId });
    if (e2) return { ok: false, error: humanError(e2) };
    return { ok: true, message: "أُرسل التمرين للمراجعة." };
  }
  return { ok: true, message: "تم حفظ المسودة." };
}

export async function setExerciseMedia(versionId: string, media: { video_path?: string | null; thumbnail_path?: string | null; captions_path?: string | null; video_duration_sec?: number | null }): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("exercise_versions").update({ ...media, media_status: media.video_path ? "ready" : "none" }).eq("id", versionId);
  if (error) return { ok: false, error: humanError(error) };
  return { ok: true };
}

export async function reviewExercise(versionId: string, decision: string, comment: string, exerciseId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_exercise_version", { p_version: versionId, p_decision: decision, p_comment: comment || null });
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath(`/admin/exercises/${exerciseId}`);
  revalidatePath("/admin/exercises");
  return { ok: true };
}

export async function newExerciseVersion(exerciseId: string, safety: boolean, note: string, base: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("new_exercise_version", { p_exercise: exerciseId, p_safety: safety, p_note: note || null });
  if (error) return { ok: false as const, error: humanError(error) };
  redirect(`${base}/${exerciseId}?edit=1`);
}

export async function archiveExercise(exerciseId: string, reason: string, restore = false): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_exercise", { p_exercise: exerciseId, p_reason: reason, p_restore: restore });
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath(`/admin/exercises/${exerciseId}`);
  return { ok: true };
}

export async function applySafetyUpdate(exerciseId: string, reason: string): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_safety_update", { p_exercise: exerciseId, p_reason: reason });
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath(`/admin/exercises/${exerciseId}`);
  return { ok: true, data: data as number };
}
