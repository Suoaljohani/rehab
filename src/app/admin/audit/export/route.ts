import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyAuditFilters, AUDIT_ACTION, AUDIT_ENTITY, type AuditFilters } from "../shared";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["supervisor", "admin", "super_admin"].includes(me.role)) return new NextResponse("Forbidden", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const f: AuditFilters = { entity: sp.get("entity") || undefined, action: sp.get("action") || undefined, actor: sp.get("actor") || undefined, from: sp.get("from") || undefined, to: sp.get("to") || undefined, q: sp.get("q") || undefined };
  const { data, error } = await applyAuditFilters(supabase.from("audit_events").select("id, created_at, actor_id, actor_role, action, entity_type, entity_id, summary"), f).order("created_at", { ascending: false }).limit(5000);
  if (error) return new NextResponse("Error", { status: 500 });
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  const { data: actors } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = new Map((actors ?? []).map((a) => [a.id, a.full_name]));
  await supabase.rpc("log_export", { p_entity: "audit_events", p_rows: rows.length, p_filters: f });
  const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "﻿" + [
    ["رقم الحدث", "الوقت", "المستخدم", "الدور", "الإجراء", "الكيان", "المعرّف", "الملخص"],
    ...rows.map((r) => [r.id, r.created_at, r.actor_id ? name.get(r.actor_id) ?? r.actor_id : "النظام", r.actor_role, AUDIT_ACTION[r.action]?.label ?? r.action, AUDIT_ENTITY[r.entity_type] ?? r.entity_type, r.entity_id, r.summary]),
  ].map((r) => r.map(esc).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
