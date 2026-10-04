import type { Metadata } from "next";
import { BookOpen, HeartPulse, MessageCircle, PlayCircle } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { EmergencyNotice } from "@/components/ui/notice";
import { getCms } from "@/lib/public-data";

export const metadata: Metadata = { title: "دليل المراجع" };
const ICONS = [BookOpen, PlayCircle, HeartPulse, MessageCircle];

export default async function GuidePage() {
  const cms = await getCms();
  const sections: { title: string; body: string }[] = cms.patient_guide?.sections ?? [];
  return (
    <>
      <PageHero eyebrow="دليل المراجع" title="كل ما تحتاج معرفته قبل رحلتك وأثناءها" />
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {sections.map((s, i) => {
            const I = ICONS[i % ICONS.length];
            return (
              <article key={s.title} className="rounded-[28px] border border-line/80 bg-surface p-8 shadow-[var(--shadow-sm)]">
                <span className="grid size-12 place-items-center rounded-[16px] bg-sage-50 text-sage-700"><I size={22} /></span>
                <h2 className="mt-6 font-display text-xl font-semibold text-ink">{s.title}</h2>
                <p className="mt-2 leading-relaxed text-text-2">{s.body}</p>
              </article>
            );
          })}
        </div>
        <EmergencyNotice className="mt-10" />
      </section>
    </>
  );
}
