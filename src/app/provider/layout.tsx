import type { Metadata } from "next";
import { requireRole, PROVIDER_AREA_ROLES } from "@/lib/auth";
import { AreaLayout } from "@/components/staff/area-layout";

export const metadata: Metadata = { title: { default: "مساحة مقدم الرعاية", template: "%s · مَسار" } };

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(PROVIDER_AREA_ROLES);
  return <AreaLayout viewer={viewer} area="provider">{children}</AreaLayout>;
}
