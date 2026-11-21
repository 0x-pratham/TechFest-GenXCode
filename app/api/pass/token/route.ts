import { createHmac, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 30;

function getSigningSecret(): string {
  const secret =
    process.env.PASS_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing PASS_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY in production."
    );
  }

  return "genxcode-local-dev-pass-secret";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("id,application_number,status")
      .eq("created_by", user.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "No confirmed registration found" },
        { status: 404 }
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + TOKEN_TTL_SECONDS;

    const payload = Buffer.from(
      JSON.stringify({
        rid: registration.id,
        app: registration.application_number,
        uid: user.id,
        jti: randomBytes(6).toString("hex"),
        iat: nowSec,
        exp: expSec,
      })
    ).toString("base64url");

    const sig = createHmac("sha256", getSigningSecret())
      .update(payload)
      .digest("base64url");

    const token = `GXC1.${payload}.${sig}`;

    return NextResponse.json(
      {
        token,
        expiresIn: TOKEN_TTL_SECONDS,
        expiresAt: expSec * 1000,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err) {
    console.error("[/api/pass/token] failed:", err);
    return NextResponse.json(
      { error: "Unable to issue pass token" },
      { status: 500 }
    );
  }
}

export const POST = GET;