import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OperationsSummary } from "@/components/admin/operations/operations-types";

export const dynamic = "force-dynamic";

function unwrapRpcPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first || typeof first !== "object") return null;

  const record = first as Record<string, unknown>;
  if (
    "event_operations_summary" in record &&
    record.event_operations_summary &&
    typeof record.event_operations_summary === "object"
  ) {
    return record.event_operations_summary as Record<string, unknown>;
  }
  return record;
}

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

  const { data: rpcRaw, error: rpcError } = await supabase.rpc(
    "event_operations_summary"
  );

  const parsed = unwrapRpcPayload(rpcRaw);

  // If RPC succeeded and returned valid numbers, return immediately
  if (!rpcError && parsed && parsed.total_registered !== undefined) {
    const total = Number(parsed.total_registered ?? 0);
    const checked = Number(parsed.checked_in ?? 0);

    const normalized: OperationsSummary = {
      total_registered: total,
      checked_in: checked,
      snacks_distributed: Number(parsed.snacks_distributed ?? 0),
      pending_checkin:
        parsed.pending_checkin !== undefined
          ? Number(parsed.pending_checkin)
          : Math.max(0, total - checked),
      snack_policy:
        typeof parsed.snack_policy === "string" ? parsed.snack_policy : "event",
      volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : [],
      recent_activity: Array.isArray(parsed.recent_activity)
        ? parsed.recent_activity
        : [],
    };

    return NextResponse.json(normalized, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Fallback: fetch registrations rows with select("*") so no column-name mismatch fails the query
  const [{ data: regRows, error: regError }, { data: settings }] =
    await Promise.all([
      supabase.from("registrations").select("*"),
      supabase
        .from("event_schedule_settings")
        .select("snack_policy")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  const rows = regRows ?? [];
  const total = rows.length;
  const checked = rows.filter(
    (r: Record<string, unknown>) =>
      r.checked_in === true || Boolean(r.checked_in_at)
  ).length;
  const snacks = rows.filter(
    (r: Record<string, unknown>) =>
      Number(r.snacks_count ?? r.snack_count ?? 0) > 0 ||
      r.snack_claimed === true ||
      Boolean(r.snack_claimed_at)
  ).length;

  return NextResponse.json(
    {
      total_registered: total,
      checked_in: checked,
      snacks_distributed: snacks,
      pending_checkin: Math.max(0, total - checked),
      snack_policy: settings?.snack_policy ?? "event",
      volunteers: [],
      recent_activity: [],
      _debug: {
        rpcError: rpcError?.message ?? null,
        regError: regError?.message ?? null,
        rawRpc: rpcRaw ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}