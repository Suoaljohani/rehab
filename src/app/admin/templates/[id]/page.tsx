import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { TemplateForm } from "../template-form";
import { TemplateItems } from "./template-items";
import { RemoveButton } from "@/components/admin/manage";

export const metadata: Metadata = { title: "قالب برنامج" };

export default async function TemplateDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["supervisor", "admin", "super_admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase.from("program_templates").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();
  const [{ data: items }, { data: lib }, { data: specs }] = await Promise.all([
    supabase.from("template_exercises").select("id, exercise_id, reps, sets, hold_sec, duration_sec, days_of_week, order_index, ex:exercises(cur:exercise_versions!exercises_current_fk(name))").eq("template_id", id).order("order_index"),
    supabase.from("exercises").select("id, cur:exercise_versions!exercises_current_fk(name)").eq("status", "approved"),
    supabase.from("specialties").select("code, name").order("sort"),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/templates" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> قوالب البرامج</Link>
      <PageHeader title={t.name} description={`الإصدار ${t.version} — التعديلات لا تؤثر على البرامج المنشورة سابقًا.`} actions={<RemoveButton kind="program_template" id={t.id} name={t.name} label="حذف القالب" variant="secondary" size="md" />} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit p-6"><CardHeader title="بيانات القالب" /><TemplateForm specialties={specs ?? []} initial={t} /></Card>
        <Card className="p-6"><CardHeader title="تمارين القالب" description="الوصفة والأيام الافتراضية" />
          <TemplateItems templateId={id}
            items={(items ?? []).map((i) => ({ ...i, name: ((i.ex as unknown as { cur: { name: string } | null })?.cur?.name) ?? "—" }))}
            library={(lib ?? []).map((l) => ({ id: l.id, name: (l.cur as unknown as { name: string } | null)?.name ?? "" })).sort((a, b) => a.name.localeCompare(b.name, "ar"))} />
        </Card>
      </div>
    </div>
  );
}
