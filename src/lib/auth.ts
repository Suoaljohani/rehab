import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "patient" | "provider" | "supervisor" | "admin" | "content_reviewer" | "super_admin";

export type Viewer = {
  id: string;
  role: Role;
  fullName: string;
  email: string | null;
  status: string;
  title: string | null;
  specialty: string | null;
  patientId: string | null;
  aal: "aal1" | "aal2" | null;
  hasMfa: boolean;
  /** Staff signing in with admin-issued credentials must set their own password first. */
  mustChangePassword: boolean;
};

export const STAFF_ROLES: Role[] = ["provider", "supervisor", "admin", "content_reviewer", "super_admin"];
export const ADMIN_AREA_ROLES: Role[] = ["supervisor", "admin", "content_reviewer", "super_admin"];
export const PROVIDER_AREA_ROLES: Role[] = ["provider", "supervisor", "admin", "super_admin"];

export function homeFor(role: Role) {
  switch (role) {
    case "patient":
      return "/patient";
    case "provider":
      return "/provider";
    case "content_reviewer":
      return "/admin/exercises";
    default:
      return "/admin";
  }
}

/** Current signed-in viewer (cached per request). Null when signed out or without an active profile. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, role, full_name, email, status, must_change_password").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active") return null;
  let title: string | null = null;
  let specialty: string | null = null;
  let patientId: string | null = null;
  if (profile.role === "patient") {
    const { data: p } = await supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle();
    patientId = p?.id ?? null;
  } else {
    const { data: s } = await supabase.from("staff_profiles").select("title, specialty_code").eq("user_id", user.id).maybeSingle();
    title = s?.title ?? null;
    specialty = s?.specialty_code ?? null;
  }
  let aal: Viewer["aal"] = null;
  let hasMfa = false;
  if (profile.role !== "patient") {
    const { data: lvl } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aal = (lvl?.currentLevel as Viewer["aal"]) ?? null;
    hasMfa = lvl?.nextLevel === "aal2";
  }
  return {
    id: user.id,
    role: profile.role as Role,
    fullName: profile.full_name,
    email: profile.email,
    status: profile.status,
    title,
    specialty,
    patientId,
    aal,
    hasMfa,
    mustChangePassword: profile.role !== "patient" && !!profile.must_change_password,
  };
});

/** Server-side gate for a route group. UI hiding is never the security boundary — RLS is. */
export async function requireRole(roles: Role[], area: "patient" | "staff" = "staff", opts: { allowCredentialSetup?: boolean } = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(area === "patient" ? "/login/patient" : "/login/staff");
  if (viewer.role !== "patient") {
    if (viewer.hasMfa && viewer.aal !== "aal2") redirect("/login/mfa");
    if (!opts.allowCredentialSetup) {
      // Admin-issued (or admin-reset) passwords are replaced before any data is reachable.
      if (viewer.mustChangePassword) redirect("/account/password?first=1");
      // Organisation policy (system_settings.staff_mfa_required): staff without a factor must enrol first.
      if (!viewer.hasMfa && (await staffMfaRequired())) redirect("/account/security?required=1");
    }
  }
  if (!roles.includes(viewer.role)) redirect(`/denied?from=${area}`);
  return viewer;
}

const staffMfaRequired = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("value").eq("key", "staff_mfa_required").maybeSingle();
  return data?.value === true;
});
