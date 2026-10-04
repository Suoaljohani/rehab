"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<ActionResult<T>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: humanError(error) };
  return { ok: true, data: data as T };
}

export async function startSession(programId: string) {
  return rpc<string>("start_home_session", { p_program: programId });
}

export async function completeExercise(itemId: string, pain?: number | null, difficulty?: string | null) {
  const r = await rpc<{ done: number; total: number; already?: boolean }>("complete_exercise", { p_item: itemId, p_pain: pain ?? null, p_difficulty: difficulty ?? null });
  revalidatePath("/patient");
  return r;
}

export async function reportIssue(itemId: string, reason: string, comment?: string) {
  return rpc<string>("report_exercise_issue", { p_item: itemId, p_reason: reason, p_comment: comment ?? null });
}

export async function finishSession(programId: string, feeling?: string | null, note?: string | null) {
  const r = await rpc("finish_home_session", { p_program: programId, p_feeling: feeling ?? null, p_note: note ?? null });
  revalidatePath("/patient");
  return r;
}

export async function startThread(_: unknown, fd: FormData): Promise<ActionResult<string>> {
  const r = await rpc<string>("patient_start_thread", {
    p_category: String(fd.get("category") || "general"),
    p_subject: String(fd.get("subject") || ""),
    p_body: String(fd.get("body") || ""),
    p_program_exercise: (fd.get("program_exercise") as string) || null,
  });
  if (r.ok) revalidatePath("/patient/messages");
  return r;
}

export async function sendMessage(threadId: string, body: string): Promise<ActionResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "اكتب نص الرسالة." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("messages").insert({ thread_id: threadId, sender_id: user!.id, body: text.slice(0, 4000) });
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath(`/patient/messages/${threadId}`);
  revalidatePath(`/provider/messages/${threadId}`);
  return { ok: true };
}

export async function markThreadRead(threadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("thread_reads").upsert({ thread_id: threadId, user_id: user.id, last_read_at: new Date().toISOString() });
}

export async function setThreadArchived(threadId: string, archived: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "انتهت الجلسة." };
  await supabase.from("thread_reads").upsert({ thread_id: threadId, user_id: user.id, archived, last_read_at: new Date().toISOString() });
  revalidatePath("/patient/messages");
  revalidatePath("/provider/messages");
  return { ok: true as const };
}

export async function requestAppointmentChange(appointmentId: string, kind: "change" | "cancel", reason: string, preferred?: string) {
  const r = await rpc("request_appointment_change", { p_appointment: appointmentId, p_kind: kind, p_reason: reason, p_preferred: preferred ?? null });
  revalidatePath("/patient/appointments");
  return r;
}

export async function updatePreferences(prefs: { exercise: boolean; appointments: boolean; messages: boolean; announcements: boolean }) {
  return rpc("update_notification_preferences", {
    p_exercise: prefs.exercise, p_appointments: prefs.appointments, p_messages: prefs.messages, p_announcements: prefs.announcements,
  });
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function trackEvent(event: string, props?: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("analytics_events").insert({ user_id: user.id, event, props: props ?? null });
}
