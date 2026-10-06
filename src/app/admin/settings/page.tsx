import type { Metadata } from "next";
import { BellRing, Clock, KeyRound, ShieldCheck, Stethoscope } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { fDateTime } from "@/lib/format";
import { smsFailureText } from "@/lib/sms";
import { NewSpecialty, SettingChoice, SettingNumber, SettingToggle, SpecialtyRow } from "./controls";

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
          </ul>
        </Card>

        <SmsHealth channel={String(S.otp_channel?.value ?? "whatsapp")} fallback={S.otp_sms_fallback?.value !== false} />

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
          <CardHeader title="قنوات الإشعار" description="رموز دخول المراجعين تُرسل على واتساب مع احتياط برسالة نصية. التذكيرات الخارجية مؤجلة للمرحلة الثانية." />
          <div className="flex flex-wrap gap-2">
            <Badge tone="sage" dot>داخل المنصة — مفعّلة</Badge>
            <Badge tone="sage" dot>واتساب / SMS — رموز الدخول مفعّلة</Badge>
            <Badge tone="muted">البريد — المرحلة الثانية</Badge>
            <Badge tone="muted">Push — المرحلة الثانية</Badge>
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm text-text-2"><Stethoscope size={16} className="mt-0.5 shrink-0" /> المنصة لا تستقبل الحالات الطارئة. يظهر رقم الطوارئ المحدد في «إدارة الموقع» في كل تنبيه سلامة.</div>
        </Card>
      </div>
    </div>
  );
}


async function SmsHealth({ channel, fallback }: { channel: string; fallback: boolean }) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 864e5).toISOString();
  const [{ data: day }, { data: lastFail }] = await Promise.all([
    supabase.from("sms_deliveries").select("event").gte("created_at", since),
    supabase.from("sms_deliveries").select("event, channel, error_code, provider_code, http_status, created_at").in("event", ["failed", "rate_limited", "phone_conflict", "no_phone"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { data: last } = await supabase.from("sms_deliveries").select("event, created_at").in("event", ["sent", "failed", "rate_limited"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const count = (e: string) => (day ?? []).filter((d) => d.event === e).length;
  const healthy = !last || last.event === "sent";
  const stats: [string, number][] = [["أُرسلت", count("sent")], ["دخول ناجح", count("verified")], ["رموز مرفوضة", count("rejected")], ["تعذّر الإرسال", count("failed") + count("rate_limited")]];
  return (
    <Card className="p-6">
      <CardHeader title="رموز دخول المراجعين" description="يدخل المراجع برقم هويته، ويصله رمز التحقق على واتساب أو برسالة نصية عبر Twilio Verify من خلال Supabase Auth."
        action={!last ? <Badge tone="muted">لم يُرسل بعد</Badge> : healthy ? <Badge tone="success" dot>يعمل</Badge> : <Badge tone="danger" dot>يحتاج انتباهًا</Badge>} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-surface-soft/60 p-4 ring-1 ring-line-soft">
        <div><div className="text-sm font-medium text-ink">قناة الإرسال</div><div className="mt-0.5 text-xs text-text-2">تنطبق فورًا على كل طلبات الدخول الجديدة.</div></div>
        <SettingChoice settingKey="otp_channel" value={channel === "sms" ? "sms" : "whatsapp"} label="قناة إرسال الرمز" options={[{ value: "whatsapp", label: "واتساب" }, { value: "sms", label: "رسالة نصية" }]} />
        {channel !== "sms" && (
          <div className="flex w-full items-center justify-between gap-4 border-t border-line-soft pt-3">
            <div className="text-sm text-text">إرسال الرمز برسالة نصية تلقائيًا إذا تعذّر واتساب</div>
            <SettingToggle settingKey="otp_sms_fallback" value={fallback} label="الاحتياط برسالة نصية" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([l, n]) => (
          <div key={l} className="rounded-[14px] bg-surface-soft p-4 ring-1 ring-line-soft">
            <div className="font-display text-2xl tabular-nums text-ink">{n}</div>
            <div className="mt-0.5 text-xs text-text-2">{l} · آخر ٢٤ ساعة</div>
          </div>
        ))}
      </div>
      {lastFail && (
        <Notice tone={healthy ? "neutral" : "warning"} className="mt-4" title={`آخر تعذّر · ${lastFail.channel === "whatsapp" ? "واتساب" : "رسالة نصية"} · ${fDateTime(lastFail.created_at)}`}>
          {lastFail.event === "no_phone" ? "لا يوجد رقم جوال صالح للمراجع." : smsFailureText(lastFail.error_code, lastFail.provider_code)}{lastFail.provider_code && <span dir="ltr" className="ms-2 font-mono text-xs opacity-70">Twilio {lastFail.provider_code}</span>}
        </Notice>
      )}
      <p className="mt-4 text-xs leading-relaxed text-text-2">لا يظهر رمز التحقق على الشاشة أبدًا، ولا تُرسل رسائل لبيانات العيّنة. يُسمح برمز واحد كل دقيقة لكل مراجع، و٥ طلبات كل ١٥ دقيقة لكل رقم هوية.</p>
    </Card>
  );
}
