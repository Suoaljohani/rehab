import { requireRole, STAFF_ROLES } from "@/lib/auth";
import { AreaLayout } from "@/components/staff/area-layout";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(STAFF_ROLES);
  return <AreaLayout viewer={viewer} area={viewer.role === "provider" ? "provider" : "admin"}>{children}</AreaLayout>;
}
