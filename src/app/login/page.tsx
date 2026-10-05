import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, Stethoscope } from "lucide-react";
import { AuthShell, Quote } from "./auth-shell";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginChooser() {
  return (
    <AuthShell aside={<Quote />}>
      <h1 className="font-display text-[2.25rem] font-semibold leading-tight text-ink">مرحبًا بك في مَسار</h1>
      <p className="mt-2 text-text-2">اختر طريقة الدخول المناسبة لك.</p>
      <div className="mt-8 space-y-3">
        <Link href="/login/patient" className="group flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-[var(--shadow-md)]">
          <span className="grid size-12 place-items-center rounded-[14px] bg-sage-100 text-sage-700"><HeartHandshake size={22} /></span>
          <span className="flex-1">
            <span className="block font-semibold text-ink">أنا مراجع</span>
            <span className="block text-sm text-text-2">الدخول برقم الهوية ورمز التحقق</span>
          </span>
          <ArrowLeft className="text-text-3 transition group-hover:-translate-x-1 group-hover:text-ink" size={20} />
        </Link>
        <Link href="/login/staff" className="group flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[var(--shadow-md)]">
          <span className="grid size-12 place-items-center rounded-[14px] bg-slate-50 text-slate-600"><Stethoscope size={22} /></span>
          <span className="flex-1">
            <span className="block font-semibold text-ink">فريق التأهيل والإدارة</span>
            <span className="block text-sm text-text-2">البريد الإلكتروني وكلمة المرور</span>
          </span>
          <ArrowLeft className="text-text-3 transition group-hover:-translate-x-1 group-hover:text-ink" size={20} />
        </Link>
      </div>
      <p className="mt-8 text-sm text-text-2">
        ليس لديك حساب؟ <Link href="/start" className="font-medium text-slate-600 underline-offset-4 hover:underline">ابدأ رحلتك</Link>
      </p>
    </AuthShell>
  );
}

