"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, CalendarDays, ChartNoAxesColumn, Columns3, Dumbbell, Globe, LayoutGrid, Layers, LogOut, Megaphone, Menu, MessageCircle,
  ScrollText, Search, Settings, ShieldCheck, Stethoscope, Sun, UserRound, Users, X, ArrowLeftRight,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import type { NavGroup } from "./nav-config";

const ICONS: Record<string, typeof Sun> = {
  sun: Sun, users: Users, calendar: CalendarDays, dumbbell: Dumbbell, message: MessageCircle, grid: LayoutGrid, columns: Columns3,
  stethoscope: Stethoscope, layers: Layers, megaphone: Megaphone, chart: ChartNoAxesColumn, globe: Globe, settings: Settings, shield: ShieldCheck, scroll: ScrollText,
};

export type ShellViewer = { fullName: string; roleLabel: string; title: string | null; role: string };

export function StaffShell({
  viewer, nav, badges, children, switchTo, notifications, idleMinutes = 30,
}: {
  viewer: ShellViewer; nav: NavGroup[]; badges: Record<string, number>; children: ReactNode;
  switchTo?: { href: string; label: string } | null; notifications: number; idleMinutes?: number;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6"><Link href="/" aria-label="مَسار"><Logo tone="light" /></Link></div>
      <nav className="scrollbar-calm flex-1 overflow-y-auto px-3" aria-label="التنقل الرئيسي">
        {nav.map((g, gi) => (
          <div key={gi} className="mb-5">
            {g.label && <div className="mb-2 px-3 text-[0.6875rem] font-medium tracking-wide text-ivory/40">{g.label}</div>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
                const Icon = ICONS[it.icon] ?? LayoutGrid;
                const badge = it.badgeKey ? badges[it.badgeKey] : 0;
                return (
                  <li key={it.href}>
                    <Link href={it.href} aria-current={active ? "page" : undefined}
                      className={cn("group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[0.9375rem] transition", active ? "bg-sage-400/[0.18] text-ivory" : "text-ivory/65 hover:bg-white/[0.05] hover:text-ivory")}>
                      <Icon size={18} className={active ? "text-sage-300" : "text-ivory/50 group-hover:text-ivory/80"} />
                      <span className="flex-1">{it.label}</span>
                      {badge > 0 && <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] font-semibold tabular", active ? "bg-sage-300 text-ink" : "bg-clay-400/90 text-white")}>{badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {switchTo && (
        <div className="px-3 pb-2">
          <Link href={switchTo.href} className="flex items-center gap-2.5 rounded-[12px] border border-white/10 px-3 py-2.5 text-sm text-ivory/75 hover:bg-white/[0.05] hover:text-ivory">
            <ArrowLeftRight size={16} /> {switchTo.label}
          </Link>
        </div>
      )}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-[14px] px-2 py-2">
          <Avatar name={viewer.fullName} size="sm" className="ring-white/10" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ivory">{viewer.fullName}</div>
            <div className="truncate text-xs text-ivory/50">{viewer.title ?? viewer.roleLabel}</div>
          </div>
          <Link href="/account" className="grid size-8 place-items-center rounded-full text-ivory/60 hover:bg-white/10 hover:text-ivory" aria-label="حسابي"><UserRound size={16} /></Link>
          <form action="/auth/signout" method="post">
            <button className="grid size-8 place-items-center rounded-full text-ivory/60 hover:bg-white/10 hover:text-ivory" aria-label="تسجيل الخروج"><LogOut size={16} /></button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="surface-ink sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="surface-ink absolute inset-y-0 start-0 w-[290px] animate-[fade_0.2s_ease-out]">
            <button onClick={() => setOpen(false)} className="absolute end-3 top-6 grid size-9 place-items-center rounded-full text-ivory/70" aria-label="إغلاق"><X size={18} /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line/60 bg-page/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-8">
            <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full text-ink hover:bg-surface lg:hidden" aria-label="القائمة"><Menu size={20} /></button>
            <form action="/search" className="relative max-w-md flex-1">
              <Search size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-3" />
              <label htmlFor="gsearch" className="sr-only">بحث</label>
              <input id="gsearch" name="q" placeholder="ابحث عن مراجع، تمرين، أو مقدم رعاية…" className="h-10 w-full rounded-full border border-line bg-surface ps-10 pe-4 text-sm outline-none placeholder:text-text-3 focus:border-slate-300 focus:ring-4 focus:ring-slate-100" />
            </form>
            <div className="ms-auto flex items-center gap-1">
              <Link href="/account/notifications" className="relative grid size-10 place-items-center rounded-full text-ink hover:bg-surface" aria-label={`الإشعارات${notifications ? ` (${notifications})` : ""}`}>
                <Bell size={19} />
                {notifications > 0 && <span className="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-clay-500 px-1 text-[0.625rem] font-semibold text-white">{notifications > 9 ? "9+" : notifications}</span>}
              </Link>
            </div>
          </div>
        </header>
        <main id="main" className="px-4 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
      <IdleGuard minutes={idleMinutes} />
    </div>
  );
}

/** Signs staff out after inactivity (AUTH-03). Warns one minute before. */
function IdleGuard({ minutes }: { minutes: number }) {
  const router = useRouter();
  const [warn, setWarn] = useState(false);
  const last = useRef(Date.now());
  useEffect(() => {
    const bump = () => { last.current = Date.now(); setWarn(false); };
    const evs = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(async () => {
      const idle = (Date.now() - last.current) / 60000;
      if (idle >= minutes) {
        clearInterval(t);
        await createClient().auth.signOut();
        router.replace("/login/staff?expired=1");
      } else if (idle >= minutes - 1) setWarn(true);
    }, 15000);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); };
  }, [minutes, router]);
  if (!warn) return null;
  return (
    <div className="fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4" role="alert">
      <div className="rounded-[16px] border border-warning/30 bg-warning-bg px-5 py-3 text-sm text-warning-fg shadow-[var(--shadow-lg)]">ستنتهي جلستك خلال دقيقة بسبب عدم النشاط. حرّك المؤشر للبقاء متصلًا.</div>
    </div>
  );
}
