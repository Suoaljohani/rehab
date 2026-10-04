import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getEpisodes } from "@/lib/patient-data";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { CARE_ROLE_LABEL } from "@/lib/status";

export const metadata: Metadata = { title: "فريق رعايتي" };

type Member = { id: string; role: string; ended_at: string | null; provider: { id: string; full_name: string; staff: { title: string | null; specialty_code: string | null } | null } | null };

export default async function TeamPage() {
  const viewer = await requireRole(["patient"], "patient");
  const supabase = await createClient();
  const [episodes, { data: specs }] = await Promise.all([getEpisodes(viewer.patientId!), supabase.from("specialties").select("code, name")]);
  const specName = new Map((specs ?? []).map((s) => [s.code, s.name]));
  const current = episodes.find((e) => e.status === "active" || e.status === "on_hold");
  const team = ((current?.care_team ?? []) as unknown as Member[]).filter((m) => !m.ended_at && m.provider).sort((a) => (a.role === "primary" ? -1 : 1));
  return (
    <div className="space-y-5">
      <h1 className="font-display text-[1.875rem] font-semibold text-ink">فريق رعايتي</h1>
      {team.length === 0 ? <Card><EmptyState title="لم يُعيَّن فريق رعاية بعد" description="سيُعيّن القسم مقدم رعاية لرحلتك قريبًا." /></Card> : (
        <ul className="space-y-3">
          {team.map((m) => (
            <li key={m.id}>
              <Card className={m.role === "primary" ? "border-sage-200" : ""}>
                <div className="flex items-center gap-4">
                  <Avatar name={m.provider!.full_name} size="lg" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-sage-700">{CARE_ROLE_LABEL[m.role]}</div>
                    <div className="text-lg font-semibold text-ink">{m.provider!.full_name}</div>
                    <div className="text-sm text-text-2">{m.provider!.staff?.title}{m.provider!.staff?.specialty_code ? ` · ${specName.get(m.provider!.staff.specialty_code)}` : ""}</div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink href="/patient/messages/new" variant="secondary" block icon={<MessageCircle size={18} />}>مراسلة فريق رعايتي</ButtonLink>
    </div>
  );
}
