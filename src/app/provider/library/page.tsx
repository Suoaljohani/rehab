import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchLibrary } from "@/lib/library-data";
import { LibraryFilters, LibraryGrid } from "@/components/exercise/library-grid";
import { PageHeader } from "@/components/ui/stat";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "مكتبة التمارين" };

export default async function ProviderLibrary({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(PROVIDER_AREA_ROLES);
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: specs }, items] = await Promise.all([supabase.from("specialties").select("code, name").order("sort"), searchLibrary({ ...sp, approvedOnly: true })]);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="مكتبة التمارين" description={`${items.length} تمرين معتمد متاح للوصف. يظهر هنا المحتوى المعتمد فقط.`} actions={<ButtonLink href="/provider/library/new" variant="secondary" icon={<Plus size={17} />}>اقتراح تمرين جديد</ButtonLink>} />
      <LibraryFilters base="/provider/library" {...sp} specialties={specs ?? []} />
      <LibraryGrid items={items} hrefBase="/provider/library" />
    </div>
  );
}
