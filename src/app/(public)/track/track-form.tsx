"use client";

import { useActionState } from "react";
import { CalendarCheck2, Search } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { REQUEST_STATUS, statusOf } from "@/lib/status";
import { trackRequest } from "@/lib/actions/public";
import { fDate, fDateTime } from "@/lib/format";

export function TrackForm({ initialRef }: { initialRef?: string }) {
  const [state, action] = useActionState(trackRequest, null);
  const r = state?.ok ? state.data : null;
  return (
    <div className="space-y-8">
      <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="رقم الطلب" htmlFor="reference"><Input id="reference" name="reference" dir="ltr" defaultValue={initialRef} placeholder="RH-2026-00125" className="text-end font-mono" required /></Field>
        <Field label="رقم الجوال" htmlFor="phone"><Input id="phone" name="phone" dir="ltr" inputMode="tel" placeholder="05XXXXXXXX" className="text-end" required /></Field>
        <SubmitButton icon={<Search size={18} />}>متابعة</SubmitButton>
      </form>
      {state && !state.ok && <Notice tone="warning">{state.error}</Notice>}
      {r && (
        <div className="rounded-[24px] border border-line bg-surface p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-text-2">طلب رقم</div>
              <div className="font-mono text-xl font-semibold text-ink" dir="ltr">{r.reference}</div>
              <div className="mt-1 text-sm text-text-2">{r.service ?? "خدمة غير محددة"} · قُدّم في {fDate(r.created_at)}</div>
            </div>
            <StatusBadge map={REQUEST_STATUS} value={r.status} />
          </div>
          {r.appointment && (
            <div className="mt-6 flex items-center gap-4 rounded-[18px] bg-sage-50 p-4 ring-1 ring-sage-200">
              <CalendarCheck2 className="text-sage-700" />
              <div><div className="font-semibold text-ink">موعدك: {fDateTime(r.appointment.starts_at)}</div><div className="text-sm text-sage-800">{r.appointment.location ?? "قسم التأهيل الطبي"}</div></div>
            </div>
          )}
          <ol className="mt-8 space-y-0">
            {r.events.map((ev, i) => (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {i < r.events.length - 1 && <span className="absolute start-[9px] top-6 h-full w-px bg-line" aria-hidden="true" />}
                <span className={`relative mt-1 size-[19px] shrink-0 rounded-full border-4 ${i === r.events.length - 1 ? "border-sage-200 bg-sage-600" : "border-sand-100 bg-sand-300"}`} />
                <div>
                  <div className="font-medium text-ink">{statusOf(REQUEST_STATUS, ev.status).label}</div>
                  {ev.note && <div className="mt-0.5 text-sm text-text-2">{ev.note}</div>}
                  <div className="mt-1 text-xs text-text-3">{fDateTime(ev.at)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
