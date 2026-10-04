import { StaffShell } from "./staff-shell";
import { ADMIN_NAV, PROVIDER_NAV, type NavGroup } from "./nav-config";
import { getStaffBadges, shellViewer } from "@/lib/staff-data";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/auth";

function filterNav(nav: NavGroup[], role: string): NavGroup[] {
  return nav.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role as never)) })).filter((g) => g.items.length);
}

export async function AreaLayout({ viewer, area, children }: { viewer: Viewer; area: "provider" | "admin"; children: React.ReactNode }) {
  const supabase = await createClient();
  const [badges, { data: idle }] = await Promise.all([
    getStaffBadges(viewer),
    supabase.from("system_settings").select("value").eq("key", "session_timeout_minutes").maybeSingle(),
  ]);
  const nav = area === "provider" ? PROVIDER_NAV : filterNav(ADMIN_NAV, viewer.role);
  const canProvider = ["provider", "supervisor", "admin", "super_admin"].includes(viewer.role);
  const canAdmin = ["supervisor", "admin", "super_admin", "content_reviewer"].includes(viewer.role);
  const switchTo = area === "provider" ? (canAdmin && viewer.role !== "provider" ? { href: "/admin", label: "مركز القيادة" } : null) : canProvider && viewer.role !== "admin" ? { href: "/provider", label: "مساحة مقدم الرعاية" } : null;
  return (
    <StaffShell viewer={shellViewer(viewer)} nav={nav} badges={badges} notifications={badges.notifications} switchTo={switchTo} idleMinutes={Number(idle?.value ?? 30)}>
      {children}
    </StaffShell>
  );
}
