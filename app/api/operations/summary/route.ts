import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  OperationActivityItem,
  OperationsSummary,
} from "@/components/admin/operations/operations-types";

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

  const [
    { data: regRows },
    { data: attendanceRows },
    { data: snackRows },
    { data: auditRows },
    { data: settings },
    { data: volunteerRows },
    { data: allProfiles },
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_attendance")
      .select("registration_id,checked_in_at,checked_in_by"),
    supabase
      .from("snack_distributions")
      .select("registration_id,event_day,distributed_by,created_at"),
    supabase
      .from("event_audit_logs")
      .select("action,created_at,actor_id,registration_id,details")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("event_schedule_settings")
      .select("snack_policy")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "id,email,full_name,role,volunteer_permission,is_volunteer_active"
      )
      .in("role", ["volunteer", "admin"]),
    supabase.from("profiles").select("id,email,full_name"),
  ]);

  const rows = (regRows ?? []) as Record<string, unknown>[];
  const confirmedRows = rows.filter(
    (r) =>
      r.status === undefined ||
      r.status === null ||
      String(r.status).toLowerCase() === "confirmed" ||
      r.is_confirmed === true
  );

  const regMap = new Map<string, Record<string, unknown>>();
  for (const r of confirmedRows) {
    if (r.id) regMap.set(String(r.id), r);
  }

  const profileMap = new Map<
    string,
    { email: string | null; full_name: string | null }
  >();
  for (const p of allProfiles ?? []) {
    profileMap.set(String(p.id), {
      email: typeof p.email === "string" ? p.email : null,
      full_name: typeof p.full_name === "string" ? p.full_name : null,
    });
  }

  const attendanceSet = new Set<string>();
  const attendanceTimeMap = new Map<string, string>();
  for (const a of attendanceRows ?? []) {
    const rid = String(a.registration_id ?? "");
    if (!rid) continue;
    attendanceSet.add(rid);
    if (a.checked_in_at) {
      attendanceTimeMap.set(rid, String(a.checked_in_at));
    }
  }

  const totalRegistered = confirmedRows.length;
  const checkedIn =
    attendanceRows && attendanceRows.length > 0
      ? confirmedRows.filter(
          (r) =>
            attendanceSet.has(String(r.id ?? "")) ||
            r.checked_in === true ||
            Boolean(r.checked_in_at)
        ).length
      : confirmedRows.filter(
          (r) => r.checked_in === true || Boolean(r.checked_in_at)
        ).length;

  const snacksDistributed =
    snackRows && snackRows.length > 0
      ? snackRows.length
      : confirmedRows.reduce((sum, r) => {
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

  let recentActivity: OperationActivityItem[] = [];

  if (auditRows && auditRows.length > 0) {
    recentActivity = auditRows.map((l) => {
      const rid = l.registration_id ? String(l.registration_id) : null;
      const reg = rid ? regMap.get(rid) : undefined;
      const actor = l.actor_id ? profileMap.get(String(l.actor_id)) : undefined;
      const rawDetails =
        l.details && typeof l.details === "object"
          ? (l.details as Record<string, unknown>)
          : {};

      return {
        action: String(l.action ?? "event_recorded"),
        created_at: String(l.created_at ?? new Date().toISOString()),
        email: actor?.email ?? null,
        registration_id: rid,
        details: {
          ...rawDetails,
          participant_name:
            rawDetails.participant_name ??
            reg?.participant_name ??
            reg?.full_name ??
            reg?.name ??
            null,
          application_number:
            rawDetails.application_number ?? reg?.application_number ?? null,
        },
      };
    });
  } else {
    const combined: OperationActivityItem[] = [];
    for (const r of confirmedRows) {
      const rid = r.id ? String(r.id) : null;
      const checkedAt =
        (rid ? attendanceTimeMap.get(rid) : undefined) ??
        (r.checked_in_at ? String(r.checked_in_at) : null);
      if (checkedAt) {
        combined.push({
          action: "participant_checked_in",
          created_at: checkedAt,
          email:
            typeof r.participant_email === "string"
              ? r.participant_email
              : typeof r.email === "string"
                ? r.email
                : null,
          registration_id: rid,
          details: {
            participant_name:
              r.participant_name ?? r.full_name ?? r.name ?? null,
            application_number: r.application_number ?? null,
          },
        });
      }
    }
    for (const s of snackRows ?? []) {
      const rid = s.registration_id ? String(s.registration_id) : null;
      const reg = rid ? regMap.get(rid) : undefined;
      const actor = s.distributed_by
        ? profileMap.get(String(s.distributed_by))
        : undefined;
      combined.push({
        action: "snack_distributed",
        created_at: String(s.created_at ?? new Date().toISOString()),
        email: actor?.email ?? null,
        registration_id: rid,
        details: {
          event_day: s.event_day,
          participant_name:
            reg?.participant_name ?? reg?.full_name ?? reg?.name ?? null,
          application_number: reg?.application_number ?? null,
        },
      });
    }
    recentActivity = combined
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 50);
  }

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