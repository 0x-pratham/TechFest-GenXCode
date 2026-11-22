import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  Lock,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import { Navbar } from "@/components/navbar";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SubmissionStatusCard } from "@/components/dashboard/submission/submission-status-card";
import { ProjectSubmissionForm } from "@/components/dashboard/submission/project-submission-form";
import type {
  ParticipantSubmissionRecord,
  ProblemOption,
} from "@/components/dashboard/submission/submission-types";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  closed: "The submission window is currently closed.",
  registration: "A confirmed registration is required before submitting.",
  validation: "Please fill in all required fields and use valid HTTPS URLs.",
  file: "Please upload a .ppt or .pptx file up to 2.5 MB.",
  upload: "Could not upload your presentation deck. Please try again.",
  save: "Could not save your submission. Please try again.",
};

function isSubmissionWindowOpen(
  isOpenFlag: boolean | null | undefined,
  closesAtIso: string | null | undefined
): boolean {
  if (!isOpenFlag) return false;
  if (!closesAtIso) return true;
  const closesAtMs = new Date(closesAtIso).getTime();
  if (Number.isNaN(closesAtMs)) return true;
  return closesAtMs > Date.now();
}

function formatIstDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(parsed)
    .replace(",", "");
}

export default async function ProjectSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/auth?next=/dashboard/submission");

  // Wave 1: Load profile, candidate registrations, window settings, tracks & params
  const [
    { data: profile },
    { data: candidateRegs },
    { data: windowSettings },
    { data: problemsData },
    params,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role,full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("registrations")
      .select("*")
      .or(
        user.email
          ? `created_by.eq.${user.id},email.eq.${user.email}`
          : `created_by.eq.${user.id}`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("project_submission_settings")
      .select("is_open,closes_at")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("problem_statements")
      .select("id,title,domain")
      .eq("is_active", true)
      .order("display_order"),
    searchParams,
  ]);

  const isAdmin = profile?.role === "admin";
  const rows = (candidateRegs ?? []) as Record<string, unknown>[];
  const confirmedReg =
    rows.find((r) => String(r.status ?? "").toLowerCase() !== "cancelled") ??
    rows[0] ??
    null;

  if (!confirmedReg && !isAdmin) {
    redirect("/signup");
  }

  // Enforce mandatory Hack2Skill gate via inline /dashboard screen
  if (confirmedReg && !confirmedReg.hack2skill_registered && !isAdmin) {
    redirect("/dashboard");
  }

  const registration = confirmedReg
    ? {
        id: String(confirmedReg.id),
        application_number: String(
          confirmedReg.application_number ?? "GENX-PASS"
        ),
        raw: confirmedReg,
      }
    : {
        id: "",
        application_number: "ADMIN-PREVIEW",
        raw: {} as Record<string, unknown>,
      };

  // Wave 2: Load existing submission + chosen problem from registration_problem_statements
  const [{ data: submissionData }, { data: problemSelection }] =
    await Promise.all([
      registration.id
        ? supabase
            .from("project_submissions")
            .select("*")
            .eq("registration_id", registration.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      registration.id
        ? supabase
            .from("registration_problem_statements")
            .select("problem_statement_id")
            .eq("registration_id", registration.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const submission = (submissionData ??
    null) as ParticipantSubmissionRecord | null;
  const problems = (problemsData ?? []) as ProblemOption[];

  const regRaw = registration.raw;
  const assignedProblemId =
    [
      problemSelection?.problem_statement_id,
      regRaw.problem_statement_id,
      submission?.problem_statement_id,
    ].find((v): v is string => typeof v === "string" && v.trim().length > 0) ??
    null;

  let lockedProblem: ProblemOption | null = assignedProblemId
    ? problems.find((p) => p.id === assignedProblemId) ?? null
    : null;

  if (assignedProblemId && !lockedProblem) {
    const { data: fallbackProblem } = await supabase
      .from("problem_statements")
      .select("id,title,domain")
      .eq("id", assignedProblemId)
      .maybeSingle();
    if (fallbackProblem) lockedProblem = fallbackProblem as ProblemOption;
  }

  const isOpen = isSubmissionWindowOpen(
    windowSettings?.is_open,
    windowSettings?.closes_at
  );
  const closeLabel = formatIstDeadline(windowSettings?.closes_at);

  return (
    <main className="min-h-screen bg-[#f9f6f1] text-[#1b053e]">
      <Navbar>
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

      <div className="container-shell max-w-4xl pb-20 pt-24 sm:pt-32">
        {/* Warm Editorial Header */}
        <header className="border-b border-[#e5ddd2] pb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[#6d627a]">
            <p className="editorial text-[15px] italic text-[#6828a2] sm:text-[16px]">
              GenXCode Solo Hackathon
            </p>
            <p className="font-mono text-[11px] text-[#5e536b] sm:text-[11.5px]">
              Application {registration.application_number}
            </p>
          </div>

          <h1 className="editorial mt-2 text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[#1b053e] sm:text-5xl">
            Project submission
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#524661] sm:text-[15px]">
            Submit your GitHub repository, live deployment, and presentation
            deck (up to 2.5 MB) for evaluation.
          </p>
        </header>

        {/* Feedback Banners */}
        {params.saved && (
          <div
            role="status"
            className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#bfe6c9] bg-[#eefaf1] px-4 py-3 text-xs font-semibold text-[#1b7a37] sm:text-sm"
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Your project submission has been saved.</span>
          </div>
        )}

        {params.error && (
          <div
            role="alert"
            className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#f5c2c7] bg-[#fff1f2] px-4 py-3 text-xs font-semibold text-[#be123c] sm:text-sm"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{ERROR_MESSAGES[params.error] ?? "Something went wrong."}</span>
          </div>
        )}

        {/* Live Project Status Card (Shown immediately once submitted) */}
        {submission && (
          <SubmissionStatusCard
            submission={submission}
            problemTitle={lockedProblem?.title ?? "Assigned problem statement"}
          />
        )}

        {/* Closed State vs Open Form */}
        {!isOpen ? (
          <section className="mt-8 rounded-2xl border border-[#e3dbd0] bg-white p-7 text-center shadow-[0_6px_24px_rgba(27,5,62,0.025)] sm:p-10">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#dfcdf5] bg-[#f6f0fd] text-[#6828a2]">
              <Lock size={22} />
            </div>
            <h2 className="editorial mt-4 text-2xl font-bold text-[#1b053e] sm:text-3xl">
              Submissions are closed
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#524661]">
              The submission portal is currently locked by the organizers.
              {submission
                ? " Your existing entry is safely recorded above."
                : " Check back once the window opens."}
            </p>
          </section>
        ) : (
          <ProjectSubmissionForm
            submission={submission}
            lockedProblem={lockedProblem}
            problems={problems}
            closeLabel={closeLabel}
          />
        )}
      </div>
    </main>
  );
}