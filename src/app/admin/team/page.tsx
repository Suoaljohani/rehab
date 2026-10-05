import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { ButtonLink } from "@/components/ui/button";
import { Table, TableShell, THead, Th, Tr, Td } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress";
import { ROLE_LABEL, USER_STATUS } from "@/lib/status";
import { fDateTime, fRelative } from "@/lib/format";
import { LinkTabs } from "@/components/ui/tabs";
import { RestoreButton } from "@/components/admin/manage";

export const metadata: Metadata = { title: "فريق التأهيل" };

export default async function Team({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireRole(["supervisor", "admin", "super_admin"]);
  const removedView = (await searchParams).view === "removed";
  const supabase = await createClient();
  const [{ data: staff }, { data: cl }, { data: specs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, status, last_login_at, removed_at, removed_email, removed_reason, staff:staff_profiles(employee_id, title, specialty_code, capacity)").neq("role", "patient").order("full_name"),
    supabase.rpc("provider_caseload"),
    supabase.from("specialties").select("code, name"),
  ]);
  const load = new Map(((cl ?? []) as { provider_id: string; active_episodes: number }[]).map((c) => [c.provider_id, c.active_episodes]));
  const specName = new Map((specs ?? []).map((s) => [s.code, s.name]));
  const isAdmin = ["admin", "super_admin"].includes(viewer.role);
  const current = (staff ?? []).filter((x) => !x.removed_at);
  const removed = (staff ?? []).filter((x) => x.removed_at);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="فريق التأهيل" description="الموظفون، التخصصات، الأدوار، وعبء الحالات. الحسابات شخصية ولا يجوز مشاركتها." actions={isAdmin && <ButtonLink href="/admin/team/new" icon={<UserPlus size={17} />}>موظف جديد</ButtonLink>} />
      {isAdmin && <LinkTabs className="mb-5" items={[{ href: "/admin/team", label: "الفريق الحالي", count: current.length, active: !removedView }, { href: "/admin/team?view=removed", label: "المحذوفون", count: removed.length, active: removedView }]} />}
      {removedView && isAdmin ? (
        <TableShell>
          <Table>
            <THead><tr><Th>الموظف</Th><Th>البريد السابق</Th><Th>الدور</Th><Th>حُذف</Th><Th>السبب</Th><Th /></tr></THead>
            <tbody>{removed.length === 0 ? <Tr><Td colSpan={6} className="py-10 text-center text-text-2">لا توجد حسابات محذوفة.</Td></Tr> : removed.map((s) => (
              <Tr key={s.id}>
                <Td><Link href={`/admin/team/${s.id}`} className="flex items-center gap-3 hover:underline"><Avatar name={s.full_name} size="sm" /><span className="font-medium text-ink">{s.full_name}</span></Link></Td>
                <Td className="text-text-2" dir="ltr">{s.removed_email ?? "—"}</Td>
                <Td>{ROLE_LABEL[s.role]}</Td>
                <Td className="text-text-2">{fDateTime(s.removed_at)}</Td>
                <Td className="max-w-xs text-text-2">{s.removed_reason ?? "—"}</Td>
                <Td><RestoreButton kind="account" id={s.id} /></Td>
              </Tr>
            ))}</tbody>
          </Table>
        </TableShell>
      ) : (
      <TableShell>
        <Table>
          <THead><tr><Th>الموظف</Th><Th>الرقم الوظيفي</Th><Th>التخصص</Th><Th>الدور</Th><Th>عبء الحالات</Th><Th>الحالة</Th><Th>آخر دخول</Th></tr></THead>
          <tbody>{current.map((s) => {
            const sp = s.staff as unknown as { employee_id: string | null; title: string | null; specialty_code: string | null; capacity: number } | null;
            const l = load.get(s.id);
            return (
              <Tr key={s.id}>
                <Td>{isAdmin ? <Link href={`/admin/team/${s.id}`} className="flex items-center gap-3 hover:underline"><Avatar name={s.full_name} size="sm" /><div><div className="font-medium text-ink">{s.full_name}</div><div className="text-xs text-text-2">{sp?.title}</div></div></Link>
                  : <div className="flex items-center gap-3"><Avatar name={s.full_name} size="sm" /><div><div className="font-medium text-ink">{s.full_name}</div><div className="text-xs text-text-2">{sp?.title}</div></div></div>}</Td>
                <Td className="text-text-2" dir="ltr">{sp?.employee_id ?? "—"}</Td>
                <Td>{specName.get(sp?.specialty_code ?? "") ?? "—"}</Td>
                <Td><Badge tone={s.role === "admin" ? "slate" : s.role === "supervisor" ? "info" : s.role === "content_reviewer" ? "clay" : "sage"} size="sm">{ROLE_LABEL[s.role]}</Badge></Td>
                <Td>{l !== undefined && sp?.capacity ? <div className="flex w-36 items-center gap-2"><ProgressBar value={l} max={sp.capacity} size="sm" tone={l >= sp.capacity ? "clay" : "sage"} label="عبء الحالات" /><span className="text-xs tabular">{l}/{sp.capacity}</span></div> : <span className="text-text-3">—</span>}</Td>
                <Td><StatusBadge map={USER_STATUS} value={s.status} size="sm" /></Td>
                <Td className="text-text-2">{s.last_login_at ? fRelative(s.last_login_at) : "—"}</Td>
              </Tr>
            );
          })}</tbody>
        </Table>
      </TableShell>
      )}
    </div>
  );
}
