import type { Metadata } from "next";
import { StartWizard } from "./start-wizard";
import { EmergencyNotice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "ابدأ رحلتك" };

export default function StartPage() {
  return (
    <section className="surface-travertine min-h-[70dvh]">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <div className="text-sm font-medium text-sage-700">ابدأ رحلتك</div>
        <h1 className="mt-2 font-display text-[2.5rem] font-semibold leading-tight text-ink">سؤال واحد، ونوجّهك للخطوة الصحيحة.</h1>
        <div className="mt-10 rounded-[32px] border border-line/70 bg-page/70 p-6 shadow-[var(--shadow-md)] backdrop-blur sm:p-8">
          <StartWizard />
        </div>
        <EmergencyNotice className="mt-6" />
      </div>
    </section>
  );
}
