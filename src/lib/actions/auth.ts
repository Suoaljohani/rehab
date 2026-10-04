"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";
import { homeFor, type Role } from "@/lib/auth";

export async function requestPatientCode(accessId: string): Promise<ActionResult<{ maskedPhone: string | null; demoCode: string | null }>> {
  const id = accessId.trim().toUpperCase();
  if (!/^P-\d{6}$/.test(id)) return { ok: false, error: "رقم الدخول يتكون من الحرف P ثم ستة أرقام، مثل P-482913." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_patient_otp", { p_access_id: id });
  if (error) return { ok: false, error: humanError(error) };
  if (!data?.ok) return { ok: false, error: humanError(data?.error) };
  return { ok: true, data: { maskedPhone: data.masked_phone ?? null, demoCode: data.demo_code ?? null } };
}

export async function verifyPatientCode(accessId: string, code: string, next?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_patient_otp", { p_access_id: accessId.trim().toUpperCase(), p_code: code.trim() });
  if (error) return { ok: false, error: humanError(error) };
  if (!data?.ok) return { ok: false, error: humanError(data?.error) };
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.secret });
  if (signInError) return { ok: false, error: "تعذّر إنشاء الجلسة. حاول مجددًا." };
  // the one-time secret is destroyed immediately after the session exists
  await supabase.rpc("rotate_my_patient_secret");
  const { data: rec } = await supabase.rpc("record_login", { p_success: true, p_channel: "patient" });
  if (!rec?.ok) {
    await supabase.auth.signOut();
    return { ok: false, error: rec?.error === "disabled" ? "هذا الحساب موقوف. تواصل مع القسم." : "تعذّر تسجيل الدخول." };
  }
  redirect(next && next.startsWith("/patient") ? next : "/patient");
}

export async function staffSignIn(_: unknown, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!email || !password) return { ok: false, error: "أدخل البريد الإلكتروني وكلمة المرور." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const { data: rec } = await supabase.rpc("record_login", { p_success: false, p_identifier: email, p_channel: "staff" });
    if (rec?.error === "rate_limited") return { ok: false, error: humanError("rate_limited") };
    if (/banned/i.test(error.message)) return { ok: false, error: "هذا الحساب موقوف. تواصل مع مدير النظام." };
    return { ok: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }
  const { data: rec } = await supabase.rpc("record_login", { p_success: true, p_channel: "staff" });
  if (!rec?.ok || rec.role === "patient") {
    await supabase.auth.signOut();
    return { ok: false, error: rec?.error === "disabled" ? "هذا الحساب موقوف. تواصل مع مدير النظام." : "هذا الحساب غير مخوّل للدخول من بوابة الموظفين." };
  }
  const { data: lvl } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (lvl?.nextLevel === "aal2" && lvl.currentLevel !== "aal2") redirect(`/login/mfa${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  redirect(next && (next.startsWith("/admin") || next.startsWith("/provider")) ? next : homeFor(rec.role as Role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
