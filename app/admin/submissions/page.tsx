import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CalendarCog,
  CheckCircle2,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  SlidersHorizontal,
  Unlock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import { Navbar } from "@/components/navbar";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { formatStaffIdentifier } from "@/lib/format-staff-identifier";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECONDARY_BTN,
} from "@/components/admin/admin-styles";
import { reviewSubmission, updateSubmissionWindow } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending review" },
  { value: "under_review", label: "Under review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Not selected" },
  { value: "winner", label: "Winner" },
] as const;

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "border-[#e3dbd0] bg-[#faf7f2] text-[#5e536b]",
  under_review: "border-[#dfcdf5] bg-[#f6f0fd] text-[#6828a2]",
  shortlisted: "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]",
  rejected: "border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]",
  winner: "border-[#d8b4fe] bg-[#1b053e] text-[#f9f6f1]",
};

const SAVED_MESSAGES: Record<string, string> = {
  window: "Submission window settings updated.",
  review: "Project review and score saved.",
};

const ERROR_MESSAGES: Record<string, string> = {
  window: "Could not update the submission window. Check the closing date and retry.",
  review: "Could not save the project review. Check the score and retry.",
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

function formatIstInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(parsed.getTime() + 330 * 60000).toISOString().slice(0, 16);
}

