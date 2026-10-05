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
const s = (v: FormDataEntryValue | null) => (v === null ? null : String(v).trim() || null);

// ---------- patients ----------
export async function findDuplicates(input: { national_id?: string; phone?: string; name?: string; dob?: string }) {
  return rpc<{ id: string; full_name: string; mrn: string; phone: string; date_of_birth: string | null; match_reason: string }[]>("find_patient_duplicates", {
    p_national_id: input.national_id || null, p_phone: input.phone || null, p_name: input.name || null, p_dob: input.dob || null,
  });
}

export async function createPatient(payload: Record<string, unknown>) {
  const r = await rpc<{ patient_id: string; access_id: string; mrn: string; episode_id: string | null }>("admin_create_patient", { p: payload });
  revalidatePath("/admin/patients");
  revalidatePath("/admin");
  return r;
}

export async function createEpisode(patientId: string, payload: Record<string, unknown>) {
  const r = await rpc<string>("admin_create_episode", { p_patient: patientId, p: payload });
  revalidatePath(`/admin/patients/${patientId}`);
  return r;
}

export async function setAccountStatus(userId: string, status: "active" | "disabled", path: string) {
  const r = await rpc("admin_update_account", { p_user: userId, p_role: null, p_status: status });
  revalidatePath(path);
  return r;
}

export async function setUserRole(userId: string, role: string, path: string) {
  const r = await rpc("admin_update_account", { p_user: userId, p_role: role, p_status: null });
  revalidatePath(path);
  return r;
}

// ---------- care teams ----------
export async function assignCare(episodeId: string, providerId: string, role: string, reason?: string) {
  const r = await rpc<string>("assign_care_member", { p_episode: episodeId, p_provider: providerId, p_role: role, p_reason: reason || null });
  revalidatePath("/admin/assignments");
  revalidatePath("/admin");
  return r;
}
export async function endCare(memberId: string, reason: string) {
  const r = await rpc("end_care_member", { p_member: memberId, p_reason: reason });
  revalidatePath("/admin/assignments");
  return r;
}

// ---------- staff ----------
export async function createStaff(_: unknown, fd: FormData): Promise<ActionResult<string>> {
  const r = await rpc<string>("admin_create_staff", { p: {
    email: s(fd.get("email")), password: s(fd.get("password")), full_name: s(fd.get("full_name")), full_name_en: s(fd.get("full_name_en")),
    role: s(fd.get("role")), specialty_code: s(fd.get("specialty_code")), title: s(fd.get("title")), employee_id: s(fd.get("employee_id")),
    capacity: s(fd.get("capacity")), phone: s(fd.get("phone")),
  } });
  if (r.ok) revalidatePath("/admin/team");
  return r;
}
export async function updateStaffProfile(userId: string, patch: { title?: string | null; specialty_code?: string | null; capacity?: number; employee_id?: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_profiles").update(patch).eq("user_id", userId);
  if (error) return { ok: false as const, error: humanError(error) };
  revalidatePath(`/admin/team/${userId}`);
  return { ok: true as const };
}
export async function resetPassword(userId: string, password: string) {
  return rpc("admin_reset_password", { p_user: userId, p_password: password });
}

// ---------- appointments ----------
export async function updateRequest(id: string, status: string, internal?: string, pub?: string) {
  const r = await rpc("update_request_status", { p_request: id, p_status: status, p_internal: internal || null, p_public: pub || null });
  revalidatePath("/admin/appointments");
  return r;
}
export async function scheduleAppointment(payload: Record<string, unknown>) {
  const r = await rpc<string>("schedule_appointment", { p: payload });
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  return r;
}
export async function handleChange(id: string, decision: "approved" | "declined", note?: string) {
  const r = await rpc("handle_change_request", { p_id: id, p_decision: decision, p_note: note || null });
  revalidatePath("/admin/appointments");
  return r;
}
export async function setApptStatus(id: string, status: string, note?: string) {
  const r = await rpc("set_appointment_status", { p_appointment: id, p_status: status, p_note: note || null });
  revalidatePath("/admin/appointments");
  return r;
}
export async function saveWaitlist(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const days = fd.getAll("preferred_days").map((d) => Number(d));
  const { error } = await supabase.from("waitlist_entries").insert({
    full_name: s(fd.get("full_name")), phone: s(fd.get("phone")), specialty_code: s(fd.get("specialty_code")), preferred_days: days,
    preferred_time: s(fd.get("preferred_time")), priority: s(fd.get("priority")), notes: s(fd.get("notes")), created_by: user!.id,
  });
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/admin/appointments");
  return { ok: true, message: "أُضيف لقائمة الانتظار." };
}
export async function setWaitlistStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_entries").update({ status }).eq("id", id);
  revalidatePath("/admin/appointments");
  return error ? { ok: false as const, error: humanError(error) } : { ok: true as const };
}

