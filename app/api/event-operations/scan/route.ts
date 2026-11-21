import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required to operate the scanner." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: { token?: string; action?: string; eventDay?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request data." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Extract and strictly validate the UUID from the digital pass token
  const token = String(body.token ?? "").replace(/^GXC-PASS-V1:/, "").trim();
  const isValidUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token
    );

  if (!isValidUUID) {
    return NextResponse.json(
      {
        error:
          "Unrecognized QR format. Please scan a valid GenXCode Tech Fest pass.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const action =
    body.action === "snack"
      ? "snack"
      : body.action === "checkin"
        ? "checkin"
        : "";
  const eventDay = Number(body.eventDay ?? 1);

  if (!action || !Number.isInteger(eventDay) || eventDay < 1 || eventDay > 3) {
    return NextResponse.json(
      { error: "Invalid operation or event day selected." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await supabase.rpc("event_scan_pass", {
    p_token: token,
    p_action: action,
    p_event_day: eventDay,
  });

  if (error) {
    const message =
      error.message.includes("permission") ||
      error.message.includes("Volunteer access")
        ? error.message
        : "Database synchronization failed. Ask the participant to refresh their pass and try again.";

    return NextResponse.json(
      { error: message },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json(result ?? { result: "invalid" }, {
    headers: { "Cache-Control": "no-store, private" },
  });
}