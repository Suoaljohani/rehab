import type { Metadata } from "next";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "تم استلام طلبك" };

export default async function Confirmation({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <section className="surface-travertine">
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="relative mx-auto size-24">
          <div className="absolute inset-0 rounded-full bg-sage-200/60 animate-[breathe_5s_ease-in-out_infinite]" />
          <div className="relative grid size-24 place-items-center rounded-full bg-sage-600 text-white shadow-[var(--shadow-md)]"><Check size={40} strokeWidth={2.4} /></div>
        </div>
        <h1 className="mt-8 font-display text-[2.5rem] font-semibold text-ink">تم استلام طلبك.</h1>
        <p className="mt-3 text-lg text-text-2">سيراجع قسم التأهيل الطبي طلبك ويتواصل معك قريبًا.</p>
        <div className="mx-auto mt-10 max-w-sm rounded-[24px] border border-line bg-surface p-6 shadow-[var(--shadow-sm)]">
          <div className="text-sm text-text-2">رقم الطلب</div>
          <div className="mt-2 font-mono text-3xl font-semibold tracking-wider text-ink" dir="ltr">{ref ?? "—"}</div>
          <p className="mt-3 text-xs text-text-2">احتفظ بهذا الرقم — ستحتاجه مع رقم جوالك لمتابعة الطلب.</p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/track?ref=${ref ?? ""}`}>متابعة الطلب</ButtonLink>
          <ButtonLink href="/" variant="secondary">الصفحة الرئيسية</ButtonLink>
        </div>
      </div>
    </section>
  );
}
