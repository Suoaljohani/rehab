import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/status";

export const getStaffBadges = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const supervisor = ["supervisor", "admin", "super_admin"].includes(viewer.role);
  const [flags, notifs, threads, reads, kpis, reviews] = await Promise.all([
    supabase.from("attention_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    supabase.from("message_threads").select("id, last_message_at").eq("status", "open").eq("last_sender_role", "patient"),
    supabase.from("thread_reads").select("thread_id, last_read_at").eq("user_id", viewer.id),
    supervisor ? supabase.rpc("admin_kpis") : Promise.resolve({ data: null }),
    supabase.from("exercise_versions").select("id", { count: "exact", head: true }).eq("status", "in_review"),
  ]);
  const rm = new Map((reads.data ?? []).map((r) => [r.thread_id, r.last_read_at]));
  const unreadMsgs = (threads.data ?? []).filter((t) => !rm.get(t.id) || new Date(rm.get(t.id)!) < new Date(t.last_message_at)).length;
  const k = (kpis.data ?? {}) as Record<string, number>;
  return {
    flags: flags.count ?? 0,
    notifications: notifs.count ?? 0,
    messages: unreadMsgs,
    unassigned: k.unassigned ?? 0,
    requests: (k.appointment_requests ?? 0) + (k.change_requests ?? 0),
    reviews: reviews.count ?? 0,
  };
});

export function shellViewer(v: Viewer) {
  return { fullName: v.fullName, roleLabel: ROLE_LABEL[v.role], title: v.title, role: v.role };
}
