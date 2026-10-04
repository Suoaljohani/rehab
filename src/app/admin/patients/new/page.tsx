import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { PatientWizard } from "./wizard";

export const metadata: Metadata = { title: "مراجع جديد" };

export default async function NewPatient() {
  await requireRole(["supervisor", "admin", "super_admin"]);
  const supabase = await createClient();
  const [{ data: specs }, { data: cl }] = await Promise.all([supabase.from("specialties").select("code, name").order("sort"), supabase.rpc("provider_caseload")]);
  const providers = ((cl ?? []) as { provider_id: string; full_name: string; specialty_code: string | null; active_episodes: number; capacity: number; status: string }[])
    .filter((c) => c.status === "active").map((c) => ({ id: c.provider_id, full_name: c.full_name, specialty_code: c.specialty_code, active: c.active_episodes, capacity: c.capacity }));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="إنشاء مراجع" description="ينشئ ملف المراجع، والرحلة التأهيلية الأولى، وفريق الرعاية، ورقم الدخول — في عملية واحدة مسجّلة." />
      <Card className="p-6 sm:p-8"><PatientWizard specialties={specs ?? []} providers={providers} /></Card>
    </div>
  );
}
