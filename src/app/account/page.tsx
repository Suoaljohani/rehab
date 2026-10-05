import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, KeyRound } from "lucide-react";
import { requireRole, STAFF_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, DescriptionList } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/status";
import { fDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "حسابي" };

export default async function StaffAccount() {
  const viewer = await requireRole(STAFF_ROLES);
  const supabase = await createClient();
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone, last_login_at, role").eq("id", viewer.id).single(),
    supabase.from("staff_profiles").select("employee_id, title, specialty_code, capacity").eq("user_id", viewer.id).maybeSingle(),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="حسابي" description="بيانات حسابك الوظيفي. لتعديل البيانات تواصل مع مدير النظام." />
      <Card className="mb-5 flex items-center gap-5 p-6">
        <Avatar name={p?.full_name} size="xl" />
        <div><div className="text-xl font-semibold text-ink">{p?.full_name}</div><div className="text-text-2">{s?.title}</div><Badge tone="slate" className="mt-2">{ROLE_LABEL[p?.role ?? "provider"]}</Badge></div>
      </Card>
      <Card className="mb-5">
        <CardHeader title="البيانات الوظيفية" />
        <DescriptionList items={[
          { label: "البريد الإلكتروني", value: <span dir="ltr">{p?.email}</span> },
          { label: "الرقم الوظيفي", value: s?.employee_id },
          { label: "سعة الحالات", value: s?.capacity },
          { label: "آخر دخول", value: fDateTime(p?.last_login_at) },
        ]} />
      </Card>
      <Card>
        <CardHeader title="الأمان" description="التحقق الثنائي يحمي بيانات المراجعين حتى لو كُشفت كلمة المرور." action={viewer.hasMfa ? <Badge tone="success" dot>مفعّل</Badge> : <Badge tone="warning" dot>غير مفعّل</Badge>} />
        <div className="flex flex-wrap gap-2.5"><Link href="/account/security" className={buttonClasses("secondary")}><ShieldCheck size={18} /> إدارة التحقق الثنائي</Link><Link href="/account/password" className={buttonClasses("quiet")}><KeyRound size={18} /> تغيير كلمة المرور</Link></div>
      </Card>
    </div>
  );
}
