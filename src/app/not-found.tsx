import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <LogoMark className="mx-auto size-14" />
        <div className="mt-8 font-display text-[5rem] font-semibold leading-none text-sand-300">٤٠٤</div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">الصفحة غير موجودة</h1>
        <p className="mx-auto mt-2 max-w-sm text-text-2">ربما نُقلت الصفحة أو أن الرابط غير صحيح. لا تقلق، يمكنك العودة لمسارك من هنا.</p>
        <Link href="/" className={buttonClasses("primary", "md", "mt-8")}>الصفحة الرئيسية</Link>
      </div>
    </main>
  );
}
