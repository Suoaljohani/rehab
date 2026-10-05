import { cn } from "@/lib/cn";
import { Logo, LogoMark } from "./logo";

export type BrandProps = {
  hospitalName: string | null;
  hospitalNameEn?: string | null;
  cluster?: string | null;
  logoUrl: string | null;
  markUrl?: string | null;
  fullUrl?: string | null;
};

type Variant = "logo" | "mark" | "full";

/**
 * The hospital's official logo. Rendered as <img> (never inlined) so an uploaded
 * SVG can never execute script in the page. On dark surfaces it sits on an
 * ivory plate so the hospital's own colours stay true.
 */
export function HospitalLogo({ brand, variant = "logo", tone = "default", className }: { brand: BrandProps; variant?: Variant; tone?: "default" | "light"; className?: string }) {
  const src = variant === "mark" ? brand.markUrl ?? brand.logoUrl : variant === "full" ? brand.fullUrl ?? brand.logoUrl : brand.logoUrl;
  if (!src) return null;
  const alt = [brand.hospitalName, brand.hospitalNameEn].filter(Boolean).join(" — ") || "شعار المستشفى";
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("block h-10 w-auto object-contain", className)} />
  );
  return tone === "light" ? <span className="inline-flex rounded-[12px] bg-ivory px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">{img}</span> : img;
}

/**
 * Co-branding: the hospital (the institution) · hairline · مَسار (the platform).
 * Falls back to the platform logo alone until an official logo is uploaded.
 *  - default: horizontal hospital lockup + full platform logo (wide headers)
 *  - compact: hospital emblem + platform mark (phones, patient app)
 *  - stacked: hospital lockup above the platform name (narrow sidebars)
 */
export function BrandLockup({ brand, tone = "default", compact = false, stacked = false, shortPlatform = false, className, logoClassName }: { brand?: BrandProps | null; tone?: "default" | "light"; compact?: boolean; stacked?: boolean; shortPlatform?: boolean; className?: string; logoClassName?: string }) {
  if (!brand?.logoUrl) return <Logo tone={tone} className={className} />;
  const platform = (size: "sm" | "md") => (
    <span className="inline-flex items-center gap-2">
      <LogoMark tone={tone} className={size === "sm" ? "size-7" : "size-8"} />
      <span className={cn("font-display font-semibold", size === "sm" ? "text-base" : "text-lg", tone === "light" ? "text-ivory" : "text-ink")}>مَسار</span>
    </span>
  );
  if (stacked) {
    return (
      <span className={cn("flex flex-col items-start gap-3", className)}>
        <HospitalLogo brand={brand} tone={tone} className={logoClassName} />
        <span className="inline-flex items-center gap-2">
          {platform("sm")}
          <span className={cn("text-[0.6875rem]", tone === "light" ? "text-ivory/50" : "text-text-2")}>· منصة التأهيل الطبي</span>
        </span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <HospitalLogo brand={brand} variant={compact ? "mark" : "logo"} tone={tone} className={logoClassName} />
      <span aria-hidden="true" className={cn("h-8 w-px", tone === "light" ? "bg-ivory/15" : "bg-line")} />
      {compact || shortPlatform ? platform("md") : <Logo tone={tone} />}
    </span>
  );
}
