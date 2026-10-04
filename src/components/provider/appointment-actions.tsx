"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { setAppointmentStatus } from "@/lib/actions/provider";

export function AppointmentActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const next: [string, string][] =
    status === "confirmed" || status === "pending_confirmation" ? [["checked_in", "تسجيل الحضور"], ["no_show", "لم يحضر"]] :
    status === "checked_in" ? [["completed", "إنهاء الجلسة"]] : [];
  if (!next.length) return null;
  return (
    <div className="flex gap-1">
      {next.map(([s, l]) => (
        <button key={s} disabled={pending} onClick={() => start(async () => {
          const r = await setAppointmentStatus(id, s);
          if (!r.ok) toast({ tone: "danger", title: "تعذّر التحديث", body: r.error }); else router.refresh();
        })} className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition disabled:opacity-50 ${s === "no_show" ? "text-danger-fg hover:bg-danger-bg" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>{l}</button>
      ))}
    </div>
  );
}
