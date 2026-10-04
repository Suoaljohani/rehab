import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const days = Math.min(180, Math.max(7, Number(req.nextUrl.searchParams.get("days")) || 28));
  const { data, error } = await supabase.rpc("engagement_report", { p_days: days });
  if (error) return new NextResponse("Forbidden", { status: 403 });
  const weekly = ((data as { weekly: { week: string; eligible: number; completed: number }[] }).weekly ?? []);
  await supabase.rpc("log_export", { p_entity: "engagement_report", p_rows: weekly.length, p_filters: { days } });
  const csv = "﻿" + [["الأسبوع", "التمارين المؤهلة", "المكتملة", "الالتزام٪"], ...weekly.map((w) => [w.week, w.eligible, w.completed, w.eligible ? Math.round((w.completed / w.eligible) * 100) : ""])].map((r) => r.join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="engagement-${days}d.csv"` } });
}
