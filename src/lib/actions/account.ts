"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";
import { homeFor, type Role } from "@/lib/auth";

export async function changePassword(_: unknown, fd: FormData): Promise<ActionResult> {
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("new") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const first = fd.get("first") === "1";
  if (!current || !next) return { ok: false, error: "أدخل كلمة المرور الحالية والجديدة." };
  if (next !== confirm) return { ok: false, error: "تأكيد كلمة المرور غير مطابق." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_my_password", { p_current: current, p_new: next });
  if (error) return { ok: false, error: humanError(error) };
  if (first) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
    redirect(homeFor((prof?.role ?? "provider") as Role));
  }
  return { ok: true, message: "تم تغيير كلمة المرور." };
}
