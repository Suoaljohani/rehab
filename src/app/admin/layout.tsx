import type { Metadata } from "next";
import { requireRole, ADMIN_AREA_ROLES } from "@/lib/auth";
import { AreaLayout } from "@/components/staff/area-layout";

export const metadata: Metadata = { title: { default: "مركز القيادة", template: "%s · مَسار" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(ADMIN_AREA_ROLES);
  return <AreaLayout viewer={viewer} area="admin">{children}</AreaLayout>;
}
