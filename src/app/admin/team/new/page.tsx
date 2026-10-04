import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { StaffForm } from "./staff-form";

export const metadata: Metadata = { title: "موظف جديد" };

export default async function NewStaff() {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const { data: specs } = await supabase.from("specialties").select("code, name").order("sort");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="حساب موظف جديد" description="أقل صلاحية لازمة (Least Privilege). يُسجّل إنشاء الحساب في سجل التدقيق." />
      <Card className="p-6 sm:p-8"><StaffForm specialties={specs ?? []} /></Card>
    </div>
  );
}
