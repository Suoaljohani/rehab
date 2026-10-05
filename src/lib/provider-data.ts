import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FlagRow } from "@/components/provider/flag-list";

export async function getOpenFlags(episodeId?: string): Promise<FlagRow[]> {
  const supabase = await createClient();
  let q = supabase.from("attention_flags").select("id, kind, severity, title, detail, created_at, episode_id, patient:patients(full_name), episode:episodes(title)").eq("status", "open");
  if (episodeId) q = q.eq("episode_id", episodeId);
  const { data } = await q.order("created_at", { ascending: false }).limit(60);
  const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  return (data ?? [])
    .map((f) => ({
      id: f.id, kind: f.kind, severity: f.severity, title: f.title, detail: f.detail, created_at: f.created_at, episode_id: f.episode_id,
      patient_name: (f.patient as unknown as { full_name: string })?.full_name ?? "", episode_title: (f.episode as unknown as { title: string })?.title ?? "",
    }))
    .sort((a, b) => rank[a.severity] - rank[b.severity] || +new Date(b.created_at) - +new Date(a.created_at));
}

/** Episodes visible to the viewer through RLS (care team for providers; department for supervisors). */
export async function getMyEpisodes(viewerId: string, onlyMine: boolean) {
  const supabase = await createClient();
  let q = supabase
    .from("episodes")
    .select("id, code, title, status, start_date, specialty_code, created_at, patient:patients(id, full_name, mrn, national_id, date_of_birth, sex), care_team:care_team_members(provider_id, role, ended_at, provider:profiles!care_team_members_provider_id_fkey(full_name))")
    .order("start_date", { ascending: false });
  if (onlyMine) {
    const { data: mine } = await supabase.from("care_team_members").select("episode_id").eq("provider_id", viewerId).is("ended_at", null);
    const ids = (mine ?? []).map((m) => m.episode_id);
    if (ids.length === 0) return [];
    q = q.in("id", ids);
  }
  const { data } = await q;
  return data ?? [];
}

/** Bulk 7-day adherence + last activity per episode (one query). */
export async function getEngagement(episodeIds: string[]) {
  const map = new Map<string, { eligible: number; completed: number; last: string | null; rate: number | null; spark: number[] }>();
  if (episodeIds.length === 0) return map;
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
  const from = new Date(Date.now() - 13 * 864e5);
  const fromISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(from);
  const { data } = await supabase.from("schedule_items").select("episode_id, scheduled_date, status, completed_at").in("episode_id", episodeIds).gte("scheduled_date", fromISO).lte("scheduled_date", today).in("status", ["scheduled", "completed"]);
  const sevenAgo = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(Date.now() - 6 * 864e5));
  const perDay = new Map<string, Map<string, [number, number]>>();
  (data ?? []).forEach((s) => {
    const m = map.get(s.episode_id) ?? { eligible: 0, completed: 0, last: null, rate: null, spark: [] };
    const eligible = s.status === "completed" || s.scheduled_date < today;
    if (s.scheduled_date >= sevenAgo && eligible) {
      m.eligible++;
      if (s.status === "completed") m.completed++;
    }
    if (s.completed_at && (!m.last || s.completed_at > m.last)) m.last = s.completed_at;
    map.set(s.episode_id, m);
    const d = perDay.get(s.episode_id) ?? new Map();
    const cur = d.get(s.scheduled_date) ?? [0, 0];
    if (eligible) { cur[0]++; if (s.status === "completed") cur[1]++; }
    d.set(s.scheduled_date, cur);
    perDay.set(s.episode_id, d);
  });
  map.forEach((m, id) => {
    m.rate = m.eligible ? Math.round((m.completed / m.eligible) * 100) : null;
    const d = perDay.get(id)!;
    m.spark = [...d.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, [e, c]]) => (e ? Math.round((c / e) * 100) : 0));
  });
  return map;
}
