import type { Metadata } from "next";
import { CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { APPOINTMENT_STATUS } from "@/lib/status";
import { fDate, fTime } from "@/lib/format";
import { ChangeRequest } from "./change-request";

export const metadata: Metadata = { title: "المواعيد" };

export default async function Appointments({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireRole(["patient"], "patient");
  const { tab } = await searchParams;
  const past = tab === "previous";
  const supabase = await createClient();
  const now = new Date().toISOString();
  let q = supabase.from("appointments").select("id, starts_at, duration_min, location, status, specialty:specialties(name), provider:profiles!appointments_provider_id_fkey(full_name), change:appointment_change_requests(kind, status)").eq("patient_id", viewer.patientId!);
  q = past ? q.lt("starts_at", now).order("starts_at", { ascending: false }) : q.gte("starts_at", now).order("starts_at");
  const { data } = await q;
  return (
    <div className="space-y-5">
      <h1 className="font-display text-[1.875rem] font-semibold text-ink">المواعيد</h1>
      <LinkTabs variant="pill" items={[{ href: "/patient/appointments", label: "القادمة", active: !past }, { href: "/patient/appointments?tab=previous", label: "السابقة", active: past }]} />
      {(data ?? []).length === 0 ? (
        <Card><EmptyState icon={<CalendarDays size={24} />} title={past ? "لا توجد مواعيد سابقة" : "لا توجد مواعيد قادمة"} description={past ? undefined : "سيتواصل معك القسم عند جدولة جلستك القادمة."} /></Card>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((a) => {
            const d = new Date(a.starts_at);
            const pendingChange = (a.change as { kind: string; status: string }[] | null)?.find((c) => c.status === "pending");
            const changeable = !past && ["confirmed", "pending_confirmation", "requested"].includes(a.status);
            return (
              <li key={a.id} className="flex gap-4 rounded-[24px] border border-line/80 bg-surface p-4 sm:p-5">
                <div className="grid w-16 shrink-0 place-content-center rounded-[18px] bg-sand-50 py-3 text-center ring-1 ring-sand-200">
                  <div className="text-xs text-text-2">{fDate(d, "weekday")}</div>
                  <div className="font-display text-2xl font-semibold text-ink tabular">{new Intl.DateTimeFormat("en", { timeZone: "Asia/Riyadh", day: "numeric" }).format(d)}</div>
                  <div className="text-xs text-text-2">{new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", month: "short" }).format(d)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-semibold text-ink">{(a.specialty as unknown as { name: string } | null)?.name ?? "جلسة تأهيل"}</div>
                    <StatusBadge map={APPOINTMENT_STATUS} value={a.status} size="sm" />
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-text-2">
                    <li className="flex items-center gap-2"><Clock size={14} /> {fTime(a.starts_at)} · {a.duration_min} دقيقة</li>
                    {(a.provider as unknown as { full_name: string } | null) && <li className="flex items-center gap-2"><UserRound size={14} /> {(a.provider as unknown as { full_name: string }).full_name}</li>}
                    <li className="flex items-center gap-2"><MapPin size={14} /> {a.location ?? "قسم التأهيل الطبي"}</li>
                  </ul>
                  {changeable && <div className="mt-3"><ChangeRequest appointmentId={a.id} pending={pendingChange?.kind} /></div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
