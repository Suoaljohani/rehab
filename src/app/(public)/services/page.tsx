import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { ServiceIcon } from "@/components/public/service-icon";
import { getServices } from "@/lib/public-data";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "خدمات التأهيل" };

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <PageHero eyebrow="خدمات التأهيل" title="فريق متعدد التخصصات حول هدف واحد: تعافيك" description="اختر الخدمة لمعرفة الحالات المستفيدة وطريقة الوصول والتعليمات العامة." />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        {services.length === 0 ? (
          <EmptyState title="لا توجد خدمات منشورة حاليًا" />
        ) : (
          <div className="space-y-5">
            {services.map((s) => (
              <Link key={s.id} href={`/services/${s.slug}`} className="group grid grid-cols-1 gap-6 rounded-[28px] border border-line/80 bg-surface p-7 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] md:grid-cols-[auto_1fr_auto] md:items-center">
                <span className="grid size-16 place-items-center rounded-[20px] bg-sand-100 text-slate-600"><ServiceIcon name={s.icon} size={26} /></span>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">{s.name} <span className="ms-2 text-sm font-normal text-text-3" dir="ltr">{s.name_en}</span></h2>
                  <p className="mt-2 max-w-2xl leading-relaxed text-text-2">{s.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.conditions.slice(0, 4).map((c) => <span key={c} className="rounded-full bg-page px-3 py-1 text-xs text-text-2 ring-1 ring-line">{c}</span>)}
                  </div>
                </div>
                <ArrowLeft className="text-text-3 transition group-hover:-translate-x-1 group-hover:text-ink" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
