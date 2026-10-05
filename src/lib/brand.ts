import "server-only";
import { cache } from "react";
import { getCms } from "@/lib/public-data";

export type Brand = { hospitalName: string | null; hospitalNameEn: string | null; logoUrl: string | null };

/** Hospital identity managed from /admin/cms?tab=identity (cms_blocks.brand). */
export const getBrand = cache(async (): Promise<Brand> => {
  const cms = await getCms();
  const b = (cms.brand ?? {}) as Record<string, string | null>;
  // Served same-origin via /brand/logo; the stored file name versions the URL so caches refresh on change.
  const file = b.logo_url ? b.logo_url.split("/").pop() : null;
  return { hospitalName: b.hospital_name || null, hospitalNameEn: b.hospital_name_en || null, logoUrl: file ? `/brand/logo?v=${encodeURIComponent(file)}` : null };
});
