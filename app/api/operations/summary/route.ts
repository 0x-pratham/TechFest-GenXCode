import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OperationsSummary } from "@/components/admin/operations/operations-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Query registrations, schedule settings, and volunteer profiles directly
  const [
    { data: regRows },
    { data: settings },
    { data: volunteerRows },
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_schedule_settings")
      .select("snack_policy")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id,email,full_name,role,volunteer_permission,is_volunteer_active")
      .in("role", ["volunteer", "admin"]),
  ]);

  const rows = (regRows ?? []) as Record<string, unknown>[];
  const confirmedRows = rows.filter(
    (r) =>
      r.status === undefined ||
      r.status === null ||
      String(r.status).toLowerCase() === "confirmed" ||
      r.is_confirmed === true
  );

  const totalRegistered = confirmedRows.length;
  const checkedIn = confirmedRows.filter(
    (r) => r.checked_in === true || Boolean(r.checked_in_at)
  ).length;
  const snacksDistributed = confirmedRows.reduce((sum, r) => {
    const count = Number(
      r.snack_claims ??
        r.snacks_count ??
        r.snack_count ??
        (r.snack_claimed === true ? 1 : 0)
    );
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);

  const volunteers = (volunteerRows ?? [])
    .filter((v) => v.role === "volunteer" || Boolean(v.volunteer_permission))
    .map((v) => ({
      user_id: String(v.id),
      email: String(v.email ?? ""),
      name: typeof v.full_name === "string" ? v.full_name : null,
      permission: String(v.volunteer_permission ?? "both"),
      is_active: v.is_volunteer_active !== false,
    }));

  const recentActivity = confirmedRows
    .filter((r) => Boolean(r.checked_in_at))
    .slice(0, 50)
    .map((r) => ({
      action: "participant_checked_in",
      created_at: String(r.checked_in_at),
      email: typeof r.participant_email === "string" ? r.participant_email : (typeof r.email === "string" ? r.email : null),
      registration_id: r.id ? String(r.id) : null,
      details: {
        participant_name: r.participant_name ?? r.full_name ?? r.name ?? null,
        application_number: r.application_number ?? null,
      },
    }));

  const summary: OperationsSummary = {
    total_registered: totalRegistered,
    checked_in: checkedIn,
    snacks_distributed: snacksDistributed,
    pending_checkin: Math.max(0, totalRegistered - checkedIn),
    snack_policy: settings?.snack_policy ?? "event",
    volunteers,
    recent_activity: recentActivity,
  };

  return NextResponse.json(summary, {
    headers: { "Cache-Control": "no-store" },
  });
}