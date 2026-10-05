import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getCms } from "@/lib/public-data";
import { getBrand } from "@/lib/brand";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [cms, brand] = await Promise.all([getCms(), getBrand()]);
  return (
    <>
      {cms.announcement_banner?.enabled && cms.announcement_banner?.text && (
        <div className="bg-sage-700 px-4 py-2 text-center text-sm text-white">{cms.announcement_banner.text}</div>
      )}
      <SiteHeader brand={brand} />
      <main id="main">{children}</main>
      <SiteFooter contact={cms.contact} hours={cms.hours} brand={brand} />
    </>
  );
}
