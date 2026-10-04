import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Notice } from "@/components/ui/notice";
import { AccountToggle } from "@/components/admin/dialogs";
import { ROLE_LABEL, USER_STATUS, EPISODE_STATUS } from "@/lib/status";
import { fDateTime } from "@/lib/format";
import { StaffManage } from "./staff-manage";

export const metadata: Metadata = { title: "موظف" };

export default async function StaffDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const viewer = await requireRole(["admin", "super_admin"]);
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data: s } = await supabase.from("profiles").select("id, full_name, email, role, status, last_login_at, created_at, staff:staff_profiles(employee_id, title, specialty_code, capacity)").eq("id", id).neq("role", "patient").maybeSingle();
  if (!s) notFound();
  const [{ data: specs }, { data: eps }] = await Promise.all([
    supabase.from("specialties").select("code, name").order("sort"),
    supabase.from("care_team_members").select("role, episode:episodes(id, title, status, patient:patients(full_name))").eq("provider_id", id).is("ended_at", null),
  ]);
  const sp = (s.staff as unknown as { employee_id: string | null; title: string | null; specialty_code: string | null; capacity: number } | null) ?? { employee_id: null, title: null, specialty_code: null, capacity: 20 };
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/team" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-ink"><ArrowRight size={16} /> فريق التأهيل</Link>
      {created && <Notice tone="success" className="mb-5">تم إنشاء الحساب. سلّم كلمة المرور المؤقتة للموظف بقناة آمنة.</Notice>}
      <Card tone="travertine" className="mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4"><Avatar name={s.full_name} size="xl" /><div><h1 className="font-display text-2xl font-semibold text-ink">{s.full_name}</h1><div className="text-sm text-text-2" dir="ltr">{s.email}</div><div className="mt-1 text-xs text-text-2">{ROLE_LABEL[s.role]} · آخر دخول {s.last_login_at ? fDateTime(s.last_login_at) : "—"}</div></div></div>
        <div className="flex items-center gap-2"><StatusBadge map={USER_STATUS} value={s.status} />{s.id !== viewer.id && <AccountToggle userId={s.id} status={s.status} path={`/admin/team/${id}`} />}</div>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6"><CardHeader title="إدارة الحساب" /><StaffManage userId={s.id} role={s.role} profile={sp} specialties={specs ?? []} self={s.id === viewer.id} /></Card>
        <Card>
          <CardHeader title="الحالات المسندة" description={`${(eps ?? []).length} رحلة`} />
          <ul className="divide-y divide-line-soft">{(eps ?? []).map((m, i) => {
            const e = m.episode as unknown as { id: string; title: string; status: string; patient: { full_name: string } };
            return <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm"><div><div className="font-medium text-ink">{e.patient.full_name}</div><div className="text-xs text-text-2">{e.title}</div></div><StatusBadge map={EPISODE_STATUS} value={e.status} size="sm" /></li>;
          })}</ul>
        </Card>
      </div>
    </div>
  );
}
