import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppRole = "student" | "admin" | "teacher";

/**
 * Single source of truth for "what role is this user, right now".
 * Used by /login (to redirect after sign-in), the (app) layout (to guard
 * routes on every navigation), and the Sidebar (to pick the right nav
 * section) — all three MUST agree, or a user can end up bounced in a loop
 * or shown the wrong nav for their actual account.
 *
 * institution_members is the real source of truth (added in Phase 1/2).
 * user_metadata.role is only consulted as a fallback for an institution
 * account that hasn't been auto-provisioned into institution_members yet
 * (a first-time admin who has never opened /admin — loadAdminData()
 * provisions them on that first visit). It is intentionally never written
 * to at login time anymore — that was the bug where clicking the wrong
 * portal tab on /login silently reassigned an existing account's role.
 */
export async function resolveUserRole(supabase: SupabaseClient, user: User): Promise<AppRole> {
  const { data: memberships } = await supabase
    .from("institution_members")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);

  const membershipRole = memberships?.[0]?.role;
  if (membershipRole === "admin") return "admin";
  if (membershipRole === "teacher") return "teacher";

  if (user.user_metadata?.role === "institution") return "admin";

  return "student";
}

export function roleHomePath(role: AppRole): string {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  return "/dashboard";
}
