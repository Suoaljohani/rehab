"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";

type Json = Record<string, unknown>;

async function rpc(fn: string, args: Json): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  return error ? { ok: false, error: humanError(error) } : { ok: true };
}

/** Permanent removal of a content row (admin RLS). Fails politely when the row is still referenced. */
async function removeRow(table: string, column: string, value: string | number, paths: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq(column, value);
  if (error) return { ok: false, error: humanError(error) };
  if (!count) return { ok: false, error: humanError("forbidden") };
  paths.forEach((p) => revalidatePath(p, p === "/" ? "layout" : "page"));
  return { ok: true, message: "تم الحذف نهائيًا." };
}

const done = (r: ActionResult, message: string, paths: string[]): ActionResult => {
  if (!r.ok) return r;
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, message };
};

// ---------- people ----------
export async function updateStaff(userId: string, patch: Json) {
  return done(await rpc("admin_update_staff", { p_user: userId, p: patch }), "تم حفظ بيانات الموظف.", [`/admin/team/${userId}`, "/admin/team", "/account"]);
}
export async function updateMyDetails(patch: Json) {
  return done(await rpc("update_my_details", { p: patch }), "تم حفظ بياناتك.", ["/account"]);
}
export async function removeAccount(userId: string, reason: string, self = false): Promise<ActionResult> {
  const r = await rpc("admin_remove_account", { p_user: userId, p_reason: reason });
  if (!r.ok) return r;
  revalidatePath("/admin/team");
  if (self) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login/staff");
  }
  return { ok: true, message: "حُذف الحساب. يمكنك استعادته من قائمة المحذوفين." };
}
export async function restoreAccount(userId: string) {
  return done(await rpc("admin_restore_account", { p_user: userId }), "استُعيد الحساب. سيُطلب من الموظف تعيين كلمة مرور جديدة.", ["/admin/team", `/admin/team/${userId}`]);
}
export async function updatePatient(patientId: string, patch: Json) {
  return done(await rpc("admin_update_patient", { p_patient: patientId, p: patch }), "تم حفظ بيانات المراجع.", [`/admin/patients/${patientId}`, "/admin/patients"]);
}
export async function removePatient(patientId: string, reason: string) {
  return done(await rpc("admin_remove_patient", { p_patient: patientId, p_reason: reason }), "حُذف ملف المراجع وأُلغيت رحلاته ومواعيده القادمة. يمكنك استعادته من قائمة المحذوفين.", ["/admin/patients", `/admin/patients/${patientId}`]);
}
export async function restorePatient(patientId: string) {
  return done(await rpc("admin_restore_patient", { p_patient: patientId }), "استُعيد ملف المراجع. أعد فتح رحلاته عند الحاجة.", ["/admin/patients", `/admin/patients/${patientId}`]);
}
export async function updateEpisode(episodeId: string, patientId: string, patch: Json) {
  return done(await rpc("admin_update_episode", { p_episode: episodeId, p: patch }), "تم حفظ بيانات الرحلة.", [`/admin/patients/${patientId}`]);
}

// ---------- content ----------
export async function removeAnnouncement(id: string) { return removeRow("announcements", "id", id, ["/admin/communications"]); }
export async function updateAnnouncement(id: string, patch: { title: string; body: string; audience: string }): Promise<ActionResult> {
  if (patch.title.trim().length < 3 || patch.body.trim().length < 3) return { ok: false, error: "اكتب العنوان والنص." };
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update({ title: patch.title.trim(), body: patch.body.trim(), audience: patch.audience }).eq("id", id);
  return done(error ? { ok: false, error: humanError(error) } : { ok: true }, "تم تعديل الإعلان.", ["/admin/communications"]);
}
export async function removeMessageTemplate(id: string) { return removeRow("message_templates", "id", id, ["/admin/communications"]); }
export async function updateMessageTemplate(id: string, patch: { name: string; body: string; category: string }): Promise<ActionResult> {
  if (patch.name.trim().length < 2 || patch.body.trim().length < 3) return { ok: false, error: "اكتب الاسم والنص." };
  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").update({ name: patch.name.trim(), body: patch.body.trim(), category: patch.category }).eq("id", id);
  return done(error ? { ok: false, error: humanError(error) } : { ok: true }, "تم تعديل القالب.", ["/admin/communications"]);
}
export async function removeProgramTemplate(id: string): Promise<ActionResult> {
  const r = await removeRow("program_templates", "id", id, ["/admin/templates"]);
  if (r.ok) redirect("/admin/templates");
  return r;
}
export async function removeService(id: string) { return removeRow("services", "id", id, ["/admin/cms", "/"]); }
export async function createService(name: string): Promise<ActionResult<string>> {
  const clean = name.trim();
  if (clean.length < 3) return { ok: false, error: "اكتب اسم الخدمة." };
  const slug = `service-${Date.now().toString(36)}`;
  const supabase = await createClient();
  const { data, error } = await supabase.from("services").insert({ slug, name: clean, summary: clean, is_published: false, sort: 99 }).select("id").single();
  if (error) return { ok: false, error: humanError(error) };
  revalidatePath("/admin/cms");
  return { ok: true, data: data.id, message: "أُضيفت الخدمة كمسودة مخفية. أكمل بياناتها ثم انشرها." };
}
export async function removeFaq(id: string) { return removeRow("faqs", "id", id, ["/admin/cms", "/"]); }
export async function removeSpecialty(code: string) { return removeRow("specialties", "code", code, ["/admin/settings"]); }
export async function removeAppointment(id: string) { return removeRow("appointments", "id", id, ["/admin/appointments"]); }
export async function removeWaitlistEntry(id: string) { return removeRow("waitlist_entries", "id", id, ["/admin/appointments"]); }
