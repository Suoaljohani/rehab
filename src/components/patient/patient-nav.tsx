"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, MessageCircle, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/patient", label: "اليوم", icon: Sparkles, exact: true },
  { href: "/patient/plan", label: "خطتي", icon: CalendarRange },
  { href: "/patient/progress", label: "تقدمي", icon: TrendingUp },
  { href: "/patient/messages", label: "الرسائل", icon: MessageCircle },
  { href: "/patient/account", label: "حسابي", icon: UserRound },
];

export function PatientBottomNav({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden" aria-label="التنقل الرئيسي">
      <div className="mx-auto grid max-w-md grid-cols-5 rounded-[26px] border border-line/80 bg-surface/95 p-1.5 shadow-[var(--shadow-lg)] backdrop-blur-md">
        {ITEMS.map((it) => {
          const active = it.exact ? path === it.href : path.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
              className={cn("relative flex flex-col items-center gap-1 rounded-[20px] py-2 text-[0.6875rem] transition", active ? "bg-sage-100 font-semibold text-ink" : "text-text-2 hover:text-ink")}>
              <Icon size={21} className={active ? "text-sage-700" : ""} strokeWidth={active ? 2.2 : 1.8} />
              {it.label}
              {it.href === "/patient/messages" && unread > 0 && (
                <span className="absolute end-[22%] top-1 grid min-w-4 place-items-center rounded-full bg-clay-500 px-1 text-[0.625rem] font-semibold text-white">{unread}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PatientTopNav({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
      {ITEMS.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
            className={cn("relative rounded-full px-3.5 py-2 text-sm transition", active ? "bg-sage-100 font-semibold text-ink" : "text-text-2 hover:text-ink")}>
            {it.label}
            {it.href === "/patient/messages" && unread > 0 && <span className="ms-1.5 rounded-full bg-clay-500 px-1.5 text-[0.625rem] text-white">{unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
