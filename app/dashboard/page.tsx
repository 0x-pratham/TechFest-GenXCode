import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock,
  Coffee,
  ExternalLink,
  FolderGit2,
  Info,
  Laptop,
  LogOut,
  QrCode,
  ScanLine,
  Sparkles,
  Ticket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import { Navbar } from "@/components/navbar";
import { DashboardUpdates } from "@/components/dashboard-updates";
import { WhatsAppChannelFloat } from "@/components/whatsapp-channel-float";
import { WhatsAppChannelGateModal } from "@/components/whatsapp-channel-gate-modal";
import { Hack2SkillGateCard } from "@/components/register/hack2skill-gate-card";
import { formatStaffIdentifier } from "@/lib/format-staff-identifier";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  getCachedEventSchedule,
  getCachedProblemStatements,
  getCachedScheduleSettings,
} from "@/lib/cache/event-data";

export const dynamic = "force-dynamic";

const HACK2SKILL_EVENT_URL =
  process.env.NEXT_PUBLIC_HACK2SKILL_URL ||
  "https://hack2skill.com/event/promptwars-x-gxctakeoff";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ h2s?: string; h2s_error?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/auth");

  const [
    { data: profile },
    { data: registration },
    { data: staffPermission },
    params,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,email,role,college,branch,study_year")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("registrations")
      .select("id,application_number,status,hack2skill_registered")
      .or(
        user.email
          ? `created_by.eq.${user.id},email.eq.${user.email}`
          : `created_by.eq.${user.id}`
      )
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.rpc("event_actor_permission"),

    searchParams,
  ]);

  const isStaff = profile?.role === "admin" || Boolean(staffPermission);

  if (!registration && !isStaff) redirect("/signup");

  const name =
    profile?.full_name || user.user_metadata?.full_name || "Participant";

  const firstName = name.trim().split(/\s+/)[0] || "Builder";

  let isHack2SkillVerified =
    isStaff || Boolean(registration?.hack2skill_registered);

  if (!isHack2SkillVerified && params.h2s === "done" && registration?.id) {
    const { data: rpcOk } = await supabase.rpc(
      "confirm_hack2skill_registration"
    );

    if (!rpcOk) {
      await supabase
        .from("registrations")
        .update({
          hack2skill_registered: true,
          hack2skill_confirmed_at: new Date().toISOString(),
        })
        .eq("id", registration.id);
    }

    isHack2SkillVerified = true;
  }

  // Inline Hack2Skill gate on /dashboard (no route bounce).
  if (!isHack2SkillVerified && registration) {
    return (
      <main className="min-h-screen bg-[#fcfaff] text-[#220749]">
        <Navbar>
          <form action={signOut}>
            <PendingSubmitButton
              pendingLabel="Signing out…"
              className="group/signout !transition-colors !duration-100 hover:!border-[#f5c2c7] hover:!from-[#fff8f8] hover:!via-[#fff1f2] hover:!to-[#ffe4e6] hover:!text-[#be123c] hover:!shadow-[0_4px_14px_rgba(225,29,72,0.12)] active:!scale-[0.98] active:!border-[#fda4af] active:!from-[#fff1f2] active:!via-[#ffe4e6] active:!to-[#fecdd3] active:!text-[#9f1239]"
            >
              <LogOut
                size={14}
                className="text-[#5f2295] transition-colors duration-100 group-hover/signout:text-[#e11d48] group-active/signout:text-[#be123c]"
              />
              <span>Sign out</span>
            </PendingSubmitButton>
          </form>
        </Navbar>

        <section className="container-shell max-w-3xl pb-20 pt-28 sm:pt-32">
          <header className="mb-7">
            <p className="editorial text-[16px] italic text-[#5f2295] sm:text-[18px]">
              One Final Step · Unlock Your Builder Dashboard
            </p>

            <h1 className="editorial mt-1.5 text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[#220749] sm:text-5xl">
              Complete Hack2Skill registration to continue.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#76678a] sm:text-[15px]">
              Your GenXCode pass (
              <span className="font-mono font-semibold text-[#5f2295]">
                {registration.application_number}
              </span>
              ) is reserved. Register on the official Hack2Skill event page
              below to unlock your QR entry pass, problem statements, and
              project submission portal.
            </p>
          </header>

          {params.h2s_error && (
            <div
              role="alert"
              className="mb-6 flex items-center gap-2.5 rounded-xl border border-[#f5c2c7] bg-[#fff1f2] px-4 py-3 text-xs font-semibold text-[#be123c] sm:text-sm"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>
                {params.h2s_error === "confirm"
                  ? "Please open Hack2Skill and check the confirmation box before unlocking your dashboard."
                  : "Could not save your confirmation. Please try again."}
              </span>
            </div>
          )}

          <Hack2SkillGateCard
            applicationNumber={String(
              registration.application_number ?? "GENX-PASS"
            )}
            participantName={firstName}
          />
        </section>
      </main>
    );
  }

  const [events, problems, { data: selection }, scheduleSettings] =
    await Promise.all([
      getCachedEventSchedule(),
      getCachedProblemStatements(),

      supabase
        .from("registration_problem_statements")
        .select("problem_statement_id")
        .eq(
          "registration_id",
          registration?.id ?? "00000000-0000-0000-0000-000000000000"
        )
        .maybeSingle(),

      getCachedScheduleSettings(),
    ]);

  const staffIdentifier = formatStaffIdentifier(name);

  const selectedProblem = problems.find(
    (p) => p.id === selection?.problem_statement_id
  );

  const academicSummary = [profile?.branch, profile?.study_year]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen bg-[#fcfaff] text-[#220749]">
      {/* Universal Floating Navbar with Sign Out Only */}
      <Navbar>
        <form action={signOut}>
          <PendingSubmitButton
            pendingLabel="Signing out…"
            className="group/signout !transition-colors !duration-100 hover:!border-[#f5c2c7] hover:!from-[#fff8f8] hover:!via-[#fff1f2] hover:!to-[#ffe4e6] hover:!text-[#be123c] hover:!shadow-[0_4px_14px_rgba(225,29,72,0.12)] active:!scale-[0.98] active:!border-[#fda4af] active:!from-[#fff1f2] active:!via-[#ffe4e6] active:!to-[#fecdd3] active:!text-[#9f1239]"
          >
            <LogOut
              size={14}
              className="text-[#5f2295] transition-colors duration-100 group-hover/signout:text-[#e11d48] group-active/signout:text-[#be123c]"
            />
            <span>Sign out</span>
          </PendingSubmitButton>
        </form>
      </Navbar>

      {/* Main Dashboard Stage */}
      <section className="container-shell space-y-8 pb-16 pt-28 sm:space-y-10 sm:pt-32">
        {/* Top Row: Greeting + Always-Visible Hack2Skill Strip */}
        <div className="space-y-6">
          <div className="max-w-2xl">
            <p className="editorial text-[17px] italic font-normal text-[#5f2295] sm:text-[19px]">
              {isStaff
                ? "GenXCode Event Operations"
                : "First Anniversary · Builder Space"}
            </p>

            <h1 className="editorial mt-1.5 text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl xl:text-[3.5rem]">
              Welcome back,{" "}
              <span className="italic font-normal text-[#5f2295]">
                {firstName}.
              </span>
            </h1>

            <p className="mt-3.5 text-[15px] leading-relaxed text-[#76678a]">
              {isStaff
                ? "Your event staff credentials are active. Manage check-ins, refreshment distribution, and live schedules from your workspace."
                : "Your complimentary First Anniversary pass is confirmed. Keep your QR badge handy at check-in, pick your problem statement below, and submit your build before the deadline."}
            </p>
          </div>

          {/* Always-Visible Hack2Skill Registration Prompt */}
          <aside
            aria-label="Hack2Skill registration reminder"
            className="rounded-[1.5rem] border border-[#eadff5] bg-white p-5 shadow-[0_12px_36px_rgba(34,4,75,0.04)] sm:p-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="editorial text-[15px] italic font-normal text-[#5f2295]">
                  Take Off With GenXCode
                </p>

                <h2 className="editorial mt-0.5 text-xl font-bold leading-snug tracking-tight text-[#220749] sm:text-2xl">
                  Missed Hack2Skill Registration for Take Off With GenXCode?
                </h2>

                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#76678a] sm:text-sm">
                  Make sure your official Hack2Skill registration is also
                  completed on the event portal so your hackathon entry stays
                  synced.
                </p>
              </div>

              <div className="w-full shrink-0 md:w-auto">
                <a
                  href={HACK2SKILL_EVENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold md:w-auto"
                >
                  <span>Complete Now</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </aside>
        </div>

        {/* Section 1: Two-Column Identity & Pass Deck */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT CARD: Participant / Staff Credential Card */}
          <article className="flex flex-col justify-between rounded-[1.5rem] border border-[#eadff5] bg-white p-6 shadow-[0_12px_36px_rgba(34,4,75,0.04)] sm:p-7 lg:col-span-7">
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#f0e8f8] pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#5f2295]">
                    {isStaff ? "Staff credential" : "Participant credential"}
                  </p>

                  <p className="mt-0.5 truncate text-sm text-[#76678a]">
                    {user.email}
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#eefaf1] px-3 py-1 text-xs font-semibold text-[#1b7a37]">
                  <CheckCircle2 size={13} strokeWidth={2.4} />
                  <span>{isStaff ? "Active" : "Confirmed"}</span>
                </span>
              </div>

              <div className="mt-6">
                <p className="text-xs text-[#76678a]">
                  {isStaff ? "Staff identifier" : "Application number"}
                </p>

                <p className="editorial mt-1 text-3xl font-bold tracking-tight text-[#220749] sm:text-4xl">
                  {isStaff
                    ? staffIdentifier
                    : registration?.application_number}
                </p>

                {!isStaff && (profile?.college || academicSummary) && (
                  <p className="mt-2 text-xs text-[#76678a]">
                    {[profile?.college, academicSummary]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>

            {/* Action Footer inside Left Card */}
            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[#f0e8f8] pt-5">
              {isStaff ? (
                <Link
                  href={
                    profile?.role === "admin"
                      ? "/admin/operations"
                      : "/volunteer/dashboard"
                  }
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold"
                >
                  <ScanLine size={15} />
                  <span>Open Check-in &amp; Operations</span>
                  <ArrowUpRight size={14} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/dashboard/pass"
                    className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold"
                  >
                    <QrCode size={15} />
                    <span>Open Entry QR Pass</span>
                  </Link>

                  <Link
                    href="/dashboard/submission"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#eadff5] bg-[#faf7ff] px-4 py-2.5 text-xs font-semibold text-[#220749] transition-colors hover:border-[#c7a6f3] hover:text-[#5f2295]"
                  >
                    <FolderGit2 size={14} className="text-[#5f2295]" />
                    <span>Project Submission</span>
                  </Link>
                </>
              )}
            </div>
          </article>

          {/* RIGHT CARD: Ticket Summary / Staff Role Card */}
          <article className="flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-[#e6dfd4] bg-gradient-to-b from-white via-[#fdfcfa] to-[#f7f4ee] text-[#1d1a18] shadow-[0_14px_40px_rgba(34,4,75,0.05)] lg:col-span-5">
            {/* Curved Top Purple Accent */}
            <div
              aria-hidden="true"
              className="h-1.5 w-full shrink-0 rounded-t-[calc(1.5rem-1px)] bg-gradient-to-r from-[#5f2295] via-[#8638cd] to-[#5f2295]"
            />

            <div className="p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="editorial text-sm italic text-[#5f2295]">
                  {isStaff ? "Event Team" : "Builder Pass Summary"}
                </span>

                <Ticket size={17} className="text-[#5f2295]" />
              </div>

              <h2 className="editorial mt-3 text-2xl font-bold leading-snug text-[#1d1a18] sm:text-[1.65rem]">
                {isStaff
                  ? "You’re part of the crew."
                  : "You’re in for Take Off With GenXCode."}
              </h2>

              <p className="mt-2 text-[13.5px] leading-relaxed text-[#6e665e]">
                {isStaff
                  ? "Your staff ID is separate from participant passes and grants live scanning and event management access."
                  : "Includes full hackathon access, 3 expert workshops, PromptWars, morning breakfast, and refreshments."}
              </p>

              {!isStaff && (
                <dl className="mt-5 space-y-2.5 border-t border-[#e8e2d7] pt-4 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-[#837b72]">
                      {selectedProblem ? (
                        <CheckCircle2
                          size={13}
                          className="shrink-0 text-[#1b7a37]"
                        />
                      ) : (
                        <Circle
                          size={13}
                          className="shrink-0 text-[#8638cd]"
                        />
                      )}
                      <span>Problem statement</span>
                    </dt>

                    <dd className="max-w-[60%] truncate font-semibold text-[#1d1a18]">
                      {selectedProblem ? (
                        selectedProblem.title
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#8638cd]">
                          <Clock size={12} />
                          Choose below
                        </span>
                      )}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#837b72]">Pass tier</dt>

                    <dd className="font-semibold text-[#5f2295]">
                      First Anniversary · ₹0
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {/* Perforated Tear Line + Stub */}
            <div>
              <div className="relative flex items-center justify-between px-4">
                <span className="-ml-6 h-5 w-5 rounded-full border border-[#e6dfd4] bg-[#fcfaff]" />
                <div className="w-full border-t border-dashed border-[#dfd8cc]" />
                <span className="-mr-6 h-5 w-5 rounded-full border border-[#e6dfd4] bg-[#fcfaff]" />
              </div>

              <div className="flex items-center justify-between bg-[#f4f0e8]/75 px-6 py-3.5 text-xs">
                <span className="text-[#756d65]">
                  {isStaff ? "Role" : "Status"}
                </span>

                <span className="font-semibold capitalize text-[#1d1a18]">
                  {isStaff
                    ? profile?.role === "admin"
                      ? "Administrator"
                      : "Event Volunteer"
                    : registration?.status ?? "Confirmed"}
                </span>
              </div>
            </div>
          </article>
        </div>

        {/* Section 2: Participant Updates & Problem Statement Selector */}
        {!isStaff && (
          <DashboardUpdates
            events={events}
            problems={problems}
            selectedProblemStatementId={
              selection?.problem_statement_id ?? null
            }
          />
        )}

        {/* Section 3: Important Information & Readiness Guide */}
        {!isStaff && (
          <section className="rounded-[1.5rem] border border-[#eadff5] bg-white p-6 shadow-[0_12px_36px_rgba(34,4,75,0.03)] sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#f0e8f8] pb-5">
              <div>
                <p className="editorial text-[16px] italic text-[#5f2295]">
                  Good to know
                </p>

                <h2 className="editorial mt-1 text-2xl font-bold tracking-tight text-[#220749] sm:text-3xl">
                  Important information for event day
                </h2>
              </div>

              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#76678a]">
                <Info size={14} className="text-[#5f2295]" />
                <span>Everything you need for a smooth experience</span>
              </p>
            </div>

            {/* 3-Column Humanized Guide */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Note 1: Gate Entry & Dynamic QR */}
              <div className="rounded-2xl border border-[#f0e8f8] bg-[#fcfaff] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#eadff5] bg-white text-[#5f2295]">
                  <QrCode size={17} />
                </div>

                <h3 className="mt-4 text-[15px] font-semibold text-[#220749]">
                  Gate check-in &amp; live QR pass
                </h3>

                <p className="mt-2 text-[13.5px] leading-relaxed text-[#76678a]">
                  Your entry QR code refreshes automatically every 30 seconds
                  for security, so open{" "}
                  <Link
                    href="/dashboard/pass"
                    className="font-semibold text-[#5f2295] underline decoration-[#c7a6f3] underline-offset-2 hover:text-[#220749]"
                  >
                    My Pass
                  </Link>{" "}
                  directly on your phone at the entrance instead of taking a
                  screenshot.
                </p>
              </div>

              {/* Note 2: Food, Workshops & Arena */}
              <div className="rounded-2xl border border-[#f0e8f8] bg-[#fcfaff] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#eadff5] bg-white text-[#5f2295]">
                  <Coffee size={17} />
                </div>

                <h3 className="mt-4 text-[15px] font-semibold text-[#220749]">
                  Complimentary meals &amp; sessions
                </h3>

                <p className="mt-2 text-[13.5px] leading-relaxed text-[#76678a]">
                  To celebrate one year of GenXCode, morning breakfast, tea,
                  and refreshments are on us—show the same QR pass at the
                  hospitality counter. All 3 workshops and PromptWars rounds
                  are included.
                </p>
              </div>

              {/* Note 3: What to Bring & Project Submission */}
              <div className="rounded-2xl border border-[#f0e8f8] bg-[#fcfaff] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#eadff5] bg-white text-[#5f2295]">
                  <Laptop size={17} />
                </div>

                <h3 className="mt-4 text-[15px] font-semibold text-[#220749]">
                  What to carry &amp; submissions
                </h3>

                <p className="mt-2 text-[13.5px] leading-relaxed text-[#76678a]">
                  Carry your laptop, charger, extension board if handy, and a
                  valid college ID. Choose your problem statement above early,
                  and upload your build link in{" "}
                  <Link
                    href="/dashboard/submission"
                    className="font-semibold text-[#5f2295] underline decoration-[#c7a6f3] underline-offset-2 hover:text-[#220749]"
                  >
                    Project Submission
                  </Link>{" "}
                  before the clock runs out.
                </p>
              </div>
            </div>

            {/* Quiet Bottom Reassurance Strip */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6dfd4] bg-[#faf7f2] px-4 py-3 text-xs text-[#6e665e]">
              <span className="inline-flex items-center gap-2 font-medium text-[#1d1a18]">
                <Sparkles size={14} className="text-[#5f2295]" />
                <span>
                  Need live announcements or venue help? Join the official
                  WhatsApp channel from the button in the corner.
                </span>
              </span>

              <span className="font-semibold text-[#5f2295]">
                Individual Participation · Take Off With GenXCode
              </span>
            </div>
          </section>
        )}
      </section>

      {/* WhatsApp Channel Gate — Participants Only */}
      {!isStaff && (
        <WhatsAppChannelGateModal
          url={scheduleSettings?.whatsapp_channel_url ?? null}
          storageKeySuffix={registration?.id ?? user.id}
        />
      )}

      {/* Floating WhatsApp Channel Button */}
      <WhatsAppChannelFloat
        url={scheduleSettings?.whatsapp_channel_url ?? null}
      />
    </main>
  );
}