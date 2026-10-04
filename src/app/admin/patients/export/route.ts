import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** CSV export — permission-checked by RLS + role and recorded in the audit log (§85). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!prof || !["supervisor", "admin", "super_admin"].includes(prof.role)) return new NextResponse("Forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  let q = supabase.from("episodes").select("code, title, status, start_date, specialty:specialties(name), patient:patients!inner(full_name, mrn, access_id), care_team:care_team_members(role, ended_at, provider:profiles!care_team_members_provider_id_fkey(full_name))");
  if (sp.get("status")) q = q.eq("status", sp.get("status")!);
  if (sp.get("specialty")) q = q.eq("specialty_code", sp.get("specialty")!);
  const term = (sp.get("q") ?? "").replace(/[%,()]/g, "");
  if (term) q = q.or(`full_name.ilike.%${term}%,mrn.ilike.%${term}%`, { referencedTable: "patients" });
  const { data, error } = await q.order("start_date", { ascending: false }).limit(5000);
  if (error) return new NextResponse("Error", { status: 500 });
  const rows = (data ?? []).map((e) => {
    const p = e.patient as unknown as { full_name: string; mrn: string; access_id: string };
    const pr = (e.care_team as unknown as { role: string; ended_at: string | null; provider: { full_name: string } }[]).find((m) => m.role === "primary" && !m.ended_at);
    return [p.mrn, p.full_name, e.code, e.title, (e.specialty as unknown as { name: string })?.name, pr?.provider.full_name ?? "", e.status, e.start_date];
  });
  await supabase.rpc("log_export", { p_entity: "patients", p_rows: rows.length, p_filters: Object.fromEntries(sp.entries()) });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [["رقم الملف", "الاسم", "رمز الرحلة", "الرحلة", "التخصص", "مقدم الرعاية", "الحالة", "البداية"], ...rows].map((r) => r.map(esc).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="patients-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
