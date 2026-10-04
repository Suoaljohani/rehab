import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

export type ExerciseVersion = {
  id: string; name: string; name_en: string | null; description: string | null; body_region: string | null; est_duration_sec: number;
  instructions: string[]; safety_notes: string | null; contraindications: string | null; video_path: string | null; thumbnail_path: string | null;
  equipment: string[]; position: string | null; difficulty: string | null; captions_path?: string | null;
};
export type ProgramExercise = {
  id: string; order_index: number; reps: number | null; sets: number | null; hold_sec: number | null; duration_sec: number | null;
  instructions: string | null; is_required: boolean; request_feedback: boolean; days_of_week: number[]; schedule_type: string;
  exercise_id: string; exercise_version: ExerciseVersion;
};
export type TodayItem = { id: string; status: string; scheduled_date: string; program_id: string; program_exercise: ProgramExercise };

export const PE_SELECT =
  "id, order_index, reps, sets, hold_sec, duration_sec, instructions, is_required, request_feedback, days_of_week, schedule_type, exercise_id, exercise_version:exercise_versions(id, name, name_en, description, body_region, est_duration_sec, instructions, safety_notes, contraindications, video_path, thumbnail_path, captions_path, equipment, position, difficulty)";

export const getTodayItems = cache(async (patientId: string, date?: string): Promise<TodayItem[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedule_items")
    .select(`id, status, scheduled_date, program_id, program_exercise:program_exercises(${PE_SELECT})`)
    .eq("patient_id", patientId)
    .eq("scheduled_date", date ?? todayISO())
    .in("status", ["scheduled", "completed"]);
  const items = (data ?? []) as unknown as TodayItem[];
  return items.sort((a, b) => a.program_exercise.order_index - b.program_exercise.order_index);
});

export const getPrograms = cache(async (patientId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("home_programs")
    .select("id, title, status, start_date, end_date, instructions, episode_id, current_version_id, paused_at, current_version:program_versions!hp_current_version_fk(id, version, effective_date, published_at, change_summary)")
    .eq("patient_id", patientId)
    .order("start_date", { ascending: false });
  return data ?? [];
});

export const getEpisodes = cache(async (patientId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("episodes")
    .select("id, code, title, status, start_date, end_date, main_goal, referral_reason, specialty:specialties(name), care_team:care_team_members(id, role, ended_at, provider:profiles!care_team_members_provider_id_fkey(id, full_name, staff:staff_profiles(title, specialty_code)))")
    .eq("patient_id", patientId)
    .order("start_date", { ascending: false });
  return data ?? [];
});

export const getNextAppointment = cache(async (patientId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, duration_min, location, status, specialty:specialties(name), provider:profiles!appointments_provider_id_fkey(full_name)")
    .eq("patient_id", patientId)
    .gte("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .in("status", ["confirmed", "pending_confirmation", "checked_in", "requested"])
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  return data;
});

export const getUnread = cache(async (userId: string, patientId: string) => {
  const supabase = await createClient();
  const [{ data: threads }, { data: reads }, { count: notifs }] = await Promise.all([
    supabase.from("message_threads").select("id, last_message_at, last_sender_role, status").eq("patient_id", patientId).neq("last_sender_role", "patient"),
    supabase.from("thread_reads").select("thread_id, last_read_at").eq("user_id", userId),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const map = new Map((reads ?? []).map((r) => [r.thread_id, r.last_read_at]));
  const messages = (threads ?? []).filter((t) => {
    const r = map.get(t.id);
    return !r || new Date(r) < new Date(t.last_message_at);
  }).length;
  return { messages, notifications: notifs ?? 0 };
});

/** Signed, short-lived URL for private exercise media. Never a public link (§118). */
export async function signedMedia(path?: string | null, seconds = 3600) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("exercise-media").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
