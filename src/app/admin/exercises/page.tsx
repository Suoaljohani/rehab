import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchLibrary } from "@/lib/library-data";
import { LibraryFilters, LibraryGrid } from "@/components/exercise/library-grid";
import { PageHeader } from "@/components/ui/stat";
import { LinkTabs } from "@/components/ui/tabs";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Exercise Studio" };

const TABS: [string, string][] = [["", "الكل"], ["in_review", "قيد المراجعة"], ["draft", "مسودات"], ["changes_requested", "مطلوب تعديل"], ["approved", "معتمدة"], ["archived", "مؤرشفة"]];

export default async function Studio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(["content_reviewer", "supervisor", "admin", "super_admin"]);
  const sp = await searchParams;
  const tab = sp.tab ?? "";
  const supabase = await createClient();
  const [{ data: specs }, all, { data: pendingVersions }] = await Promise.all([
    supabase.from("specialties").select("code, name").order("sort"),
    searchLibrary({ q: sp.q, region: sp.region, specialty: sp.specialty, difficulty: sp.difficulty }),
    supabase.from("exercise_versions").select("exercise_id").eq("status", "in_review"),
  ]);
  const inReview = new Set((pendingVersions ?? []).map((v) => v.exercise_id));
  const items = all.filter((e) => !tab || (tab === "in_review" ? inReview.has(e.id) : e.status === tab)).map((e) => (inReview.has(e.id) && e.status === "approved" ? { ...e, pending: "نسخة جديدة بانتظار المراجعة" } : e));
  const count = (k: string) => (k === "in_review" ? inReview.size : all.filter((e) => !k || e.status === k).length);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Exercise Studio" description="إدارة المحتوى السريري للتمارين: الإنشاء، الوسائط، المراجعة والاعتماد، والنسخ. لا يظهر لمقدمي الرعاية إلا المعتمد." actions={<ButtonLink href="/admin/exercises/new" icon={<Plus size={17} />}>تمرين جديد</ButtonLink>} />
      <LinkTabs variant="pill" className="mb-4" items={TABS.map(([k, l]) => ({ href: `/admin/exercises${k ? `?tab=${k}` : ""}`, label: l, active: tab === k, count: count(k) }))} />
      <LibraryFilters base="/admin/exercises" {...sp} specialties={specs ?? []} />
      <LibraryGrid items={items} hrefBase="/admin/exercises" showStatus />
    </div>
  );
}
