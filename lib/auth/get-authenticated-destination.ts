import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAuthenticatedDestination(
  supabase: SupabaseClient,
  nextPath = "/dashboard"
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const [{ data: profile }, { data: candidateRegs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("registrations")
      .select("id,status")
      .or(
        user.email
          ? `created_by.eq.${user.id},email.eq.${user.email}`
          : `created_by.eq.${user.id}`
      )
      .order("created_at", { ascending: false }),
  ]);

  if (profile?.role === "admin") {
    return nextPath.startsWith("/admin") ? nextPath : "/admin";
  }
  if (profile?.role === "volunteer") {
    return "/volunteer/dashboard";
  }

  const rows = candidateRegs ?? [];
  const registration =
    rows.find((r) => String(r.status ?? "").toLowerCase() !== "cancelled") ??
    rows[0] ??
    null;

  if (!registration) {
    return "/signup";
  }

  if (nextPath === "/register" || nextPath === "/signup" || nextPath === "/auth") {
    return "/dashboard";
  }

  return nextPath || "/dashboard";
}