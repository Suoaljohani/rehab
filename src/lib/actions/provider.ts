"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<ActionResult<T>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: humanError(error) };
  return { ok: true, data: data as T };
}
const rp = (episodeId?: string) => {
  revalidatePath("/provider");
  if (episodeId) revalidatePath(`/provider/patients/${episodeId}`);
};
const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));
const str = (v: FormDataEntryValue | null) => (v === null ? null : String(v).trim() || null);

// ---------- attention ----------
export async function resolveFlag(flagId: string, note?: string, episodeId?: string) {
  const r = await rpc("resolve_flag", { p_flag: flagId, p_note: note ?? null });
  rp(episodeId);
  return r;
}
export async function acknowledgeIssue(issueId: string, status: "acknowledged" | "resolved", episodeId?: string) {
  const r = await rpc("acknowledge_issue", { p_issue: issueId, p_status: status });
  rp(episodeId);
  return r;
}

// ---------- episode ----------
export async function setEpisodeStatus(episodeId: string, status: string, reason?: string) {
  const r = await rpc("set_episode_status", { p_episode: episodeId, p_status: status, p_reason: reason ?? null });
  rp(episodeId);
  return r;
}

// ---------- clinical notes ----------
export async function saveNote(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const episodeId = String(fd.get("episode_id"));
  const id = str(fd.get("id"));
  const kind = String(fd.get("kind") || "session");
  const row = kind === "internal"
    ? { internal_note: str(fd.get("internal_note")), note_date: str(fd.get("note_date")) ?? undefined }
    : {
        note_date: str(fd.get("note_date")) ?? undefined,
        session_type: str(fd.get("session_type")),
        pain_score: num(fd.get("pain_score")),
        patient_report: str(fd.get("patient_report")),
        functional_observation: str(fd.get("functional_observation")),
        interventions: str(fd.get("interventions")),
        progress: str(fd.get("progress")),
        plan: str(fd.get("plan")),
        internal_note: str(fd.get("internal_note")),
      };
  if (kind === "internal" && !row.internal_note) return { ok: false, error: "اكتب نص الملاحظة." };
  const { error } = id
    ? await supabase.from("clinical_notes").update(row).eq("id", id)
    : await supabase.from("clinical_notes").insert({ ...row, kind, episode_id: episodeId, author_id: user!.id });
  if (error) return { ok: false, error: humanError(error) };
  rp(episodeId);
  return { ok: true, message: id ? "تم تحديث الملاحظة وحفظ النسخة السابقة." : "تم حفظ الملاحظة." };
}

// ---------- goals & outcomes ----------
export async function saveGoal(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const episodeId = String(fd.get("episode_id"));
  const id = str(fd.get("id"));
  const row = {
    title: str(fd.get("title")) ?? "",
    baseline: num(fd.get("baseline")),
    target: num(fd.get("target")),
    current_value: num(fd.get("current_value")),
    unit: str(fd.get("unit")),
    due_date: str(fd.get("due_date")),
    status: str(fd.get("status")) ?? "active",
  };
  if (!row.title) return { ok: false, error: "اكتب عنوان الهدف." };
  const { error } = id
    ? await supabase.from("goals").update(row).eq("id", id)
    : await supabase.from("goals").insert({ ...row, episode_id: episodeId, created_by: user!.id });
  if (error) return { ok: false, error: humanError(error) };
  rp(episodeId);
  return { ok: true, message: "تم حفظ الهدف." };
}

export async function addOutcome(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const episodeId = String(fd.get("episode_id"));
  const value = num(fd.get("value"));
  const measure = str(fd.get("measure"));
  if (!measure || value === null || Number.isNaN(value)) return { ok: false, error: "أدخل المقياس والقيمة." };
  const { error } = await supabase.from("outcomes").insert({ episode_id: episodeId, measure, value, unit: str(fd.get("unit")), note: str(fd.get("note")), source: "provider", recorded_by: user!.id });
  if (error) return { ok: false, error: humanError(error) };
  rp(episodeId);
  return { ok: true, message: "تم تسجيل القياس." };
}

// ---------- programs ----------
export async function createProgram(_: unknown, fd: FormData): Promise<ActionResult> {
  const episodeId = String(fd.get("episode_id"));
  const r = await rpc<string>("create_home_program", {
    p_episode: episodeId,
    p_title: String(fd.get("title") || ""),
    p_start: String(fd.get("start_date")),
    p_end: String(fd.get("end_date")),
    p_template: str(fd.get("template_id")),
    p_instructions: str(fd.get("instructions")),
  });
  if (!r.ok) return r;
  redirect(`/provider/programs/${r.data}`);
}

