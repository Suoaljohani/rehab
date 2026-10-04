import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { TemplateForm } from "./template-form";

export const metadata: Metadata = { title: "قوالب البرامج" };

export default async function Templates() {
  await requireRole(["supervisor", "admin", "super_admin"]);
  const supabase = await createClient();
  const [{ data }, { data: specs }] = await Promise.all([
    supabase.from("program_templates").select("id, name, category, status, version, duration_weeks, specialty:specialties(name), items:template_exercises(id)").order("name"),
    supabase.from("specialties").select("code, name").order("sort"),
  ]);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="قوالب البرامج" description="نقطة بداية جاهزة لمقدمي الرعاية. استخدام القالب ينشئ نسخة مستقلة للمراجع؛ تعديل القالب لاحقًا لا يغيّر البرامج المنشورة." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {(data ?? []).length === 0 ? <Card><EmptyState title="لا توجد قوالب" /></Card> : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{(data ?? []).map((t) => (
              <li key={t.id}><Link href={`/admin/templates/${t.id}`} className="block h-full rounded-[22px] border border-line/80 bg-surface p-5 transition hover:shadow-[var(--shadow-md)]">
                <div className="flex items-start justify-between gap-2"><span className="grid size-10 place-items-center rounded-[12px] bg-sage-50 text-sage-700"><Layers size={19} /></span><Badge size="sm" tone={t.status === "active" ? "sage" : "muted"}>{t.status === "active" ? "نشط" : t.status === "draft" ? "مسودة" : "مؤرشف"}</Badge></div>
                <div className="mt-4 font-semibold text-ink">{t.name}</div>
                <div className="mt-1 text-sm text-text-2">{(t.specialty as unknown as { name: string } | null)?.name} · {t.category} · {t.duration_weeks} أسابيع</div>
                <div className="mt-3 text-xs text-text-3">{(t.items as unknown[]).length} تمارين · الإصدار {t.version}</div>
              </Link></li>
            ))}</ul>
          )}
        </div>
        <Card className="h-fit p-6"><CardHeader title="قالب جديد" /><TemplateForm specialties={specs ?? []} /></Card>
      </div>
    </div>
  );
}
