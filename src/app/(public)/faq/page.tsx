import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { getFaqs } from "@/lib/public-data";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "الأسئلة الشائعة" };

export default async function FaqPage() {
  const faqs = await getFaqs();
  return (
    <>
      <PageHero eyebrow="الأسئلة الشائعة" title="إجابات واضحة لأسئلتك" />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        {faqs.length === 0 ? <EmptyState title="لا توجد أسئلة منشورة" /> : (
          <div className="divide-y divide-line rounded-[24px] border border-line bg-surface shadow-[var(--shadow-sm)]">
            {faqs.map((f) => (
              <details key={f.id} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.0625rem] font-medium text-ink">
                  {f.question}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sand-100 text-text-2 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-text-2">{f.answer}</p>
              </details>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
