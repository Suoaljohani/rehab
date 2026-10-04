import type { Metadata } from "next";
import { BellRing, Clock, KeyRound, ShieldCheck, Smartphone, Stethoscope } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { fDateTime } from "@/lib/format";
import { NewSpecialty, SettingNumber, SettingToggle, SpecialtyRow } from "./controls";

export const metadata: Metadata = { title: "الإعدادات" };

type Row = { key: string; value: unknown; description: string | null; updated_at: string; profiles: { full_name: string } | null };

export default async function Settings() {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const [{ data: settings }, { data: specs }] = await Promise.all([
    supabase.from("system_settings").select("key, value, description, updated_at, profiles!system_settings_updated_by_fkey(full_name)"),
    supabase.from("specialties").select("code, name, name_en, sort").order("sort"),
  ]);
  const S: Record<string, Row> = {};
  ((settings ?? []) as unknown as Row[]).forEach((s) => (S[s.key] = s));
  const meta = (k: string) => S[k] ? <span className="text-xs text-text-3">{S[k].profiles ? `عدّله ${S[k].profiles!.full_name} · ` : ""}{fDateTime(S[k].updated_at)}</span> : null;
  const num = (k: string, d: number) => Number(S[k]?.value ?? d);
  const bool = (k: string) => S[k]?.value === true;

  const Item = ({ icon: Icon, k, title, children }: { icon: typeof Clock; k: string; title: string; children: React.ReactNode }) => (
    <li className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-1 last:pb-1">
      <div className="flex min-w-0 max-w-xl gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-sand-50 text-slate-600 ring-1 ring-sand-200"><Icon size={18} /></span>
        <div>
          <div className="font-medium text-ink">{title}</div>
          <p className="mt-0.5 text-sm leading-relaxed text-text-2">{S[k]?.description}</p>
          <div className="mt-1">{meta(k)}</div>
        </div>
      </div>
      {children}
    </li>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="الحوكمة" title="إعدادات النظام" description="قيم تشغيلية تؤثر في كل المستخدمين. كل تعديل يُسجَّل في سجل التدقيق مع القيمة السابقة." />

      {bool("demo_mode") && (
        <Notice tone="warning" title="وضع العرض مفعّل" className="mb-6">رمز التحقق يظهر على شاشة الدخول بدل إرساله برسالة نصية. أوقفه قبل الإطلاق وبعد ربط مزوّد الرسائل.</Notice>
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <CardHeader title="الأمان والدخول" />
          <ul className="divide-y divide-line-soft">
            <Item icon={ShieldCheck} k="staff_mfa_required" title="إلزام الموظفين بالتحقق الثنائي">
              <SettingToggle settingKey="staff_mfa_required" value={bool("staff_mfa_required")} label="إلزام الموظفين بالتحقق الثنائي"
                confirmOn="سيُطلب من كل موظف إعداد تطبيق المصادقة قبل الوصول إلى بيانات المراجعين." confirmOff="سيصبح التحقق الثنائي اختياريًا للموظفين." />
            </Item>
            <Item icon={Clock} k="session_timeout_minutes" title="مهلة الخمول للموظفين">
              <SettingNumber settingKey="session_timeout_minutes" value={num("session_timeout_minutes", 30)} min={5} max={240} unit="دقيقة" label="مهلة الخمول" />
            </Item>
            <Item icon={Smartphone} k="demo_mode" title="وضع العرض">
              <SettingToggle settingKey="demo_mode" value={bool("demo_mode")} label="وضع العرض"
                confirmOn="سيظهر رمز التحقق على الشاشة لأي شخص يعرف رقم الوصول. استخدمه للعرض والتجربة فقط." confirmOff="لن يظهر رمز التحقق على الشاشة. تأكد من ربط مزوّد الرسائل النصية أولًا." />
            </Item>
          </ul>
        </Card>

        <Card className="p-6">
          <CardHeader title="قواعد تنبيهات المتابعة" description="تحدد متى يظهر المراجع في قائمة «يحتاج انتباهك» لدى مقدم الرعاية." />
          <ul className="divide-y divide-line-soft">
            <Item icon={BellRing} k="pain_flag_threshold" title="حد الألم">
              <SettingNumber settingKey="pain_flag_threshold" value={num("pain_flag_threshold", 7)} min={1} max={10} unit="من ١٠" label="حد الألم" />
            </Item>
            <Item icon={KeyRound} k="inactivity_days" title="عدم النشاط">
              <SettingNumber settingKey="inactivity_days" value={num("inactivity_days", 3)} min={1} max={30} unit="أيام" label="أيام عدم النشاط" />
            </Item>
            <Item icon={Clock} k="program_ending_days" title="قرب انتهاء البرنامج">
              <SettingNumber settingKey="program_ending_days" value={num("program_ending_days", 3)} min={1} max={30} unit="أيام" label="أيام قبل الانتهاء" />
            </Item>
          </ul>
          <p className="mt-4 text-xs text-text-2">المنطقة الزمنية للنظام: <span dir="ltr" className="font-mono">{String(S.timezone?.value ?? "Asia/Riyadh")}</span> — تُحسب «اليوم» والالتزام والمواعيد وفقها.</p>
        </Card>

        <Card className="p-6">
          <CardHeader title="التخصصات" description="مرجع موحّد للفريق والخدمات والتوزيع. لا تُحذف التخصصات للحفاظ على السجلات السابقة." action={<NewSpecialty />} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead><tr className="text-start text-xs text-text-2"><th className="pb-2 pe-3 text-start font-medium">الرمز</th><th className="pb-2 pe-3 text-start font-medium">الاسم</th><th className="pb-2 pe-3 text-start font-medium">English</th><th className="pb-2 pe-3 text-start font-medium">الترتيب</th><th /></tr></thead>
              <tbody>{(specs ?? []).map((s) => <SpecialtyRow key={s.code} code={s.code} name={s.name} nameEn={s.name_en} sort={s.sort} />)}</tbody>
            </table>
          </div>
        </Card>

        <Card tone="soft" className="p-6">
          <CardHeader title="قنوات الإشعار" description="القنوات الخارجية مؤجلة للمرحلة الثانية وفق وثيقة المتطلبات." />
          <div className="flex flex-wrap gap-2">
            <Badge tone="sage" dot>داخل المنصة — مفعّلة</Badge>
            <Badge tone="muted">SMS — المرحلة الثانية</Badge>
            <Badge tone="muted">البريد — المرحلة الثانية</Badge>
            <Badge tone="muted">Push — المرحلة الثانية</Badge>
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm text-text-2"><Stethoscope size={16} className="mt-0.5 shrink-0" /> المنصة لا تستقبل الحالات الطارئة. يظهر رقم الطوارئ المحدد في «إدارة الموقع» في كل تنبيه سلامة.</div>
        </Card>
      </div>
    </div>
  );
}
