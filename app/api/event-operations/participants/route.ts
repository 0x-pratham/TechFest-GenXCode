import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface NormalizedParticipant {
  registration_id: string;
  participant_name: string;
  application_number: string;
  participant_email: string;
  checked_in_at: string | null;
  snack_claims: number;
}

function normalizeRow(row: Record<string, unknown>): NormalizedParticipant {
  const id = String(row.registration_id ?? row.id ?? "");
  const name = String(
    row.participant_name ??
      row.full_name ??
      row.name ??
      [row.first_name, row.last_name].filter(Boolean).join(" ") ??
      ""
  ).trim();

  const email = String(
    row.participant_email ?? row.email ?? ""
  ).trim();

  const appNo = String(
    row.application_number ??
      row.registration_code ??
      row.pass_code ??
      row.ticket_number ??
      (id ? id.slice(0, 8).toUpperCase() : "")
  ).trim();

  const checkedInAt =
    typeof row.checked_in_at === "string" && row.checked_in_at
      ? row.checked_in_at
      : row.checked_in === true
        ? String(row.updated_at ?? row.created_at ?? new Date().toISOString())
        : null;

  const snackClaims = Number(
    row.snack_claims ??
      row.snacks_count ??
      row.snack_count ??
      (row.snack_claimed === true ? 1 : 0)
  );

  return {
    registration_id: id,
    participant_name: name || email || "Participant",
    application_number: appNo,
    participant_email: email,
    checked_in_at: checkedInAt,
    snack_claims: Number.isFinite(snackClaims) ? snackClaims : 0,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, { data: staffPermission }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("event_actor_permission"),
  ]);

  const isAdmin = profile?.role === "admin";
  let isVolunteer =
    profile?.role === "volunteer" || Boolean(staffPermission);

  if (!isAdmin && !isVolunteer) {
    const { data: volunteer } = await supabase
      .from("event_volunteers")
      .select("is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    isVolunteer = Boolean(volunteer?.is_active);
  }

  if (!isAdmin && !isVolunteer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  // 1. Try SQL search RPC if present in Supabase
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "event_search_participants",
    { p_query: q }
  );

  if (!rpcError && Array.isArray(rpcRows)) {
    return NextResponse.json(
      {
        participants: rpcRows
          .slice(0, 100)
          .map((r) => normalizeRow(r as Record<string, unknown>)),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // 2. Direct query across registrations + profiles + event_attendance + snack_distributions
  const [
    { data: regRows, error: regError },
    { data: attendanceRows },
    { data: snackRows },
    { data: profileRows },
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("*")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("event_attendance")
      .select("registration_id,checked_in_at"),
    supabase
      .from("snack_distributions")
      .select("registration_id"),
    supabase
      .from("profiles")
      .select("id,full_name,email"),
  ]);

  if (regError) {
    console.error("[event-operations/participants] Query error:", regError.message);
    return NextResponse.json(
      { error: `Could not load participants: ${regError.message}` },
      { status: 500 }
    );
  }

  const attendanceByRegId = new Map<string, string>();
  for (const row of attendanceRows ?? []) {
    const regId = String(row.registration_id ?? "");
    if (!regId) continue;
    if (typeof row.checked_in_at === "string" && row.checked_in_at) {
      attendanceByRegId.set(regId, row.checked_in_at);
    }
  }

  const snackCountByRegId = new Map<string, number>();
  for (const row of snackRows ?? []) {
    const regId = String(row.registration_id ?? "");
    if (!regId) continue;
    snackCountByRegId.set(regId, (snackCountByRegId.get(regId) ?? 0) + 1);
  }

  const profileByUserId = new Map<
    string,
    { full_name: string | null; email: string | null }
  >();
  for (const p of profileRows ?? []) {
    profileByUserId.set(String(p.id), {
      full_name: typeof p.full_name === "string" ? p.full_name : null,
      email: typeof p.email === "string" ? p.email : null,
    });
  }

  const normalized = (regRows ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const regId = String(row.id ?? row.registration_id ?? "");
    const ownerId = String(row.created_by ?? row.user_id ?? "");
    const ownerProfile = ownerId ? profileByUserId.get(ownerId) : undefined;

    return normalizeRow({
      ...row,
      registration_id: regId,
      full_name: row.full_name ?? row.name ?? ownerProfile?.full_name ?? null,
      email: row.email ?? ownerProfile?.email ?? null,
      checked_in_at:
        attendanceByRegId.get(regId) ??
        (typeof row.checked_in_at === "string" ? row.checked_in_at : null),
      snack_claims: snackCountByRegId.get(regId) ?? 0,
    });
  });

  const needle = q.toLowerCase();
  const filtered = needle
    ? normalized.filter(
        (p) =>
          p.participant_name.toLowerCase().includes(needle) ||
          p.participant_email.toLowerCase().includes(needle) ||
          p.application_number.toLowerCase().includes(needle)
      )
    : normalized;

  return NextResponse.json(
    { participants: filtered.slice(0, 100) },
    { headers: { "Cache-Control": "no-store" } }
  );
}