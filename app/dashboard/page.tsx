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

        <section className="container-shell max-w-3xl pb-14 pt-24 sm:pb-20 sm:pt-32">
          <header className="mb-6">
            <p className="editorial text-[15px] italic text-[#5f2295] sm:text-[18px]">
              One Final Step · Unlock Your Builder Dashboard
            </p>

            <h1 className="editorial mt-1 text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[#220749] sm:text-5xl">
              Complete Hack2Skill registration to continue.
            </h1>

            <p className="mt-2.5 max-w-2xl text-xs leading-relaxed text-[#76678a] sm:text-[15px]">
              Your GenXCode pass (
              <span className="font-mono font-semibold text-[#5f2295]">
                {registration.application_number}
              </span>
              ) is reserved. Register on Hack2Skill below to unlock your QR
              pass, problem statements, and submission portal.
            </p>
          </header>

          {params.h2s_error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#f5c2c7] bg-[#fff1f2] px-4 py-3 text-xs font-semibold text-[#be123c] sm:text-sm"
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

      {/* Main Dashboard Stage — Compact Mobile Spacing */}
      <section className="container-shell space-y-5 pb-14 pt-24 sm:space-y-8 sm:pb-16 sm:pt-32">
        {/* Greeting + Always-Visible Hack2Skill Strip */}
        <div className="space-y-4 sm:space-y-5">
          <div className="max-w-2xl">
            <p className="editorial text-[15px] italic font-normal text-[#5f2295] sm:text-[19px]">
              {isStaff
                ? "GenXCode Event Operations"
                : "First Anniversary · Builder Space"}
            </p>

            <h1 className="editorial mt-1 text-3xl leading-[1.06] tracking-[-0.03em] sm:mt-1.5 sm:text-5xl xl:text-[3.5rem]">
              Welcome back,{" "}
              <span className="italic font-normal text-[#5f2295]">
                {firstName}.
              </span>
            </h1>

            <p className="mt-2 text-xs leading-relaxed text-[#76678a] sm:mt-3 sm:text-[15px]">
              {isStaff
                ? "Staff credentials active—manage check-ins, refreshments, and schedules."
                : "Your complimentary pass is confirmed. Keep your QR badge handy, pick your problem statement, and submit before the deadline."}
            </p>
          </div>

          {/* Always-Visible Hack2Skill Registration Prompt */}
          <aside
            aria-label="Hack2Skill registration reminder"
            className="rounded-2xl border border-[#eadff5] bg-white p-4 shadow-[0_10px_28px_rgba(34,4,75,0.04)] sm:rounded-[1.5rem] sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="editorial text-sm italic font-normal text-[#5f2295] sm:text-base">
                  Take Off With GenXCode
                </p>

                <h2 className="editorial mt-0.5 text-lg font-bold leading-snug tracking-tight text-[#220749] sm:text-2xl">
                  Missed Hack2Skill Registration for Take Off With GenXCode?
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-[#76678a] sm:text-sm">
                  Complete your official Hack2Skill entry so your registration
                  stays synced.
                </p>
              </div>

              <a
                href={HACK2SKILL_EVENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold sm:w-auto sm:px-5 sm:py-3"
              >
                <span>Complete Now</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </aside>
        </div>

        {/* Section 1: Two-Column Identity & Pass Deck */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          {/* LEFT CARD: Participant / Staff Credential Card */}
          <article className="flex flex-col justify-between rounded-2xl border border-[#eadff5] bg-white p-5 shadow-[0_10px_28px_rgba(34,4,75,0.04)] sm:rounded-[1.5rem] sm:p-7 lg:col-span-7">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[#f0e8f8] pb-3 sm:pb-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#5f2295] sm:text-xs">
                    {isStaff ? "Staff credential" : "Participant credential"}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-[#76678a] sm:text-sm">
                    {user.email}
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eefaf1] px-2.5 py-1 text-[11px] font-semibold text-[#1b7a37] sm:px-3 sm:text-xs">
                  <CheckCircle2 size={12} strokeWidth={2.4} />
                  <span>{isStaff ? "Active" : "Confirmed"}</span>
                </span>
              </div>

              <div className="mt-4 sm:mt-6">
                <p className="text-[11px] text-[#76678a] sm:text-xs">
                  {isStaff ? "Staff identifier" : "Application number"}
                </p>

                <p className="editorial mt-0.5 text-2xl font-bold tracking-tight text-[#220749] sm:mt-1 sm:text-4xl">
                  {isStaff
                    ? staffIdentifier
                    : registration?.application_number}
                </p>

                {!isStaff && (profile?.college || academicSummary) && (
                  <p className="mt-1.5 text-xs text-[#76678a]">
                    {[profile?.college, academicSummary]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>

            {/* Action Footer inside Left Card */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-[#f0e8f8] pt-4 sm:mt-7 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:pt-5">
              {isStaff ? (
                <Link
                  href={
                    profile?.role === "admin"
                      ? "/admin/operations"
                      : "/volunteer/dashboard"
                  }
                  className="btn-primary col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold sm:w-auto"
                >
                  <ScanLine size={15} />
                  <span>Open Check-in &amp; Operations</span>
                  <ArrowUpRight size={14} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/dashboard/pass"
                    className="btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold sm:px-4"
                  >
                    <QrCode size={15} />
                    <span>Entry QR Pass</span>
                  </Link>

                  <Link
                    href="/dashboard/submission"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#eadff5] bg-[#faf7ff] px-3.5 py-2.5 text-xs font-semibold text-[#220749] transition-colors hover:border-[#c7a6f3] hover:text-[#5f2295] sm:px-4"
                  >
                    <FolderGit2 size={14} className="text-[#5f2295]" />
                    <span>Submission</span>
                  </Link>
                </>
              )}
            </div>
          </article>

          {/* RIGHT CARD: Ticket Summary / Staff Role Card */}
          <article className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e6dfd4] bg-gradient-to-b from-white via-[#fdfcfa] to-[#f7f4ee] text-[#1d1a18] shadow-[0_12px_32px_rgba(34,4,75,0.05)] sm:rounded-[1.5rem] lg:col-span-5">
            <div
              aria-hidden="true"
              className="h-1.5 w-full shrink-0 bg-gradient-to-r from-[#5f2295] via-[#8638cd] to-[#5f2295]"
            />

            <div className="p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="editorial text-xs italic text-[#5f2295] sm:text-sm">
                  {isStaff ? "Event Team" : "Builder Pass Summary"}
                </span>

                <Ticket size={16} className="text-[#5f2295]" />
              </div>

              <h2 className="editorial mt-2 text-xl font-bold leading-snug text-[#1d1a18] sm:mt-3 sm:text-[1.65rem]">
                {isStaff
                  ? "You’re part of the crew."
                  : "You’re in for Take Off With GenXCode."}
              </h2>

              <p className="mt-1.5 text-xs leading-relaxed text-[#6e665e] sm:mt-2 sm:text-[13.5px]">
                {isStaff
                  ? "Live scanning and event operations access enabled."
                  : "Includes hackathon access, 3 workshops, PromptWars, breakfast & refreshments."}
              </p>

              {!isStaff && (
                <dl className="mt-4 space-y-2 border-t border-[#e8e2d7] pt-3.5 text-xs sm:mt-5 sm:space-y-2.5 sm:pt-4">
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

                    <dd className="max-w-[58%] truncate font-semibold text-[#1d1a18]">
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

              <div className="flex items-center justify-between bg-[#f4f0e8]/75 px-5 py-3 text-xs sm:px-6 sm:py-3.5">
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

        {/* Section 3: Compact Event-Day Essentials */}
        {!isStaff && (
          <section className="rounded-2xl border border-[#eadff5] bg-white p-5 shadow-[0_10px_28px_rgba(34,4,75,0.03)] sm:rounded-[1.5rem] sm:p-8">
            <div className="border-b border-[#f0e8f8] pb-4 sm:pb-5">
              <p className="editorial text-sm italic text-[#5f2295] sm:text-[16px]">
                Good to know
              </p>

              <h2 className="editorial mt-0.5 text-xl font-bold tracking-tight text-[#220749] sm:text-3xl">
                Event day essentials
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:mt-6 sm:grid-cols-3 sm:gap-6">
              <div className="rounded-xl border border-[#f0e8f8] bg-[#fcfaff] p-4 sm:rounded-2xl sm:p-5">
                <div className="flex items-center gap-2.5 sm:block">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#eadff5] bg-white text-[#5f2295] sm:h-9 sm:w-9 sm:rounded-xl">
                    <QrCode size={16} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#220749] sm:mt-3.5 sm:text-[15px]">
                    Live QR entry pass
                  </h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#76678a] sm:text-[13.5px]">
                  Refreshes every 30s—open{" "}
                  <Link
                    href="/dashboard/pass"
                    className="font-semibold text-[#5f2295] underline decoration-[#c7a6f3] underline-offset-2"
                  >
                    My Pass
                  </Link>{" "}
                  live at the gate instead of using screenshots.
                </p>
              </div>

              <div className="rounded-xl border border-[#f0e8f8] bg-[#fcfaff] p-4 sm:rounded-2xl sm:p-5">
                <div className="flex items-center gap-2.5 sm:block">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#eadff5] bg-white text-[#5f2295] sm:h-9 sm:w-9 sm:rounded-xl">
                    <Coffee size={16} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#220749] sm:mt-3.5 sm:text-[15px]">
                    Meals &amp; sessions
                  </h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#76678a] sm:text-[13.5px]">
                  Breakfast, tea, and refreshments are complimentary—show your
                  QR pass at hospitality. Workshops &amp; PromptWars included.
                </p>
              </div>

              <div className="rounded-xl border border-[#f0e8f8] bg-[#fcfaff] p-4 sm:rounded-2xl sm:p-5">
                <div className="flex items-center gap-2.5 sm:block">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#eadff5] bg-white text-[#5f2295] sm:h-9 sm:w-9 sm:rounded-xl">
                    <Laptop size={16} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#220749] sm:mt-3.5 sm:text-[15px]">
                    Carry &amp; submit
                  </h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#76678a] sm:text-[13.5px]">
                  Bring laptop, charger, extension cord &amp; college ID. Pick
                  your problem statement and upload in{" "}
                  <Link
                    href="/dashboard/submission"
                    className="font-semibold text-[#5f2295] underline decoration-[#c7a6f3] underline-offset-2"
                  >
                    Submission
                  </Link>{" "}
                  on time.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-[#e6dfd4] bg-[#faf7f2] px-4 py-3 text-xs text-[#6e665e] sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="inline-flex items-center gap-2 font-medium text-[#1d1a18]">
                <Sparkles size={14} className="shrink-0 text-[#5f2295]" />
                <span>
                  Live updates on the official WhatsApp channel—tap the corner
                  button.
                </span>
              </span>
              <span className="font-semibold text-[#5f2295]">
                Individual Entry · Take Off With GenXCode
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