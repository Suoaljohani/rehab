import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { StaffInbox } from "@/components/messages/staff-inbox";
import { PageHeader } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "الرسائل" };

export default async function ProviderMessages({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  const { f } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="الرسائل" description="محادثات مراجعيك فقط. الرسائل ليست قناة للحالات الطارئة." />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <StaffInbox viewerId={viewer.id} filter={f} base="/provider/messages" />
        <div className="hidden rounded-[24px] border border-dashed border-line bg-surface/50 lg:block"><EmptyState icon={<MessageCircle size={24} />} title="اختر محادثة" description="اختر محادثة من القائمة لعرضها والرد." /></div>
      </div>
    </div>
  );
}
