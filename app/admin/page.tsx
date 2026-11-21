import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import { Navbar } from "@/components/navbar";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { formatStaffIdentifier } from "@/lib/format-staff-identifier";
import { ScheduleSettingsSection } from "@/components/admin/schedule-settings-section";
import { EventDetailsSection } from "@/components/admin/event-details-section";
import { ProblemStatementsSection } from "@/components/admin/problem-statements-section";
import {
  AdminLiveSync,
  AdminMobileNav,
} from "@/components/admin/admin-nav-and-sync";

export const dynamic = "force-dynamic";

const SAVED_MESSAGES: Record<string, string> = {
  "day-count": "Event duration updated.",
  "event-detail": "Schedule session saved.",
  "whatsapp-channel": "WhatsApp channel link updated.",
  "event-delete": "Schedule session removed.",
  problem: "Problem statement saved.",
  "problem-delete": "Problem statement removed.",
};

const ERROR_MESSAGES: Record<string, string> = {
  "days-in-use":
    "Cannot reduce day count while sessions exist on later days. Move or delete those sessions first.",
  "day-count": "Select a valid number of event days.",
  "whatsapp-channel":
    "Enter a valid WhatsApp Channel URL starting with https://whatsapp.com/channel/.",
  "event-detail": "Check the session title and selected day, then retry.",
  "event-delete": "Could not remove this session. Please retry.",
  "problem-in-use":
    "Participants have already selected this track. Unpublish it instead of deleting.",
  "problem-delete": "Could not delete this problem statement.",
  problem: "Check the required fields on the problem statement.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const [
    { data: scheduleSettings },
    { data: events },
    { data: problems },
    params,
  ] = await Promise.all([
    supabase
      .from("event_schedule_settings")
      .select("day_count,whatsapp_channel_url")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("event_details")
      .select(
        "id,day_number,title,venue,timing,pre_instructions,is_published,created_at"
      )
      .order("day_number")
      .order("created_at"),
    supabase
      .from("problem_statements")
      .select(
        "id,title,summary,domain,difficulty,max_slots,filled_slots,display_order,is_active,name,email,phone"
      )
      .order("display_order"),
    searchParams,
  ]);

  const dayCount = scheduleSettings?.day_count ?? 1;
  const sessionList = events ?? [];
  const problemList = problems ?? [];
  const liveSessionsCount = sessionList.filter((e) => e.is_published).length;
  const activeTracksCount = problemList.filter((p) => p.is_active).length;
  const maxOccupiedDay = sessionList.reduce(
    (max, item) => Math.max(max, item.day_number || 1),
    1
  );

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || "Organizer";
  const staffCode = formatStaffIdentifier(profile?.full_name);

  const signOutControl = (
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
  );

  return (
    <main className="min-h-screen bg-[#f9f6f1] text-[#1b053e]">
      <AdminLiveSync />

      {/* Universal Floating Navbar with Mobile Menu */}
      <Navbar>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/admin/operations"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#1b053e] transition-colors hover:bg-[#f2eafb]"
          >
            <SlidersHorizontal size={14} className="text-[#6828a2]" />
            <span>Operations</span>
          </Link>

          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#1b053e] transition-colors hover:bg-[#f2eafb]"
          >
            <FolderGit2 size={14} className="text-[#6828a2]" />
            <span>Submissions</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#1b053e] transition-colors hover:bg-[#f2eafb]"
          >
            <LayoutDashboard size={14} className="text-[#6828a2]" />
            <span>Dashboard</span>
          </Link>

          {signOutControl}
        </div>

        <AdminMobileNav signOutSlot={signOutControl} />
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
            Event setup &amp; program
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#524661] sm:text-[15px]">
            Configure how many days the event runs, publish daily sessions,
            update the WhatsApp announcement link, and manage problem tracks.
          </p>

          {/* Compact Configuration Summary */}
          <dl className="mt-5 grid grid-cols-3 gap-2.5 sm:max-w-xl sm:gap-3.5">
            <div className="rounded-xl border border-[#e3dbd0] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgba(27,5,62,0.02)]">
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6d627a]">
                Duration
              </dt>
              <dd className="editorial mt-0.5 text-lg font-bold tabular-nums text-[#1b053e] sm:text-xl">
                {dayCount} {dayCount === 1 ? "Day" : "Days"}
              </dd>
            </div>

            <div className="rounded-xl border border-[#e3dbd0] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgba(27,5,62,0.02)]">
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6d627a]">
                Sessions
              </dt>
              <dd className="editorial mt-0.5 text-lg font-bold tabular-nums text-[#1b7a37] sm:text-xl">
                {liveSessionsCount}/{sessionList.length}
              </dd>
            </div>

            <div className="rounded-xl border border-[#e3dbd0] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgba(27,5,62,0.02)]">
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6d627a]">
                Tracks
              </dt>
              <dd className="editorial mt-0.5 text-lg font-bold tabular-nums text-[#6828a2] sm:text-xl">
                {activeTracksCount}/{problemList.length}
              </dd>
            </div>
          </dl>
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

        {/* Organized Management Sections */}
        <div className="min-w-0 space-y-8">
          <ScheduleSettingsSection
            key={`schedule-${dayCount}-${scheduleSettings?.whatsapp_channel_url ?? ""}`}
            dayCount={dayCount}
            whatsappChannelUrl={scheduleSettings?.whatsapp_channel_url ?? null}
            maxOccupiedDay={maxOccupiedDay}
          />

          <EventDetailsSection
            key={`events-${sessionList.length}-${liveSessionsCount}`}
            dayCount={dayCount}
            events={sessionList}
          />

          <ProblemStatementsSection
            key={`problems-${problemList.length}-${activeTracksCount}`}
            problems={problemList}
          />
        </div>
      </div>
    </main>
  );
}