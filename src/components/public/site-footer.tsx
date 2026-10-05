import Link from "next/link";
import { HospitalLogo, type BrandProps } from "@/components/brand/co-brand";
import { Logo } from "@/components/brand/logo";
import { PoweredBy } from "@/components/brand/powered-by";

type Contact = { phone?: string; email?: string; address?: string; city?: string; emergency?: string };
type Hours = { rows?: { days: string; time: string }[] };

export function SiteFooter({ contact, hours, brand }: { contact?: Contact; hours?: Hours; brand?: BrandProps }) {
  return (
    <footer className="surface-ink text-ivory">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          {brand?.logoUrl ? (
            <div className="space-y-5">
              <HospitalLogo brand={brand} variant="full" tone="light" className="h-28" />
              <div className="flex items-center gap-3 text-xs text-ivory/45"><Logo tone="light" subtitle={false} /><span>المنصة الرقمية لقسم التأهيل الطبي</span></div>
            </div>
          ) : <Logo tone="light" />}
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ivory/65">منصة رقمية تمتد بها رعايتك التأهيلية من العيادة إلى منزلك — بهدوء، ووضوح، ومتابعة مستمرة.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-clay-300/30 bg-clay-400/10 px-3.5 py-1.5 text-xs text-clay-200">
            الحالات الطارئة: اتصل بـ <b dir="ltr">{contact?.emergency ?? "997"}</b>
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-ivory">المنصة</h3>
          <ul className="space-y-2.5 text-sm text-ivory/65">
            <li><Link href="/services" className="hover:text-ivory">خدماتنا</Link></li>
            <li><Link href="/start" className="hover:text-ivory">ابدأ رحلتك</Link></li>
            <li><Link href="/request" className="hover:text-ivory">طلب موعد</Link></li>
            <li><Link href="/track" className="hover:text-ivory">متابعة طلب</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-ivory">المساعدة</h3>
          <ul className="space-y-2.5 text-sm text-ivory/65">
            <li><Link href="/guide" className="hover:text-ivory">دليل المراجع</Link></li>
            <li><Link href="/faq" className="hover:text-ivory">الأسئلة الشائعة</Link></li>
            <li><Link href="/privacy" className="hover:text-ivory">الخصوصية وحماية البيانات</Link></li>
            <li><Link href="/contact" className="hover:text-ivory">تواصل معنا</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-ivory">ساعات العمل</h3>
          <ul className="space-y-2.5 text-sm text-ivory/65">
            {(hours?.rows ?? []).map((r) => (
              <li key={r.days} className="flex justify-between gap-4"><span>{r.days}</span><span className="text-ivory/85">{r.time}</span></li>
            ))}
          </ul>
          {contact?.phone && <p className="mt-4 text-sm text-ivory/65">الهاتف: <span dir="ltr" className="text-ivory/85">{contact.phone}</span></p>}
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-ivory/45 sm:px-8">
          <span>© {new Date().getFullYear()} {brand?.hospitalName ? `${brand.hospitalName} · ` : ""}مَسار — قسم التأهيل الطبي</span>
          <span>المنصة ليست بديلًا للطوارئ ولا تقدم تشخيصًا طبيًا.</span>
          <PoweredBy tone="light" className="w-full justify-center sm:w-auto" />
        </div>
      </div>
    </footer>
  );
}
