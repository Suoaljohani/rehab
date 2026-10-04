import type { Metadata } from "next";
import { RequestForm } from "./request-form";
import { getSpecialties } from "@/lib/public-data";
import { EmergencyNotice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "طلب موعد" };

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ service?: string; type?: string }> }) {
  const { service, type } = await searchParams;
  const specialties = await getSpecialties();
  return (
    <section className="surface-travertine">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="text-sm font-medium text-sage-700">{type === "referral" ? "لدي إحالة" : "طلب موعد"}</div>
          <h1 className="mt-2 font-display text-[2.5rem] font-semibold leading-tight text-ink">لنبدأ رحلتك معًا</h1>
          <p className="mt-4 leading-relaxed text-text-2">املأ البيانات الأساسية وسنتواصل معك لتأكيد الموعد. ستحصل على رقم طلب لمتابعة حالته في أي وقت.</p>
          <ol className="mt-10 space-y-5">
            {["ترسل الطلب ويصلك رقم مرجعي", "يراجع القسم طلبك خلال أيام العمل", "نتواصل معك لتحديد الموعد", "تبدأ رحلتك بالتقييم الأولي"].map((s, i) => (
              <li key={s} className="flex items-center gap-4"><span className="grid size-9 place-items-center rounded-full border border-sage-200 bg-surface text-sm font-semibold text-sage-700">{i + 1}</span><span className="text-text">{s}</span></li>
            ))}
          </ol>
          <EmergencyNotice className="mt-10" />
        </div>
        <div className="rounded-[32px] border border-line/70 bg-surface p-6 shadow-[var(--shadow-md)] sm:p-10">
          <RequestForm specialties={specialties} defaultService={service} journey={type} />
        </div>
      </div>
    </section>
  );
}
