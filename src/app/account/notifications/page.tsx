import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requireRole, STAFF_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/lib/actions/patient";
import { fRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "الإشعارات" };

export default async function StaffNotifications() {
  const viewer = await requireRole(STAFF_ROLES);
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(60);
  return (
    <div className="max-w-3xl">
      <PageHeader title="الإشعارات" actions={(data ?? []).some((n) => !n.read_at) ? <form action={markAllNotificationsRead}><Button variant="quiet" size="sm">تعليم الكل كمقروء</Button></form> : null} />
      {(data ?? []).length === 0 ? <Card><EmptyState icon={<Bell size={24} />} title="لا توجد إشعارات" /></Card> : (
        <ul className="overflow-hidden rounded-[var(--radius-xl)] border border-line/80 bg-surface shadow-[var(--shadow-sm)]">
          {(data ?? []).map((n) => {
            const inner = (
              <div className={cn("flex gap-3 px-5 py-4", !n.read_at && "bg-sage-50/60")}>
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-clay-500")} />
                <div className="flex-1"><div className="flex justify-between gap-3"><span className={cn("text-ink", !n.read_at && "font-semibold")}>{n.title}</span><span className="text-xs text-text-3">{fRelative(n.created_at)}</span></div>{n.body && <p className="mt-0.5 text-sm text-text-2">{n.body}</p>}</div>
              </div>
            );
            return <li key={n.id} className="border-b border-line-soft last:border-0">{n.link ? <Link href={n.link}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
