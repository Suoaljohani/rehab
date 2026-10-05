import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, ScanEye } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { ROLE_LABEL } from "@/lib/status";

export const metadata: Metadata = { title: "الأدوار والصلاحيات" };

const ROLES = ["patient", "provider", "supervisor", "content_reviewer", "admin", "super_admin"] as const;
type Level = "full" | "scope" | "own" | "none";

/** Mirrors the RLS policies and RPC checks in supabase/migrations — the database is the boundary, this page documents it. */
const MATRIX: { group: string; rows: { cap: string; v: Level[] }[] }[] = [
  { group: "السجل السريري", rows: [
    { cap: "عرض ملف المراجع والحلقة العلاجية", v: ["own", "scope", "full", "none", "full", "full"] },
    { cap: "الملاحظات السريرية الداخلية", v: ["none", "scope", "full", "none", "full", "full"] },
    { cap: "الأهداف والمقاييس والنتائج", v: ["own", "scope", "full", "none", "full", "full"] },
    { cap: "تغيير حالة الحلقة العلاجية", v: ["none", "scope", "full", "none", "full", "full"] },
  ]},
  { group: "البرامج والتمارين", rows: [
    { cap: "إنشاء البرنامج المنزلي ونشر نسخه", v: ["none", "scope", "full", "none", "full", "full"] },
    { cap: "تنفيذ التمارين وتسجيل الشعور والألم", v: ["own", "none", "none", "none", "none", "none"] },
    { cap: "إنشاء تمرين في المكتبة", v: ["none", "full", "full", "full", "full", "full"] },
    { cap: "اعتماد نسخة تمرين (فصل المهام)", v: ["none", "none", "full", "full", "full", "full"] },
  ]},
  { group: "التشغيل", rows: [
    { cap: "تسجيل مراجع وإنشاء حلقة", v: ["none", "none", "full", "none", "full", "full"] },
    { cap: "توزيع فريق الرعاية", v: ["none", "none", "full", "none", "full", "full"] },
    { cap: "جدولة المواعيد ومعالجة الطلبات", v: ["own", "scope", "full", "none", "full", "full"] },
    { cap: "الرسائل الآمنة", v: ["own", "scope", "full", "none", "full", "full"] },
    { cap: "التقارير والتصدير", v: ["own", "scope", "full", "none", "full", "full"] },
  ]},
  { group: "الحوكمة", rows: [
    { cap: "إدارة حسابات الموظفين والأدوار", v: ["none", "none", "none", "none", "full", "full"] },
    { cap: "منح دور المدير العام", v: ["none", "none", "none", "none", "none", "full"] },
    { cap: "إدارة محتوى الموقع والإعلانات", v: ["none", "none", "none", "none", "full", "full"] },
    { cap: "إعدادات النظام", v: ["none", "none", "none", "none", "full", "full"] },
    { cap: "سجل التدقيق", v: ["none", "none", "scope", "none", "full", "full"] },
  ]},
];

function Cell({ level }: { level: Level }) {
  if (level === "full") return <span className="mx-auto grid size-7 place-items-center rounded-full bg-slate-brand text-ivory" title="كامل"><Check size={15} strokeWidth={2.5} /><span className="sr-only">كامل</span></span>;
  if (level === "scope") return <span className="mx-auto grid size-7 place-items-center rounded-full bg-sage-100 text-sage-800 ring-1 ring-sage-300" title="ضمن النطاق"><ScanEye size={14} /><span className="sr-only">ضمن النطاق المسند</span></span>;
  if (level === "own") return <span className="mx-auto grid h-7 place-items-center rounded-full bg-sand-100 px-2 text-[11px] font-medium text-clay-700 ring-1 ring-sand-300" title="بياناته فقط">ذاتي</span>;
  return <span className="mx-auto grid size-7 place-items-center text-text-3" title="لا يوجد"><Minus size={14} /><span className="sr-only">لا يوجد</span></span>;
}

export default async function Roles() {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id, full_name, role, status").neq("role", "patient").is("removed_at", null).order("full_name");
  const { count: patients } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient").is("removed_at", null);
  const byRole = (r: string) => (people ?? []).filter((p) => p.role === r);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="الحوكمة" title="الأدوار والصلاحيات" description="الصلاحية = الدور + النطاق. تُفرض في قاعدة البيانات عبر سياسات أمان الصفوف، وليس عبر إخفاء الواجهة فقط." />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ROLES.map((r) => (
          <Card key={r} className="p-4">
            <div className="text-xs text-text-2">{ROLE_LABEL[r]}</div>
            <div className="mt-1 font-display text-2xl text-ink tabular-nums">{r === "patient" ? patients ?? 0 : byRole(r).length}</div>
          </Card>
        ))}
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 py-4">
          <h2 className="font-semibold text-ink">مصفوفة الصلاحيات</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-2">
            <span className="flex items-center gap-1.5"><Cell level="full" /> كامل</span>
            <span className="flex items-center gap-1.5"><Cell level="scope" /> ضمن الحالات المسندة</span>
            <span className="flex items-center gap-1.5"><Cell level="own" /> بياناته فقط</span>
          </div>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="sticky top-0 bg-surface-soft">
              <tr><th scope="col" className="px-6 py-3 text-start font-medium text-text-2">الصلاحية</th>{ROLES.map((r) => <th key={r} scope="col" className="w-28 px-2 py-3 text-center text-xs font-medium text-text-2">{ROLE_LABEL[r]}</th>)}</tr>
            </thead>
            {MATRIX.map((g) => (
              <tbody key={g.group}>
                <tr><th colSpan={ROLES.length + 1} scope="colgroup" className="bg-[#FCFAF7] px-6 pb-2 pt-4 text-start text-xs font-semibold tracking-wide text-slate-600">{g.group}</th></tr>
                {g.rows.map((row) => (
                  <tr key={row.cap} className="border-t border-line-soft hover:bg-sand-50/50">
                    <th scope="row" className="px-6 py-3 text-start font-normal text-text">{row.cap}</th>
                    {row.v.map((l, i) => <td key={i} className="px-2 py-2.5 text-center"><Cell level={l} /></td>)}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>

      <Notice tone="sage" className="mt-6" title="مبادئ مُطبّقة">
        مقدم الرعاية يرى فقط الحالات التي هو عضو نشط في فريق رعايتها. المراجع يرى بياناته فقط ولا يرى الملاحظات الداخلية. منشئ نسخة التمرين لا يعتمدها بنفسه. لا يمكن للمستخدم تعطيل حسابه أو تغيير دوره. سجل التدقيق لا يقبل التعديل أو الحذف.
      </Notice>

      <h2 className="mb-4 mt-10 font-semibold text-ink">أعضاء كل دور</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROLES.filter((r) => r !== "patient").map((r) => (
          <Card key={r}>
            <CardHeader title={ROLE_LABEL[r]} action={<Badge size="sm" tone="muted">{byRole(r).length}</Badge>} />
            {byRole(r).length === 0 ? <p className="text-sm text-text-3">لا يوجد أعضاء.</p> : (
              <ul className="space-y-2">
                {byRole(r).map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/team/${p.id}`} className="flex items-center gap-3 rounded-[12px] p-1.5 hover:bg-sand-50">
                      <Avatar name={p.full_name} size="sm" />
                      <span className="flex-1 text-sm text-ink">{p.full_name}</span>
                      {p.status !== "active" && <Badge size="sm" tone="danger">موقوف</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-text-2">لتغيير دور موظف افتح ملفه في «فريق التأهيل». تغيير الدور يُسجَّل في سجل التدقيق.</p>
    </div>
  );
}