function formatSubmittedAtIst(iso: string | null | undefined): string {
  if (!iso) return "Timestamp unavailable";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Timestamp unavailable";

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

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const [{ data: windowSettings }, { data: submissions }, params] =
    await Promise.all([
      supabase
        .from("project_submission_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("project_submissions")
        .select("*")
        .order("submitted_at", { ascending: false }),
      searchParams,
    ]);

  const rows = submissions ?? [];
  const registrationIds = [
    ...new Set(rows.map((s) => s.registration_id).filter(Boolean)),
  ];
  const problemIds = [
    ...new Set(rows.map((s) => s.problem_statement_id).filter(Boolean)),
  ];

  const [{ data: registrations }, { data: problems }, signedResults] =
    await Promise.all([
      registrationIds.length
        ? supabase
            .from("registrations")
            .select("id,name,email,application_number")
            .in("id", registrationIds)
        : Promise.resolve({ data: [] }),
      problemIds.length
        ? supabase
            .from("problem_statements")
            .select("id,title,domain")
            .in("id", problemIds)
        : Promise.resolve({ data: [] }),
      Promise.all(
        rows.map((s) =>
          s.presentation_path
            ? supabase.storage
                .from("project-presentations")
                .createSignedUrl(s.presentation_path, 600)
            : Promise.resolve({ data: null })
        )
      ),
    ]);

  const registrationMap = new Map(
    (registrations ?? []).map((r) => [r.id, r])
  );
  const problemMap = new Map((problems ?? []).map((p) => [p.id, p]));

  const closeValue = formatIstInputValue(windowSettings?.closes_at);
  const effectiveOpen = isSubmissionWindowOpen(
    windowSettings?.is_open,
    windowSettings?.closes_at
  );

  const counts = {
    total: rows.length,
    pending: rows.filter(
      (s) => s.status === "pending" || s.status === "under_review"
    ).length,
    shortlisted: rows.filter((s) => s.status === "shortlisted").length,
    winners: rows.filter((s) => s.status === "winner").length,
  };

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || "Organizer";
  const staffCode = formatStaffIdentifier(profile?.full_name);

  return (
    <main className="min-h-screen bg-[#f9f6f1] text-[#1b053e]">
      <Navbar>
        <Link href="/admin">
          <CalendarCog size={14} className="text-[#6828a2]" />
          <span>Event setup</span>
        </Link>

        <Link href="/admin/operations">
          <SlidersHorizontal size={14} className="text-[#6828a2]" />
          <span>Operations</span>
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
            Project submissions
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#524661] sm:text-[15px]">
            Control the submission portal window, inspect repositories and pitch
            decks, and score solo hackathon projects.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl border border-[#e3dbd0] bg-white p-4 shadow-[0_6px_22px_rgba(27,5,62,0.025)]">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6d627a]">
                Total received
              </dt>
              <dd className="editorial mt-1.5 text-3xl font-bold tabular-nums text-[#1b053e]">
                {counts.total}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#e3dbd0] bg-white p-4 shadow-[0_6px_22px_rgba(27,5,62,0.025)]">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6d627a]">
                In review queue
              </dt>
              <dd className="editorial mt-1.5 text-3xl font-bold tabular-nums text-[#6828a2]">
                {counts.pending}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#e3dbd0] bg-white p-4 shadow-[0_6px_22px_rgba(27,5,62,0.025)]">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6d627a]">
                Shortlisted
              </dt>
              <dd className="editorial mt-1.5 text-3xl font-bold tabular-nums text-[#1b7a37]">
                {counts.shortlisted}
              </dd>
            </div>

            <div className="rounded-2xl border border-[#e3dbd0] bg-white p-4 shadow-[0_6px_22px_rgba(27,5,62,0.025)]">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6d627a]">
                Winners
              </dt>
              <dd className="editorial mt-1.5 text-3xl font-bold tabular-nums text-[#1b053e]">
                {counts.winners}
              </dd>
            </div>
          </dl>
        </header>

        {params.saved && (
          <div
            role="status"
            className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#bfe6c9] bg-[#eefaf1] px-4 py-3 text-xs font-semibold text-[#1b7a37] sm:text-sm"
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span>
              {SAVED_MESSAGES[params.saved] ?? "Changes saved successfully."}
            </span>
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
                "Could not save changes. Check the fields and try again."}
            </span>
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_8px_28px_rgba(27,5,62,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3.5">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl border ${
                  effectiveOpen
                    ? "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
                    : "border-[#dfcdf5] bg-[#f6f0fd] text-[#6828a2]"
                }`}
              >
                {effectiveOpen ? <Unlock size={20} /> : <Lock size={20} />}
              </span>
              <div>
                <p className="editorial text-[14px] italic text-[#6828a2]">
                  Portal Access Control
                </p>
                <h2 className="editorial text-xl font-bold text-[#1b053e] sm:text-2xl">
                  {effectiveOpen
                    ? "Submissions are currently open"
                    : "Submissions are locked"}
                </h2>
              </div>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                effectiveOpen
                  ? "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
                  : "border-[#e3dbd0] bg-[#faf7f2] text-[#6d627a]"
              }`}
            >
              {effectiveOpen ? "Live" : "Closed"}
            </span>
          </div>

          <div className="p-5 sm:p-7">
            <form
              key={`window-${effectiveOpen}-${closeValue}`}
              action={updateSubmissionWindow}
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label className="flex min-h-[46px] cursor-pointer items-center gap-3 rounded-xl border border-[#e3dbd0] bg-[#faf7f2] px-4 py-3 text-xs font-semibold text-[#1b053e] transition-colors hover:border-[#c7a6f3] sm:text-sm">
                <input
                  type="checkbox"
                  name="is_open"
                  defaultChecked={effectiveOpen}
                  className="size-4 accent-[#6828a2]"
                />
                <span>Accept project submissions</span>
              </label>

              <div>
                <label htmlFor="closes_at" className={ADMIN_LABEL_CLASS}>
                  Optional closing date &amp; time (IST)
                </label>
                <input
                  id="closes_at"
                  type="datetime-local"
                  name="closes_at"
                  defaultValue={closeValue}
                  className={ADMIN_FIELD_CLASS}
                />
              </div>

              <PendingSubmitButton
                pendingLabel="Saving window…"
                className={`${ADMIN_PRIMARY_BTN} w-full justify-center sm:w-auto`}
              >
                Save window
              </PendingSubmitButton>
            </form>

            <p className="mt-3 text-xs leading-relaxed text-[#6d627a]">
              The portal stays closed by default. Once a scheduled deadline
              passes, new uploads lock automatically until reopened here.
            </p>
          </div>
        </section>

        <section className="mt-8 space-y-5">
          {rows.map((s, index) => {
            const reg = registrationMap.get(s.registration_id);
            const problem = problemMap.get(s.problem_statement_id);
            const signedUrl = signedResults[index]?.data?.signedUrl;
            const badgeStyle =
              STATUS_BADGE_STYLES[s.status] ?? STATUS_BADGE_STYLES.pending;
            const statusLabel =
              STATUS_OPTIONS.find((opt) => opt.value === s.status)?.label ??
              String(s.status || "pending").replaceAll("_", " ");

            return (
              <article
                key={s.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_8px_28px_rgba(27,5,62,0.03)]"
              >
                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6d627a]">
                        <span className="font-mono font-semibold text-[#6828a2]">
                          {reg?.application_number ?? "APPLICATION"}
                        </span>
                        <span>·</span>
                        <span>
                          Submitted {formatSubmittedAtIst(s.submitted_at)} IST
                        </span>
                      </div>

                      <h2 className="editorial mt-1.5 text-2xl font-bold text-[#1b053e]">
                        {s.project_title || "Untitled project"}
                      </h2>

                      <p className="mt-1 text-xs text-[#5c4f6e]">
                        <strong className="font-semibold text-[#1b053e]">
                          {reg?.name ?? "Participant"}
                        </strong>
                        {reg?.email ? ` · ${reg.email}` : ""}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeStyle}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#ebe4dc] bg-[#faf7f2] px-4 py-2.5 text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#6d627a]">
                      Track:{" "}
                    </span>
                    <span className="font-semibold text-[#1b053e]">
                      {problem?.title ?? "Track unavailable"}
                    </span>
                    {problem?.domain ? (
                      <span className="text-[#6d627a]"> · {problem.domain}</span>
                    ) : null}
                  </div>

                  {s.description && (
                    <div className="mt-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6d627a]">
                        Project summary
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#3d2b54]">
                        {s.description}
                      </p>
                    </div>
                  )}

                  {s.solution_features && (
                    <div className="mt-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6d627a]">
                        Key features &amp; architecture
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#524661]">
                        {s.solution_features}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    {s.github_url && (
                      <a
                        className={ADMIN_SECONDARY_BTN}
                        href={s.github_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>GitHub repository</span>
                        <ExternalLink size={13} className="text-[#6828a2]" />
                      </a>
                    )}

                    {s.production_url && (
                      <a
                        className={ADMIN_SECONDARY_BTN}
                        href={s.production_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>Live demo</span>
                        <ExternalLink size={13} className="text-[#6828a2]" />
                      </a>
                    )}

                    {signedUrl && (
                      <a
                        className={ADMIN_SECONDARY_BTN}
                        href={signedUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={13} className="text-[#6828a2]" />
                        <span>Presentation deck</span>
                      </a>
                    )}
                  </div>

                  <form
                    key={`review-${s.id}-${s.status}-${s.score ?? ""}`}
                    action={reviewSubmission}
                    className="mt-6 grid gap-4 rounded-xl border border-[#ebe4dc] bg-[#faf7f2] p-4 sm:grid-cols-2 sm:p-5"
                  >
                    <input type="hidden" name="id" value={s.id} />

                    <div>
                      <label
                        htmlFor={`status-${s.id}`}
                        className={ADMIN_LABEL_CLASS}
                      >
                        Review decision
                      </label>
                      <select
                        id={`status-${s.id}`}
                        name="status"
                        defaultValue={s.status}
                        className={ADMIN_FIELD_CLASS}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`score-${s.id}`}
                        className={ADMIN_LABEL_CLASS}
                      >
                        Judge score (0 – 100)
                      </label>
                      <input
                        id={`score-${s.id}`}
                        name="score"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="e.g. 86.5"
                        defaultValue={s.score ?? ""}
                        className={ADMIN_FIELD_CLASS}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`remarks-${s.id}`}
                        className={ADMIN_LABEL_CLASS}
                      >
                        Private judge remarks
                      </label>
                      <textarea
                        id={`remarks-${s.id}`}
                        name="judge_remarks"
                        rows={2}
                        placeholder="Internal evaluation notes (not visible to participants)…"
                        defaultValue={s.judge_remarks ?? ""}
                        className={ADMIN_FIELD_CLASS}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                      <span className="text-[11.5px] text-[#6d627a]">
                        {typeof s.score === "number"
                          ? `Current score: ${s.score} / 100`
                          : "Unscored"}
                      </span>

                      <PendingSubmitButton
                        pendingLabel="Saving review…"
                        className={ADMIN_PRIMARY_BTN}
                      >
                        Save review
                      </PendingSubmitButton>
                    </div>
                  </form>
                </div>
              </article>
            );
          })}

          {rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#dcd0ec] bg-white p-12 text-center">
              <p className="editorial text-xl font-bold text-[#1b053e]">
                No project submissions yet
              </p>
              <p className="mt-1.5 text-sm text-[#6d627a]">
                The submission portal is currently{" "}
                <strong className="font-semibold text-[#1b053e]">
                  {effectiveOpen ? "open" : "closed"}
                </strong>
                . Submitted projects will appear here automatically.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}