import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone, Siren } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getCms } from "@/lib/public-data";

export const metadata: Metadata = { title: "تواصل معنا" };

export default async function ContactPage() {
  const cms = await getCms();
  const c = cms.contact ?? {};
  const rows: { days: string; time: string }[] = cms.hours?.rows ?? [];
  return (
    <>
      <PageHero eyebrow="تواصل معنا" title="نحن هنا لمساعدتك" description="للاستفسارات العامة وطلبات المواعيد. للحالات الطارئة اتصل بالطوارئ فورًا." />
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:px-8 md:grid-cols-2">
        <div className="space-y-4 rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow-sm)]">
          {[[Phone, "الهاتف", c.phone, true], [Mail, "البريد الإلكتروني", c.email, true], [MapPin, "العنوان", [c.address, c.city].filter(Boolean).join(" — "), false]].map(([I, l, v, ltr]) => {
            const Icon = I as typeof Phone;
            return (
              <div key={l as string} className="flex items-start gap-4 border-b border-line-soft pb-4 last:border-0 last:pb-0">
                <span className="grid size-11 place-items-center rounded-[14px] bg-sand-100 text-slate-600"><Icon size={20} /></span>
                <div><div className="text-sm text-text-2">{l as string}</div><div className="mt-0.5 text-lg font-medium text-ink" dir={ltr ? "ltr" : undefined}>{(v as string) || "—"}</div></div>
              </div>
            );
          })}
        </div>
        <div className="space-y-5">
          <div className="rounded-[28px] border border-line bg-surface p-8 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-3"><Clock className="text-sage-700" size={20} /><h2 className="font-semibold text-ink">ساعات العمل</h2></div>
            <ul className="mt-4 space-y-2">{rows.map((r) => <li key={r.days} className="flex justify-between"><span className="text-text-2">{r.days}</span><span className="font-medium text-ink">{r.time}</span></li>)}</ul>
          </div>
          <div className="rounded-[28px] border border-clay-200 bg-clay-50 p-8">
            <div className="flex items-center gap-3 text-clay-700"><Siren size={20} /><h2 className="font-semibold">حالة طارئة؟</h2></div>
            <p className="mt-2 text-clay-700">المنصة والرسائل ليست مخصصة للطوارئ. اتصل بـ <b dir="ltr">{c.emergency ?? "997"}</b> أو توجه لأقرب طوارئ.</p>
          </div>
          <ButtonLink href="/request" block size="lg">طلب موعد</ButtonLink>
        </div>
      </section>
    </>
  );
}
