import "server-only";
import { cache } from "react";
import { getCms } from "@/lib/public-data";

export type LogoKind = "logo" | "mark" | "full";
export const LOGO_FIELD: Record<LogoKind, string> = { logo: "logo_url", mark: "logo_mark_url", full: "logo_full_url" };

export type Brand = {
  hospitalName: string | null;
  hospitalNameEn: string | null;
  cluster: string | null;
  /** Horizontal lockup — headers and sign-in. */
  logoUrl: string | null;
  /** Emblem only — compact places (phones, patient app). Falls back to the lockup. */
  markUrl: string | null;
  /** Full vertical logo — footer. Falls back to the lockup. */
  fullUrl: string | null;
};

// Served same-origin via /brand/logo; the stored file name versions the URL so caches refresh on change.
const local = (stored: string | null | undefined, kind: LogoKind) => {
  const file = stored ? stored.split("/").pop() : null;
  return file ? `/brand/logo?kind=${kind}&v=${encodeURIComponent(file)}` : null;
};

/** Hospital identity managed from /admin/cms?tab=identity (cms_blocks.brand). */
export const getBrand = cache(async (): Promise<Brand> => {
  const cms = await getCms();
  const b = (cms.brand ?? {}) as Record<string, string | null>;
  const logoUrl = local(b.logo_url, "logo");
  return {
    hospitalName: b.hospital_name || null,
    hospitalNameEn: b.hospital_name_en || null,
    cluster: b.hospital_cluster || null,
    logoUrl,
    markUrl: local(b.logo_mark_url, "mark") ?? logoUrl,
    fullUrl: local(b.logo_full_url, "full") ?? logoUrl,
  };
});
