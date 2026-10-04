import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/public-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = (await getServices()).find((x) => x.slug === slug);
  return { title: s?.name ?? "الخدمة" };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = (await getServices()).find((x) => x.slug === slug);
  if (!s) notFound();
  return (
    <>
      <PageHero eyebrow="خدمات التأهيل" title={s.name} description={s.summary}>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/request?service=${s.specialty_code ?? ""}`} size="lg">طلب موعد</ButtonLink>
          <ButtonLink href="/start" size="lg" variant="secondary">لست متأكدًا؟ ابدأ رحلتك</ButtonLink>
        </div>
      </PageHero>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">عن الخدمة</h2>
            <p className="mt-4 text-[1.0625rem] leading-[1.9] text-text">{s.description}</p>
          </Card>
          <Card className="p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">الحالات المستفيدة</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {s.conditions.map((c) => (
                <li key={c} className="flex items-start gap-3"><span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-sage-100 text-sage-700"><Check size={12} /></span><span>{c}</span></li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card tone="soft" className="p-8">
            <h2 className="text-lg font-semibold text-ink">طريقة الوصول للخدمة</h2>
            <ol className="mt-5 space-y-4">
              {s.access_steps.map((a, i) => (
                <li key={a} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-600 text-xs font-semibold text-ivory">{i + 1}</span><span className="pt-0.5 text-[0.9375rem] leading-relaxed">{a}</span></li>
              ))}
            </ol>
          </Card>
          <Card className="p-8">
            <h2 className="text-lg font-semibold text-ink">تعليمات عامة</h2>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-[0.9375rem] leading-relaxed text-text-2">{s.instructions.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>
        </div>
      </section>
    </>
  );
}
