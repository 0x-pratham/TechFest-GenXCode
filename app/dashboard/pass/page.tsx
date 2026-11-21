import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coffee,
  FolderGit2,
  IdCard,
  Layers,
  QrCode,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { DigitalPass } from "@/components/digital-pass";

export const dynamic = "force-dynamic";

export default async function DigitalPassPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/auth?next=/dashboard/pass");

  const [{ data: profile }, { data: registration }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,college,branch,study_year,city")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("registrations")
      .select("id,application_number,status")
      .eq("created_by", user.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!registration) redirect("/register");

  const { data: selection } = await supabase
    .from("registration_problem_statements")
    .select("problem_statements(title,domain)")
    .eq("registration_id", registration.id)
    .maybeSingle();

  const selectedTrack = Array.isArray(selection?.problem_statements)
    ? selection.problem_statements[0]
    : selection?.problem_statements;

  const resolvedName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Participant";

  const firstName = resolvedName.trim().split(/\s+/)[0] || "Builder";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fcfaff] text-[#220749]">
      <Navbar>
        <Link href="/dashboard">
          <ArrowLeft size={14} className="text-[#5f2295]" />
          <span>Dashboard</span>
        </Link>
      </Navbar>

      <div
        role="region"
        aria-label="Event Entry Pass"
        className="container-shell pb-16 pt-24 sm:pt-30"
      >
        <div className="mx-auto grid max-w-[960px] grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(336px,376px)_minmax(0,1fr)] lg:gap-11">
          {/* LEFT COLUMN: Proportional Physical Ticket */}
          <div className="mx-auto w-full max-w-[376px] lg:sticky lg:top-28 lg:mx-0">
            <DigitalPass
              fullName={resolvedName}
              applicationNumber={registration.application_number || "Pending"}
              college={profile?.college ?? null}
              branch={profile?.branch ?? null}
              studyYear={profile?.study_year ?? null}
              city={profile?.city ?? null}
            />
          </div>

          {/* RIGHT COLUMN: Editorial Check-In & Pass Details */}
          <div className="flex min-w-0 flex-col gap-5">
            {/* Editorial Masthead */}
            <div>
              <p className="editorial text-[16px] italic text-[#6828a2] sm:text-[17px]">
                Take Off With GenXCode · Entry Credential
              </p>
              <h1 className="editorial mt-1 text-3xl font-bold leading-[1.1] tracking-[-0.025em] text-[#1b053e] sm:text-[2.35rem]">
                Your pass is ready, {firstName}.
              </h1>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#5c4f6e]">
                Present the live QR code on your pass at the registration desk
                and food counters. Tap the pass anytime to flip it and check
                included sessions.
              </p>
            </div>

            {/* Credential & Track Summary Row */}
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#eadff5] bg-white p-4 shadow-[0_8px_28px_rgba(27,5,62,0.03)] sm:grid-cols-2 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eefaf1] text-[#1b7a37]">
                  <CheckCircle2 size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7a6f88]">
                    Status
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-[#1b053e]">
                    Confirmed · {registration.application_number}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#eadff5] bg-[#faf7ff] text-[#6828a2]">
                  <Layers size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7a6f88]">
                    Selected Track
                  </p>
                  <div className="mt-0.5 truncate text-sm font-bold text-[#1b053e]">
                    {selectedTrack?.title ? (
                      selectedTrack.title
                    ) : (
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 text-[#6828a2] underline decoration-[#c7a6f3] underline-offset-2 hover:text-[#1b053e]"
                      >
                        <Clock size={13} />
                        <span>Select on dashboard</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Check-In Reference Card */}
            <div className="rounded-2xl border border-[#e3dbd0] bg-gradient-to-b from-white via-[#fdfcfa] to-[#f6f2ea] p-5 shadow-[0_10px_30px_rgba(27,5,62,0.03)] sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6828a2]">
                Venue Check-In Notes
              </p>

              <ul className="mt-4 space-y-4 text-[13.5px] leading-relaxed text-[#4f4740]">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#e2d9cb] bg-white text-[#6828a2]">
                    <QrCode size={14} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1d1a18]">
                      30-second rotating QR
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#685f57]">
                      Each code expires after 30 seconds, so static screenshots
                      will not scan at the gate. Keep this page open when
                      approaching the desk.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#e2d9cb] bg-white text-[#6828a2]">
                    <Coffee size={14} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1d1a18]">
                      Gate, workshops &amp; hospitality
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#685f57]">
                      The same pass covers main gate check-in, all three
                      workshops, breakfast, and tea breaks.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#e2d9cb] bg-white text-[#6828a2]">
                    <IdCard size={14} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1d1a18]">
                      College ID &amp; hardware
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#685f57]">
                      Carry your college ID card, laptop, and charger for
                      verification at entry.
                    </p>
                  </div>
                </li>
              </ul>

              {/* Direct Submission Action */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3dbd0] pt-4 text-xs">
                <span className="font-medium text-[#6e665e]">
                  Ready to submit your hackathon build?
                </span>

                <Link
                  href="/dashboard/submission"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#6828a2] transition-colors hover:text-[#1b053e]"
                >
                  <FolderGit2 size={14} />
                  <span>Open Project Submission</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}