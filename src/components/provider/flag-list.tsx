"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertOctagon, CalendarClock, Check, HeartPulse, MessageCircle, MoonStar, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { resolveFlag } from "@/lib/actions/provider";
import { FLAG_SEVERITY, statusOf } from "@/lib/status";
import { fRelative } from "@/lib/format";

export type FlagRow = { id: string; kind: string; severity: string; title: string; detail: string | null; created_at: string; episode_id: string; patient_name: string; episode_title: string };

const KIND_ICON: Record<string, typeof Activity> = {
  high_pain: HeartPulse, issue_reported: AlertOctagon, inactivity: MoonStar, program_ending: CalendarClock, patient_message: MessageCircle, feeling_worse: Activity, unassigned: UserX,
};

export function FlagList({ flags, showPatient = true, compact }: { flags: FlagRow[]; showPatient?: boolean; compact?: boolean }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const visible = flags.filter((f) => !hidden.includes(f.id));
  function resolve(f: FlagRow) {
    start(async () => {
      const r = await resolveFlag(f.id, undefined, f.episode_id);
      if (!r.ok) return toast({ tone: "danger", title: "تعذّر التحديث", body: r.error });
      setHidden((h) => [...h, f.id]);
      router.refresh();
    });
  }
  if (visible.length === 0) {
    return <div className="flex items-center gap-3 rounded-[16px] bg-sage-50 px-4 py-4 text-sm text-sage-800 ring-1 ring-sage-200"><Check size={18} /> لا توجد حالات تحتاج انتباهك الآن.</div>;
  }
  return (
    <ul className="space-y-2.5">
      {visible.map((f) => {
        const Icon = KIND_ICON[f.kind] ?? Activity;
        const sev = statusOf(FLAG_SEVERITY, f.severity);
        return (
          <li key={f.id} className="group flex items-start gap-3.5 rounded-[18px] border border-line/80 bg-surface p-4 transition hover:shadow-[var(--shadow-sm)]">
            <span className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${f.severity === "high" ? "bg-danger-bg text-danger-fg" : f.severity === "medium" ? "bg-warning-bg text-warning-fg" : "bg-info-bg text-info-fg"}`}><Icon size={19} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {showPatient && <Link href={`/provider/patients/${f.episode_id}`} className="font-semibold text-ink hover:underline">{f.patient_name}</Link>}
                <span className={showPatient ? "text-text" : "font-semibold text-ink"}>{f.title}</span>
                <Badge tone={sev.tone} size="sm" dot>{sev.label}</Badge>
              </div>
              {!compact && f.detail && <p className="mt-0.5 truncate text-sm text-text-2">{f.detail}</p>}
              <div className="mt-1 text-xs text-text-3">{showPatient ? `${f.episode_title} · ` : ""}{fRelative(f.created_at)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {showPatient && <Link href={`/provider/patients/${f.episode_id}`} className="hidden rounded-[10px] px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 sm:block">فتح الملف</Link>}
              <Button variant="quiet" size="sm" onClick={() => resolve(f)} disabled={pending} icon={<Check size={15} />}>تمت المتابعة</Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PatientChip({ name }: { name: string }) {
  return <span className="inline-flex items-center gap-2"><Avatar name={name} size="xs" />{name}</span>;
}
