import type { Metadata } from "next";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { fDateTime } from "@/lib/format";
import { AnnouncementForm, PublishButton, TemplateMsgForm } from "./forms";

export const metadata: Metadata = { title: "التواصل" };

export default async function Communications() {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const [{ data: anns }, { data: tpls }, { count: sent }] = await Promise.all([
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("message_templates").select("*").order("name"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
  ]);
  const A: Record<string, string> = { all: "الجميع", patients: "المراجعون", staff: "الموظفون" };
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="مركز التواصل" description="الإعلانات، قوالب الرسائل، وقنوات الإشعار." />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[[Bell, "داخل المنصة", "مفعّلة", "sage"], [Smartphone, "رسائل SMS", "المرحلة الثانية", "muted"], [Mail, "البريد الإلكتروني", "المرحلة الثانية", "muted"], [MessageSquare, "إشعارات Push", "المرحلة الثانية", "muted"]].map(([I, l, s, t]) => {
          const Icon = I as typeof Bell;
          return <Card key={l as string} className="p-5"><Icon size={20} className="text-slate-600" /><div className="mt-3 font-medium text-ink">{l as string}</div><Badge size="sm" tone={t as "sage" | "muted"} className="mt-2">{s as string}</Badge></Card>;
        })}
      </div>
      <p className="mb-6 text-sm text-text-2">أُرسل {sent ?? 0} إشعار داخل المنصة خلال آخر ٧ أيام (معاملات، تذكيرات، إعلانات). التنبيهات غير الإلزامية تخضع لتفضيلات المستخدم.</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit p-6"><CardHeader title="إعلان جديد" /><AnnouncementForm /></Card>
        <Card>
          <CardHeader title="الإعلانات" />
          {(anns ?? []).length === 0 ? <EmptyState compact title="لا توجد إعلانات" /> : (
            <ul className="divide-y divide-line-soft">{(anns ?? []).map((a) => (
              <li key={a.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-semibold text-ink">{a.title}</div><div className="mt-0.5 text-xs text-text-2">{A[a.audience]} · {a.published_at ? `نُشر ${fDateTime(a.published_at)}` : "مسودة"}</div></div>
                  {a.is_published ? <Badge tone="success" size="sm" dot>منشور</Badge> : <PublishButton id={a.id} />}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text">{a.body}</p>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit p-6"><CardHeader title="قالب رسالة جديد" description="يظهر لمقدمي الرعاية كردود سريعة." /><TemplateMsgForm /></Card>
        <Card><CardHeader title="قوالب الرسائل" />
          <ul className="space-y-3">{(tpls ?? []).map((t) => <li key={t.id} className="rounded-[14px] bg-sand-50 p-3 ring-1 ring-sand-200"><div className="text-sm font-semibold text-ink">{t.name}</div><p className="mt-1 text-sm text-text-2">{t.body}</p></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