export async function reviseProgram(programId: string) {
  const r = await rpc<string>("create_program_revision", { p_program: programId });
  if (!r.ok) return r;
  redirect(`/provider/programs/${programId}`);
}

export async function duplicateProgram(programId: string) {
  const r = await rpc<string>("duplicate_program", { p_program: programId, p_episode: null });
  if (!r.ok) return r;
  redirect(`/provider/programs/${r.data}`);
}

export async function setProgramStatus(programId: string, status: string, reason?: string, episodeId?: string) {
  const r = await rpc("set_program_status", { p_program: programId, p_status: status, p_reason: reason ?? null });
  rp(episodeId);
  return r;
}

export async function discardDraft(versionId: string, programId: string) {
  const r = await rpc("discard_program_draft", { p_version: versionId });
  revalidatePath(`/provider/programs/${programId}`);
  return r;
}

export async function addProgramExercise(versionId: string, exerciseId: string) {
  return rpc<string>("add_program_exercise", { p_version: versionId, p_exercise: exerciseId });
}

export type PrescriptionPatch = Partial<{
  reps: number | null; sets: number | null; hold_sec: number | null; duration_sec: number | null; schedule_type: string;
  days_of_week: number[]; specific_dates: string[]; interval_days: number | null; start_date: string | null; end_date: string | null;
  instructions: string | null; is_required: boolean; request_feedback: boolean; order_index: number;
}>;

export async function updatePrescription(peId: string, patch: PrescriptionPatch): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("program_exercises").update(patch).eq("id", peId);
  if (error) return { ok: false, error: humanError(error) };
  return { ok: true };
}

export async function removeProgramExercise(peId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("program_exercises").delete().eq("id", peId);
  if (error) return { ok: false, error: humanError(error) };
  return { ok: true };
}

export async function reorderProgramExercises(order: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  for (let i = 0; i < order.length; i++) {
    const { error } = await supabase.from("program_exercises").update({ order_index: i + 1 }).eq("id", order[i]);
    if (error) return { ok: false, error: humanError(error) };
  }
  return { ok: true };
}

export async function updateProgramMeta(programId: string, versionId: string, meta: { title?: string; start_date?: string; end_date?: string; instructions?: string | null }): Promise<ActionResult> {
  const supabase = await createClient();
  if (meta.instructions !== undefined) {
    const { error } = await supabase.from("program_versions").update({ instructions: meta.instructions }).eq("id", versionId);
    if (error) return { ok: false, error: humanError(error) };
  }
  const p: Record<string, unknown> = {};
  if (meta.title !== undefined) p.title = meta.title;
  if (meta.start_date) p.start_date = meta.start_date;
  if (meta.end_date) p.end_date = meta.end_date;
  if (meta.instructions !== undefined) p.instructions = meta.instructions;
  if (Object.keys(p).length) {
    // only a never-published (draft) program may change its own dates/title — RLS enforces this
    const { error } = await supabase.from("home_programs").update(p).eq("id", programId).eq("status", "draft");
    if (error) return { ok: false, error: humanError(error) };
  }
  return { ok: true };
}

export async function publishProgram(versionId: string, effective: string | null, summary: string | null, episodeId: string) {
  const r = await rpc<{ version: number; effective_date: string; items: number }>("publish_program_version", { p_version: versionId, p_effective: effective, p_summary: summary });
  if (r.ok) rp(episodeId);
  return r;
}

// ---------- messaging ----------
export async function startStaffThread(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = str(fd.get("body"));
  if (!body) return { ok: false, error: "اكتب نص الرسالة." };
  const { data: t, error } = await supabase.from("message_threads").insert({
    patient_id: String(fd.get("patient_id")), episode_id: str(fd.get("episode_id")), subject: str(fd.get("subject")) ?? "رسالة من فريق رعايتك",
    category: String(fd.get("category") || "general"), created_by: user!.id,
  }).select("id").single();
  if (error) return { ok: false, error: humanError(error) };
  const { error: e2 } = await supabase.from("messages").insert({ thread_id: t.id, sender_id: user!.id, body });
  if (e2) return { ok: false, error: humanError(e2) };
  redirect(`/provider/messages/${t.id}`);
}

// ---------- appointments ----------
export async function setAppointmentStatus(id: string, status: string, note?: string) {
  const r = await rpc("set_appointment_status", { p_appointment: id, p_status: status, p_note: note ?? null });
  revalidatePath("/provider/calendar");
  revalidatePath("/provider");
  revalidatePath("/admin/appointments");
  return r;
}