// ---------- templates ----------
export async function saveTemplate(_: unknown, fd: FormData): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const id = s(fd.get("id"));
  const row = { name: s(fd.get("name")) ?? "", specialty_code: s(fd.get("specialty_code")), category: s(fd.get("category")), description: s(fd.get("description")),
    instructions: s(fd.get("instructions")), duration_weeks: Number(fd.get("duration_weeks") || 4), status: s(fd.get("status")) ?? "active" };
  if (!row.name) return { ok: false, error: "اكتب اسم القالب." };
  if (id) {
    const { data: cur } = await supabase.from("program_templates").select("version").eq("id", id).single();
    const { error } = await supabase.from("program_templates").update({ ...row, version: (cur?.version ?? 1) + 1 }).eq("id", id);
    if (error) return { ok: false, error: humanError(error) };
    revalidatePath(`/admin/templates/${id}`);
    return { ok: true, data: id, message: "تم حفظ القالب." };
  }
  const { data, error } = await supabase.from("program_templates").insert({ ...row, created_by: user!.id }).select("id").single();
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/admin/templates");
  return { ok: true, data: data.id, message: "تم إنشاء القالب." };
}
export async function addTemplateExercise(templateId: string, exerciseId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("template_exercises").select("id", { count: "exact", head: true }).eq("template_id", templateId);
  const { data: ex } = await supabase.from("exercises").select("cur:exercise_versions!exercises_current_fk(default_reps, default_sets, default_hold_sec, default_duration_sec)").eq("id", exerciseId).single();
  const c = ex?.cur as unknown as { default_reps: number | null; default_sets: number | null; default_hold_sec: number | null; default_duration_sec: number | null } | null;
  const { error } = await supabase.from("template_exercises").insert({ template_id: templateId, exercise_id: exerciseId, order_index: (count ?? 0) + 1, reps: c?.default_reps, sets: c?.default_sets, hold_sec: c?.default_hold_sec, duration_sec: c?.default_duration_sec });
  revalidatePath(`/admin/templates/${templateId}`);
  return error ? { ok: false as const, error: humanError(error) } : { ok: true as const };
}
export async function updateTemplateExercise(id: string, templateId: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("template_exercises").update(patch).eq("id", id);
  revalidatePath(`/admin/templates/${templateId}`);
  return error ? { ok: false as const, error: humanError(error) } : { ok: true as const };
}
export async function removeTemplateExercise(id: string, templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("template_exercises").delete().eq("id", id);
  revalidatePath(`/admin/templates/${templateId}`);
  return error ? { ok: false as const, error: humanError(error) } : { ok: true as const };
}

// ---------- communications ----------
export async function saveAnnouncement(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("announcements").insert({ title: s(fd.get("title")), body: s(fd.get("body")), audience: s(fd.get("audience")) ?? "all", created_by: user!.id }).select("id").single();
  if (error) return { ok: false, error: humanError(error) };
  if (fd.get("publish") === "1") {
    const r = await rpc<number>("publish_announcement", { p_id: data.id });
    if (!r.ok) return r;
    revalidatePath("/admin/communications");
    return { ok: true, message: `نُشر الإعلان ووصل إلى ${r.data} مستخدم.` };
  }
  revalidatePath("/admin/communications");
  return { ok: true, message: "حُفظ الإعلان كمسودة." };
}
export async function publishAnnouncement(id: string) {
  const r = await rpc<number>("publish_announcement", { p_id: id });
  revalidatePath("/admin/communications");
  return r;
}
export async function saveMessageTemplate(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("message_templates").insert({ name: s(fd.get("name")), category: s(fd.get("category")) ?? "general", body: s(fd.get("body")), created_by: user!.id });
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/admin/communications");
  return { ok: true, message: "تمت إضافة القالب." };
}

// ---------- CMS & settings ----------
export async function saveCmsBlock(key: string, content: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("cms_blocks").upsert({ key, content, updated_by: user!.id, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "نُشر التحديث على الموقع." };
}
export async function saveService(id: string, patch: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ الخدمة." };
}
export async function saveFaq(faq: { id?: string; question: string; answer: string; sort?: number; is_published?: boolean }): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = faq.id ? await supabase.from("faqs").update(faq).eq("id", faq.id) : await supabase.from("faqs").insert(faq);
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "تم حفظ السؤال." };
}
export async function saveSetting(key: string, value: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("system_settings").update({ value, updated_by: user!.id, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/admin/settings");
  return { ok: true, message: "تم حفظ الإعداد وتسجيله في سجل التدقيق." };
}

export async function logExport(entity: string, rows: number, filters?: Record<string, unknown>) {
  return rpc("log_export", { p_entity: entity, p_rows: rows, p_filters: filters ?? null });
}
export async function saveSpecialty(code: string, patch: { name?: string; name_en?: string; sort?: number }, isNew = false): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = isNew
    ? await supabase.from("specialties").insert({ code, name: patch.name ?? code, name_en: patch.name_en ?? code, sort: patch.sort ?? 0 })
    : await supabase.from("specialties").update(patch).eq("code", code);
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/admin/settings");
  return { ok: true, message: "تم حفظ التخصص." };
}
export async function updatePatientPhone(patientId: string, phone: string): Promise<ActionResult> {
  const r = await rpc("admin_update_patient_phone", { p_patient: patientId, p_phone: phone });
  if (!r.ok) return r;
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true, message: "تم تحديث رقم الجوال. ستصل رموز الدخول إلى الرقم الجديد." };
}
