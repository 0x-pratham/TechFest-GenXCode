import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CalendarCog,
  CheckCircle2,
  FolderGit2,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import { Navbar } from "@/components/navbar";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { formatStaffIdentifier } from "@/lib/format-staff-identifier";
import { OperationsLiveWorkspace } from "@/components/admin/operations/operations-live-workspace";
import type { OperationsSummary } from "@/components/admin/operations/operations-types";

export const dynamic = "force-dynamic";

const SAVED_MESSAGES: Record<string, string> = {
  volunteer: "Volunteer scanner access updated.",
  "volunteer-status": "Volunteer duty status updated.",
  "snack-policy": "Snack distribution rule updated.",
};

const ERROR_MESSAGES: Record<string, string> = {
  volunteer: "Could not update volunteer access. Check the email and retry.",
  "snack-policy": "Could not update snack distribution rule. Please retry.",
};

export default async function OperationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth?next=/admin/operations");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/");

  let initialSummary: OperationsSummary = {
    total_registered: 0,
    checked_in: 0,
    snacks_distributed: 0,
    pending_checkin: 0,
    snack_policy: "event",
    volunteers: [],
    recent_activity: [],
  };

  const [dataResult, params] = await Promise.all([
    Promise.all([
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
        .select(
          "id,email,full_name,role,volunteer_permission,is_volunteer_active"
        )
        .in("role", ["volunteer", "admin"]),
    ]).catch((err) => {
      console.error("[OperationsAdminPage] Initial data load warning:", err);
      return [
        { data: null },
        { data: null },
        { data: null },
      ] as const;
    }),
    searchParams,
  ]);

  const [{ data: regRows }, { data: settings }, { data: volunteerRows }] =
    dataResult;

  if (regRows || settings || volunteerRows) {
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

    initialSummary = {
      total_registered: totalRegistered,
      checked_in: checkedIn,
      snacks_distributed: snacksDistributed,
      pending_checkin: Math.max(0, totalRegistered - checkedIn),
      snack_policy: settings?.snack_policy ?? "event",
      volunteers: (volunteerRows ?? [])
        .filter(
          (v) => v.role === "volunteer" || Boolean(v.volunteer_permission)
        )
        .map((v) => ({
          user_id: String(v.id),
          email: String(v.email ?? ""),
          name: typeof v.full_name === "string" ? v.full_name : null,
          permission: String(v.volunteer_permission ?? "both"),
          is_active: v.is_volunteer_active !== false,
        })),
      recent_activity: confirmedRows
        .filter((r) => Boolean(r.checked_in_at))
        .slice(0, 50)
        .map((r) => ({
          action: "participant_checked_in",
          created_at: String(r.checked_in_at),
          email:
            typeof r.participant_email === "string"
              ? r.participant_email
              : typeof r.email === "string"
                ? r.email
                : null,
          registration_id: r.id ? String(r.id) : null,
          details: {
            participant_name:
              r.participant_name ?? r.full_name ?? r.name ?? null,
            application_number: r.application_number ?? null,
          },
        })),
    };
  }

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || "Organizer";
  const staffCode = formatStaffIdentifier(profile?.full_name);

  return (
    <main className="min-h-screen bg-[#f9f6f1] text-[#1b053e]">
      {/* Universal Floating Navbar (No Subnav) */}
      <Navbar>
        <Link href="/admin">
          <CalendarCog size={14} className="text-[#6828a2]" />
          <span>Event setup</span>
        </Link>

        <Link href="/admin/submissions">
          <FolderGit2 size={14} className="text-[#6828a2]" />
          <span>Submissions</span>
        </Link>

        <Link href="/dashboard">
          <LayoutDashboard size={14} className="text-[#6828a2]" />
          <span>Dashboard</span>
        </Link>

        <form action={signOut}>
          <PendingSubmitButton
            pendingLabel="Signing out…"
            className="group/signout !transition-colors !duration-100 hover:!border-[#f5c2c7] hover:!from-[#fff8f8] hover:!via-[#fff1f2] hover:!to-[#ffe4e6] hover:!text-[#be123c] hover:!shadow-[0_4px_14px_rgba(225,29,72,0.12)] active:!scale-[0.98] active:!border-[#fda4af] active:!from-[#fff1f2] active:!via-[#ffe4e6] active:!to-[#fecdd3] active:!text-[#9f1239]"
          >
            <LogOut
              size={14}
              className="text-[#6828a2] transition-colors duration-100 group-hover/signout:text-[#e11d48] group-active/signout:text-[#be123c]"
            />
            <span>Sign out</span>
          </PendingSubmitButton>
        </form>
      </Navbar>

      <div className="container-shell pb-20 pt-24 sm:pt-32">
        {/* Warm Editorial Header */}
        <header className="border-b border-[#e8e0d8] pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[#6d627a]">
            <p className="editorial text-[15px] italic text-[#6828a2] sm:text-[16px]">
              Take Off With GenXCode
            </p>
            <p className="font-mono text-[11px] text-[#5e536b] sm:text-[11.5px]">
              Signed in as {firstName} · {staffCode}
            </p>
          </div>

          <h1 className="editorial mt-2 text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[#1b053e] sm:text-5xl">
            Event operations
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#524661] sm:text-[15px]">
            Assign gate and hospitality volunteers, monitor live check-in
            turnout, and enforce snack distribution rules.
          </p>
        </header>

        {/* Feedback Banners */}
        {params.saved && (
          <div
            role="status"
            className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#bfe6c9] bg-[#eefaf1] px-4 py-3 text-xs font-semibold text-[#1b7a37] sm:text-sm"
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{SAVED_MESSAGES[params.saved] ?? "Changes saved."}</span>
          </div>
        )}

        {params.error && (
          <div
            role="alert"
            className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#f5c2c7] bg-[#fff1f2] px-4 py-3 text-xs font-semibold text-[#be123c] sm:text-sm"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>
              {ERROR_MESSAGES[params.error] ??
                "Check the form fields and try again."}
            </span>
          </div>
        )}

        {/* Zero-Latency Live Workspace */}
        <div className="min-w-0">
          <OperationsLiveWorkspace
            initialSummary={initialSummary}
            intervalMs={8000}
          />
        </div>
      </div>
    </main>
  );
}