import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Globe, LogOut, Shield, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { fDate } from "@/lib/format";
import { Preferences } from "./preferences";

export const metadata: Metadata = { title: "حسابي" };

export default async function Account() {
  const viewer = await requireRole(["patient"], "patient");
  const supabase = await createClient();
  const [{ data: p }, { data: prefs }] = await Promise.all([
    supabase.from("patients").select("full_name, access_id, mrn, phone, date_of_birth, national_id").eq("id", viewer.patientId!).single(),
    supabase.from("notification_preferences").select("*").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const mask = (s?: string | null, keep = 3) => (s ? "•".repeat(Math.max(0, s.length - keep)) + s.slice(-keep) : "—");
  return (
    <div className="space-y-5">
      <h1 className="font-display text-[1.875rem] font-semibold text-ink">حسابي</h1>
      <Card tone="travertine" className="flex items-center gap-4 p-6">
        <Avatar name={p?.full_name} size="xl" />
        <div><div className="text-xl font-semibold text-ink">{p?.full_name}</div><div className="mt-1 font-mono text-sm text-text-2" dir="ltr">{p?.access_id}</div></div>
      </Card>
      <Card>
        <CardHeader title="بياناتي الأساسية" description="لتعديل البيانات تواصل مع القسم — لا تُعدّل البيانات الحساسة مباشرة." />
        <DescriptionList items={[
          { label: "رقم الملف", value: <span dir="ltr">{p?.mrn}</span> },
          { label: "رقم الجوال", value: <span dir="ltr">{mask(p?.phone)}</span> },
          { label: "تاريخ الميلاد", value: p?.date_of_birth ? fDate(p.date_of_birth) : null },
          { label: "رقم الهوية", value: <span dir="ltr">{mask(p?.national_id, 4)}</span> },
        ]} />
      </Card>
      <Card>
        <CardHeader title="الإشعارات" />
        <Preferences initial={{ exercise: prefs?.exercise_reminders ?? true, appointments: prefs?.appointment_reminders ?? true, messages: prefs?.messages ?? true, announcements: prefs?.announcements ?? true }} />
      </Card>
      <Card padded={false} className="overflow-hidden">
        {[
          ["/patient/team", Users, "فريق رعايتي"],
          ["/patient/appointments", Globe, "المواعيد"],
          ["/privacy", Shield, "سياسة الخصوصية"],
        ].map(([href, I, l]) => {
          const Icon = I as typeof Users;
          return (
            <Link key={href as string} href={href as string} className="flex items-center gap-3 border-b border-line-soft px-5 py-4 last:border-0 hover:bg-[#FCFAF7]">
              <Icon size={19} className="text-slate-600" /><span className="flex-1 text-ink">{l as string}</span><ChevronLeft size={18} className="text-text-3" />
            </Link>
          );
        })}
        <div className="flex items-center gap-3 px-5 py-4"><Globe size={19} className="text-slate-600" /><span className="flex-1 text-ink">اللغة</span><span className="text-sm text-text-2">العربية · English قريبًا</span></div>
      </Card>
      <form action={signOut}><Button variant="danger" block size="lg" icon={<LogOut size={18} />}>تسجيل الخروج</Button></form>
    </div>
  );
}
