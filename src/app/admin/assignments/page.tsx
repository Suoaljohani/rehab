import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { AssignmentBoard, type BoardCard, type BoardCol } from "./board";

export const metadata: Metadata = { title: "التوزيع" };

export default async function Assignments() {
  await requireRole(["supervisor", "admin", "super_admin"]);
  const supabase = await createClient();
  const [{ data: eps }, { data: cl }, { data: specs }] = await Promise.all([
    supabase.from("episodes").select("id, title, status, specialty_code, created_at, patient:patients(full_name), care_team:care_team_members(id, role, provider_id, ended_at, created_at)").in("status", ["active", "on_hold"]).order("created_at", { ascending: false }),
    supabase.rpc("provider_caseload"),
    supabase.from("specialties").select("code, name").order("sort"),
  ]);
  const specName = new Map((specs ?? []).map((s) => [s.code, s.name]));
  const cards: BoardCard[] = (eps ?? []).map((e) => {
    const pm = (e.care_team as unknown as { id: string; role: string; provider_id: string; ended_at: string | null; created_at: string }[]).find((m) => m.role === "primary" && !m.ended_at);
    return { episodeId: e.id, memberId: pm?.id ?? null, patient: (e.patient as unknown as { full_name: string }).full_name, title: e.title, specialty: e.specialty_code, specialtyName: specName.get(e.specialty_code) ?? "", providerId: pm?.provider_id ?? null, since: pm?.created_at ?? e.created_at, status: e.status };
  });
  const cols: BoardCol[] = ((cl ?? []) as { provider_id: string; full_name: string; title: string | null; specialty_code: string | null; capacity: number; primary_episodes: number; status: string }[])
    .filter((c) => c.status === "active").map((c) => ({ id: c.provider_id, name: c.full_name, title: c.title, specialty: c.specialty_code, capacity: c.capacity, active: c.primary_episodes }));
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader title="لوحة التوزيع" description="توزيع الرحلات النشطة على مقدمي الرعاية الرئيسيين. كل رحلة نشطة يجب أن يكون لها مقدم رعاية رئيسي أو تظهر في عمود غير الموزّع." />
      <AssignmentBoard cards={cards} cols={cols} specialties={specs ?? []} />
    </div>
  );
}
