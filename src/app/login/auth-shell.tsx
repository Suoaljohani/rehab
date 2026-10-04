import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** Split-screen sign-in: architectural ink panel + calm form surface. */
export function AuthShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <main id="main" className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="الصفحة الرئيسية"><Logo /></Link>
          <Link href="/" className="text-sm text-text-2 hover:text-ink">العودة للموقع</Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-center text-xs text-text-3">© مَسار · قسم التأهيل الطبي — جميع العمليات الحساسة مسجّلة لأغراض الأمان.</p>
      </main>
      <aside className="surface-ink relative hidden overflow-hidden lg:block" aria-hidden="true">
        <div className="absolute inset-0 linen-lines opacity-40" />
        <svg className="absolute -bottom-20 -end-24 h-[120%] opacity-[0.16]" viewBox="0 0 400 400" fill="none">
          <path d="M40 330c60 0 86-42 116-106 36-78 70-160 164-160 64 0 100 36 126 80" stroke="#F7F3EE" strokeWidth="14" strokeLinecap="round" />
          <circle cx="446" cy="148" r="22" fill="#97A88B" />
        </svg>
        <div className="relative flex h-full flex-col justify-end p-14 text-ivory">{aside}</div>
      </aside>
    </div>
  );
}

export function Quote() {
  return (
    <div className="max-w-md">
      <div className="mb-6 h-px w-16 bg-sage-300" />
      <p className="font-display text-[2rem] font-semibold leading-snug">رعايتك التأهيلية لا تتوقف بانتهاء الجلسة.</p>
      <p className="mt-4 text-ivory/65">برنامج منزلي موجّه، ومتابعة مستمرة، وتواصل آمن مع فريقك — في رحلة واحدة متصلة.</p>
    </div>
  );
}
