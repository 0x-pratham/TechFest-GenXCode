import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 30;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data, error: rpcError } = await supabase.rpc(
      "issue_digital_pass_token"
    );

    if (rpcError) {
      console.error("[/api/pass/token] RPC error:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Unable to issue pass token" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    const rawUuid =
      typeof row === "string"
        ? row
        : typeof row?.token === "string"
          ? row.token
          : null;

    if (!rawUuid) {
      return NextResponse.json(
        { error: "Pass token unavailable" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const formattedToken = rawUuid.startsWith("GXC-PASS-V1:")
      ? rawUuid
      : `GXC-PASS-V1:${rawUuid}`;

    const expiresAtMs = row?.expires_at
      ? new Date(row.expires_at).getTime()
      : Date.now() + TOKEN_TTL_SECONDS * 1000;

    const expiresIn = Math.max(
      5,
      Math.round((expiresAtMs - Date.now()) / 1000)
    );

    return NextResponse.json(
      {
        token: formattedToken,
        expiresIn,
        expiresAt: expiresAtMs,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err) {
    console.error("[/api/pass/token] unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to issue pass token" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export const POST = GET;