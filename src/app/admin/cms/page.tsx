import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { Notice } from "@/components/ui/notice";
import { buttonClasses } from "@/components/ui/button";
import { fDateTime } from "@/lib/format";
import { BannerEditor, FaqEditor, NewServiceButton, ObjectBlockEditor, RowsBlockEditor, ServiceEditor } from "./editors";
import { IdentityEditor } from "./identity";
import { getBrand } from "@/lib/brand";

export const metadata: Metadata = { title: "إدارة الموقع" };

const TABS = [["identity", "هوية المستشفى"], ["home", "الصفحة الرئيسية"], ["contact", "التواصل والساعات"], ["guide", "دليل المراجع"], ["services", "الخدمات"], ["faq", "الأسئلة الشائعة"]] as const;

export default async function Cms({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole(["admin", "super_admin"]);
  const { tab = "identity" } = await searchParams;
  const supabase = await createClient();
  const [{ data: blocks }, { data: services }, { data: faqs }] = await Promise.all([
    supabase.from("cms_blocks").select("key, content, updated_at, profiles!cms_blocks_updated_by_fkey(full_name)"),
    supabase.from("services").select("*").order("sort"),
    supabase.from("faqs").select("*").order("sort"),
  ]);
  const B: Record<string, { content: Record<string, unknown>; updated_at: string; by?: string }> = {};
  (blocks ?? []).forEach((b) => { B[b.key] = { content: b.content as Record<string, unknown>, updated_at: b.updated_at, by: (b.profiles as unknown as { full_name: string } | null)?.full_name }; });
  const stamp = (k: string) => B[k] ? `آخر تحديث ${fDateTime(B[k].updated_at)}${B[k].by ? ` · ${B[k].by}` : ""}` : "لم يُنشر بعد";
  const preview = { identity: "/", home: "/", contact: "/contact", guide: "/guide", services: "/services", faq: "/faq" }[tab] ?? "/";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="البوابة العامة" title="إدارة محتوى الموقع" description="كل تحديث يُنشر فورًا ويُسجَّل في سجل التدقيق. لا يُعرض أي محتوى طبي شخصي على الموقع العام."
        actions={<a href={preview} target="_blank" rel="noreferrer" className={buttonClasses("secondary")}><ExternalLink size={16} /> معاينة الصفحة</a>} />
      <LinkTabs className="mb-6" items={TABS.map(([k, l]) => ({ href: `/admin/cms?tab=${k}`, label: l, active: tab === k }))} />

      {tab === "identity" && (
        <Card className="p-6">
          <CardHeader title="الشعار الرسمي للمستشفى" description={stamp("brand")} />
          <IdentityEditor brand={await getBrand()} stored={{ logo: !!B.brand?.content.logo_url, mark: !!B.brand?.content.logo_mark_url, full: !!B.brand?.content.logo_full_url }} />
        </Card>
      )}

      {tab === "home" && (
        <div className="space-y-6">
          <Card className="p-6">
            <CardHeader title="واجهة الصفحة الرئيسية" description={stamp("home_hero")} />
            <ObjectBlockEditor blockKey="home_hero" initial={B.home_hero?.content ?? {}} fields={[
              { key: "eyebrow", label: "العنوان التمهيدي" },
              { key: "primary_cta", label: "زر الإجراء الرئيسي" },
              { key: "title", label: "العنوان الرئيسي", multiline: true },
              { key: "subtitle", label: "الوصف", multiline: true },
              { key: "secondary_cta", label: "الزر الثانوي" },
            ]} />
          </Card>
          <Card className="p-6">
            <CardHeader title="شريط الإعلان العام" description={stamp("announcement_banner")} />
            <BannerEditor initial={(B.announcement_banner?.content ?? {}) as { enabled?: boolean; text?: string }} />
          </Card>
        </div>
      )}

      {tab === "contact" && (
        <div className="space-y-6">
          <Card className="p-6">
            <CardHeader title="بيانات التواصل" description={stamp("contact")} />
            <ObjectBlockEditor blockKey="contact" initial={B.contact?.content ?? {}} fields={[
              { key: "phone", label: "الهاتف الموحد", dir: "ltr" },
              { key: "whatsapp", label: "واتساب (اختياري)", dir: "ltr" },
              { key: "email", label: "البريد الإلكتروني", dir: "ltr" },
              { key: "city", label: "المدينة" },
              { key: "address", label: "العنوان", multiline: true },
              { key: "map_url", label: "رابط الخريطة (اختياري)", dir: "ltr" },
              { key: "emergency", label: "رقم الطوارئ", dir: "ltr", hint: "يظهر في كل تنبيه سلامة على المنصة." },
            ]} />
          </Card>
          <Card className="p-6">
            <CardHeader title="ساعات العمل" description={stamp("hours")} />
            <RowsBlockEditor blockKey="hours" listKey="rows" initial={B.hours?.content ?? {}} addLabel="إضافة فترة" cols={[{ key: "days", label: "الأيام" }, { key: "time", label: "الوقت" }]} />
          </Card>
        </div>
      )}

      {tab === "guide" && (
        <Card className="p-6">
          <CardHeader title="أقسام دليل المراجع" description={stamp("patient_guide")} />
          <Notice tone="sage" className="mb-5">اكتب بلغة بسيطة ومطمئنة. تجنب أي إرشاد علاجي فردي — الدليل عام لكل المراجعين.</Notice>
          <RowsBlockEditor blockKey="patient_guide" listKey="sections" initial={B.patient_guide?.content ?? {}} addLabel="إضافة قسم" cols={[{ key: "title", label: "العنوان" }, { key: "body", label: "النص", multiline: true }]} />
        </Card>
      )}

      {tab === "services" && (
        <div className="space-y-3">
          <NewServiceButton />
          <p className="mb-2 mt-4 text-sm text-text-2">افتح الخدمة لتعديلها. «إخفاء» يزيلها من الموقع مؤقتًا، و«حذف» يزيلها نهائيًا.</p>
          {(services ?? []).map((s) => <ServiceEditor key={s.id} service={s} />)}
        </div>
      )}

      {tab === "faq" && (
        <div className="space-y-4">
          <FaqEditor isNew faq={{ question: "", answer: "", sort: (faqs?.length ?? 0) + 1, is_published: true }} />
          {(faqs ?? []).map((f) => <FaqEditor key={f.id} faq={{ id: f.id, question: f.question, answer: f.answer, sort: f.sort, is_published: f.is_published }} />)}
        </div>
      )}
    </div>
  );
}
