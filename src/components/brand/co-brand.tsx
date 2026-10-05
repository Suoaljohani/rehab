import { cn } from "@/lib/cn";
import { Logo, LogoMark } from "./logo";

export type BrandProps = { hospitalName: string | null; hospitalNameEn?: string | null; logoUrl: string | null };

/**
 * The hospital's official logo. Rendered as <img> (never inlined) so an uploaded
 * SVG can never execute script in the page. On dark surfaces it sits on an
 * ivory plate so the hospital's own colours stay true.
 */
export function HospitalLogo({ brand, tone = "default", className }: { brand: BrandProps; tone?: "default" | "light"; className?: string }) {
  if (!brand.logoUrl) return null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt={brand.hospitalName ?? "شعار المستشفى"} className={cn("block h-10 w-auto max-w-[11rem] object-contain", className)} />
  );
  return tone === "light" ? <span className="inline-flex rounded-[12px] bg-ivory px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">{img}</span> : img;
}

/**
 * Co-branding lockup: hospital logo (the institution) · hairline · مَسار (the platform).
 * Falls back to the platform logo alone until an official logo is uploaded.
 */
export function BrandLockup({ brand, tone = "default", compact = false, stacked = false, className, logoClassName }: { brand?: BrandProps | null; tone?: "default" | "light"; compact?: boolean; stacked?: boolean; className?: string; logoClassName?: string }) {
  if (!brand?.logoUrl) return <Logo tone={tone} className={className} />;
  if (stacked) {
    // Narrow columns (staff sidebar): institution on top, platform beneath.
    return (
      <span className={cn("flex flex-col items-start gap-3", className)}>
        <HospitalLogo brand={brand} tone={tone} className={logoClassName} />
        <span className="inline-flex items-center gap-2">
          <LogoMark tone={tone} className="size-7" />
          <span className={cn("font-display text-base font-semibold", tone === "light" ? "text-ivory" : "text-ink")}>مَسار</span>
          <span className={cn("text-[0.6875rem]", tone === "light" ? "text-ivory/50" : "text-text-2")}>· منصة التأهيل الطبي</span>
        </span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <HospitalLogo brand={brand} tone={tone} className={logoClassName} />
      <span aria-hidden="true" className={cn("h-8 w-px", tone === "light" ? "bg-ivory/15" : "bg-line")} />
      {compact ? (
        <span className="inline-flex items-center gap-2">
          <LogoMark tone={tone} className="size-8" />
          <span className={cn("font-display text-lg font-semibold", tone === "light" ? "text-ivory" : "text-ink")}>مَسار</span>
        </span>
      ) : (
        <Logo tone={tone} />
      )}
    </span>
  );
}
