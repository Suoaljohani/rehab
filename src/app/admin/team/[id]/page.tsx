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
import { RemoveButton, RestoreButton, StaffEditForm } from "@/components/admin/manage";

export const metadata: Metadata = { title: "موظف" };

export default async function StaffDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const viewer = await requireRole(["admin", "super_admin"]);
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data: s } = await supabase.from("profiles").select("id, full_name, full_name_en, email, phone, role, status, last_login_at, created_at, removed_at, removed_email, removed_reason, staff:staff_profiles(employee_id, title, specialty_code, capacity)").eq("id", id).neq("role", "patient").maybeSingle();
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
      {s.removed_at && (
        <Notice tone="danger" className="mb-5" title={`حساب محذوف · ${fDateTime(s.removed_at)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><span>البريد السابق <span dir="ltr">{s.removed_email}</span>{s.removed_reason ? ` · السبب: ${s.removed_reason}` : ""}</span><RestoreButton kind="account" id={s.id} /></div>
        </Notice>
      )}
      <Card tone="travertine" className="mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4"><Avatar name={s.full_name} size="xl" /><div><h1 className="font-display text-2xl font-semibold text-ink">{s.full_name}</h1><div className="text-sm text-text-2" dir="ltr">{s.email ?? s.removed_email}</div><div className="mt-1 text-xs text-text-2">{ROLE_LABEL[s.role]} · آخر دخول {s.last_login_at ? fDateTime(s.last_login_at) : "—"}</div></div></div>
        <div className="flex items-center gap-2"><StatusBadge map={USER_STATUS} value={s.status} />{s.id !== viewer.id && !s.removed_at && <AccountToggle userId={s.id} status={s.status} path={`/admin/team/${id}`} />}</div>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {!s.removed_at && (
            <Card className="p-6"><CardHeader title={s.id === viewer.id ? "بياناتي" : "البيانات الشخصية والوظيفية"} />
              <StaffEditForm userId={s.id} data={{ full_name: s.full_name, full_name_en: s.full_name_en, email: s.email, phone: s.phone, title: sp.title, employee_id: sp.employee_id, specialty_code: sp.specialty_code, capacity: sp.capacity }} specialties={specs ?? []} />
            </Card>
          )}
          {!s.removed_at && <Card className="p-6"><CardHeader title="الدور وكلمة المرور" /><StaffManage userId={s.id} role={s.role} self={s.id === viewer.id} /></Card>}
          {!s.removed_at && (
            <Card className="border-danger/25 p-6">
              <CardHeader title="حذف الحساب" description={s.id === viewer.id ? "تحذف حسابك أنت. يجب أن يبقى مدير نظام آخر فعّال." : "يُغلق الحساب ويختفي من القوائم، ويبقى سجل عمله محفوظًا وقابلًا للاستعادة."} />
              <RemoveButton kind="account" id={s.id} name={s.full_name} self={s.id === viewer.id} label={s.id === viewer.id ? "حذف حسابي" : "حذف الحساب"} variant="danger" />
            </Card>
          )}
        </div>
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
