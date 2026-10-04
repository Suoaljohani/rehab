"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { humanError, type ActionResult } from "@/lib/errors";

export async function submitRequest(_: unknown, fd: FormData): Promise<ActionResult> {
  const payload = {
    journey_type: String(fd.get("journey_type") || "new_appointment"),
    full_name: String(fd.get("full_name") || "").trim(),
    national_id: String(fd.get("national_id") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    specialty_code: String(fd.get("specialty_code") || ""),
    has_referral: fd.get("has_referral") === "on",
    preferred_period: String(fd.get("preferred_period") || ""),
    notes: String(fd.get("notes") || "").trim(),
  };
  if (!fd.get("consent")) return { ok: false, error: "يرجى الموافقة على معالجة بياناتك لغرض الموعد." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_appointment_request", { p: payload });
  if (error) return { ok: false, error: humanError(error) };
  redirect(`/request/confirmation?ref=${encodeURIComponent(data.reference)}`);
}

export type TrackResult = {
  reference: string; status: string; created_at: string; service: string | null;
  events: { status: string; note: string | null; at: string }[];
  appointment: { starts_at: string; location: string | null; status: string } | null;
};

export async function trackRequest(_: unknown, fd: FormData): Promise<ActionResult<TrackResult>> {
  const ref = String(fd.get("reference") || "").trim();
  const phone = String(fd.get("phone") || "").trim();
  if (!ref || !phone) return { ok: false, error: "أدخل رقم الطلب ورقم الجوال." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_appointment_request", { p_reference: ref, p_phone: phone });
  if (error) return { ok: false, error: humanError(error) };
  if (!data?.ok) return { ok: false, error: data?.error === "not_found" ? "لم نجد طلبًا بهذه البيانات. تحقق من رقم الطلب والجوال." : humanError(data?.error) };
  return { ok: true, data: data as TrackResult };
}
