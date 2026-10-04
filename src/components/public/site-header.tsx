"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/services", label: "خدماتنا" },
  { href: "/#how", label: "كيف تعمل المنصة" },
  { href: "/guide", label: "دليل المراجع" },
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "/contact", label: "تواصل معنا" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-8">
        <Link href="/" aria-label="مَسار — الصفحة الرئيسية"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}
              className={cn("rounded-full px-3.5 py-2 text-[0.9375rem] transition", path === n.href ? "bg-surface text-ink shadow-[var(--shadow-xs)]" : "text-text-2 hover:text-ink")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href="/track" variant="ghost" size="sm">متابعة طلب</ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="sm">تسجيل الدخول</ButtonLink>
          <ButtonLink href="/start" size="sm">ابدأ رحلتك</ButtonLink>
        </div>
        <button className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="القائمة">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line/60 bg-page px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label="التنقل الرئيسي">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line-soft py-3.5 text-[1.0625rem] text-ink">{n.label}</Link>
            ))}
            <Link href="/track" onClick={() => setOpen(false)} className="py-3.5 text-[1.0625rem] text-ink">متابعة طلب</Link>
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ButtonLink href="/login" variant="secondary">تسجيل الدخول</ButtonLink>
            <ButtonLink href="/start">ابدأ رحلتك</ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
