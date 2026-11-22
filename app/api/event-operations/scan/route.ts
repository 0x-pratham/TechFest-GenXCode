import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ACTIONS = new Set(["checkin", "snack", "tea", "water"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: unknown;
      action?: unknown;
      eventDay?: unknown;
    };

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const rawAction =
      typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const action = ALLOWED_ACTIONS.has(rawAction) ? rawAction : "checkin";
    const eventDay = Number.isInteger(Number(body.eventDay))
      ? Math.max(1, Number(body.eventDay))
      : 1;

    if (!token) {
      return NextResponse.json(
        {
          result: "error",
          error: "Please scan a QR code or enter a pass token.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { result: "error", error: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.rpc("event_scan_pass", {
      p_token: token,
      p_action: action,
      p_event_day: eventDay,
    });

    if (error) {
      return NextResponse.json(
        {
          result: "error",
          error: error.message || "Scan verification failed.",
        },
        { status: 403 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json(
        { result: "invalid", error: "Pass not found or invalid." },
        { status: 200 }
      );
    }

    return NextResponse.json(row, { status: 200 });
  } catch {
    return NextResponse.json(
      { result: "error", error: "Invalid request payload." },
      { status: 400 }
    );
  }
}