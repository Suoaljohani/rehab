import type { Role } from "@/lib/auth";

export type NavItem = { href: string; label: string; icon: string; roles?: Role[]; exact?: boolean; badgeKey?: string };
export type NavGroup = { label?: string; items: NavItem[] };

export const PROVIDER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/provider", label: "يومي", icon: "sun", exact: true, badgeKey: "flags" },
      { href: "/provider/patients", label: "مراجعيّ", icon: "users" },
      { href: "/provider/calendar", label: "التقويم", icon: "calendar" },
      { href: "/provider/library", label: "مكتبة التمارين", icon: "dumbbell" },
      { href: "/provider/messages", label: "الرسائل", icon: "message", badgeKey: "messages" },
    ],
  },
];

const ADMIN_ONLY: Role[] = ["admin", "super_admin"];
const SUP: Role[] = ["supervisor", "admin", "super_admin"];
const CONTENT: Role[] = ["content_reviewer", "admin", "super_admin", "supervisor"];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "التشغيل",
    items: [
      { href: "/admin", label: "مركز القيادة", icon: "grid", exact: true, roles: SUP },
      { href: "/admin/patients", label: "المراجعين", icon: "users", roles: SUP },
      { href: "/admin/assignments", label: "التوزيع", icon: "columns", roles: SUP, badgeKey: "unassigned" },
      { href: "/admin/team", label: "فريق التأهيل", icon: "stethoscope", roles: SUP },
      { href: "/admin/appointments", label: "المواعيد", icon: "calendar", roles: SUP, badgeKey: "requests" },
    ],
  },
  {
    label: "المحتوى السريري",
    items: [
      { href: "/admin/exercises", label: "Exercise Studio", icon: "dumbbell", roles: CONTENT, badgeKey: "reviews" },
      { href: "/admin/templates", label: "قوالب البرامج", icon: "layers", roles: SUP },
    ],
  },
  {
    label: "التواصل والقياس",
    items: [
      { href: "/admin/communications", label: "التواصل", icon: "megaphone", roles: ADMIN_ONLY },
      { href: "/admin/reports", label: "التقارير", icon: "chart", roles: SUP },
      { href: "/admin/cms", label: "إدارة الموقع", icon: "globe", roles: ADMIN_ONLY },
    ],
  },
  {
    label: "الحوكمة",
    items: [
      { href: "/admin/settings", label: "الإعدادات", icon: "settings", roles: ADMIN_ONLY },
      { href: "/admin/roles", label: "الأدوار والصلاحيات", icon: "shield", roles: ADMIN_ONLY },
      { href: "/admin/audit", label: "سجل التدقيق", icon: "scroll", roles: SUP },
    ],
  },
];
