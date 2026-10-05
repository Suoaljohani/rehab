import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { HospitalLogo } from "@/components/brand/co-brand";
import { getBrand } from "@/lib/brand";
import { PatientBottomNav, PatientTopNav } from "@/components/patient/patient-nav";
import { requireRole } from "@/lib/auth";
import { getUnread } from "@/lib/patient-data";

export const metadata: Metadata = { title: { default: "اليوم", template: "%s · مَسار" } };

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(["patient"], "patient");
  const [unread, brand] = await Promise.all([
    viewer.patientId ? getUnread(viewer.id, viewer.patientId) : Promise.resolve({ messages: 0, notifications: 0 }),
    getBrand(),
  ]);
  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header className="sticky top-0 z-30 border-b border-line/50 bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/patient" className="flex items-center gap-2.5" aria-label="اليوم">
            {brand.logoUrl && <><HospitalLogo brand={brand} className="h-8 max-w-[6.5rem]" /><span aria-hidden="true" className="h-7 w-px bg-line" /></>}
            <LogoMark className="size-8" />
            <span className="font-display text-lg font-semibold text-ink">مَسار</span>
          </Link>
          <PatientTopNav unread={unread.messages} />
          <Link href="/patient/notifications" className="relative grid size-10 place-items-center rounded-full text-ink hover:bg-surface" aria-label={`الإشعارات${unread.notifications ? ` (${unread.notifications} جديدة)` : ""}`}>
            <Bell size={20} />
            {unread.notifications > 0 && <span className="absolute end-2 top-2 size-2.5 rounded-full bg-clay-500 ring-2 ring-page" />}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-6">{children}</main>
      <PatientBottomNav unread={unread.messages} />
    </div>
  );
}
