import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatIst(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", "");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  // Verify admin role against public.profiles (matches /admin/operations)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required to export event records." },
      { status: 403 }
    );
  }

  // Query active registrations directly (excluding cancelled entries)
  const { data: rows, error: queryError } = await supabase
    .from("registrations")
    .select("*")
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (queryError) {
    console.error("[event-operations/export] Query failed:", queryError.message);
    return NextResponse.json(
      { error: `Failed to export event records: ${queryError.message}` },
      { status: 500 }
    );
  }

  const headers = [
    "Application Number",
    "Participant Name",
    "Email",
    "Phone",
    "College / Organization",
    "Status",
    "Checked In At (IST)",
    "Snack Claims",
    "Registered At (IST)",
  ];

  const csvLines = [headers.join(",")];

  for (const raw of rows ?? []) {
    const r = raw as Record<string, unknown>;
    const id = String(r.id ?? "");
    const appNo =
      r.application_number ??
      r.pass_code ??
      (id ? id.slice(0, 8).toUpperCase() : "");
    const name =
      r.participant_name ??
      r.full_name ??
      r.name ??
      [r.first_name, r.last_name].filter(Boolean).join(" ");
    const email = r.participant_email ?? r.email ?? "";
    const phone = r.phone ?? r.mobile ?? r.contact_number ?? "";
    const college = r.college ?? r.institution ?? r.organization ?? "";
    const status = r.status ?? (r.is_confirmed ? "confirmed" : "");
    const checkedInAt =
      typeof r.checked_in_at === "string" && r.checked_in_at
        ? formatIst(r.checked_in_at)
        : r.checked_in === true
          ? "Checked in"
          : "Pending";
    const snackClaims = Number(
      r.snack_claims ?? r.snacks_count ?? (r.snack_claimed === true ? 1 : 0)
    );
    const createdAt = formatIst(r.created_at);

    csvLines.push(
      [
        appNo,
        name,
        email,
        phone,
        college,
        status,
        checkedInAt,
        Number.isFinite(snackClaims) ? snackClaims : 0,
        createdAt,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  const csvBody = `\uFEFF${csvLines.join("\r\n")}`;

  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="genxcode-attendance-${fileDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}