"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Lock } from "lucide-react";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
} from "@/components/admin/admin-styles";
import { saveProjectSubmission } from "@/app/dashboard/submission/actions";
import type {
  ParticipantSubmissionRecord,
  ProblemOption,
} from "./submission-types";

interface ProjectSubmissionFormProps {
  submission: ParticipantSubmissionRecord | null;
  lockedProblem: ProblemOption | null;
  problems: ProblemOption[];
  closeLabel: string | null;
}

const MAX_DECK_BYTES = 15 * 1024 * 1024; // 15 MB

export function ProjectSubmissionForm({
  submission,
  lockedProblem,
  problems,
  closeLabel,
}: ProjectSubmissionFormProps) {
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    lockedProblem?.id ?? submission?.problem_statement_id ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const activeProblemId = lockedProblem?.id ?? selectedProblemId;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DECK_BYTES) {
      setClientError(
        "Presentation file exceeds 15 MB. Compress it and try again."
      );
      e.target.value = "";
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (lockRef.current || isSubmitting || clientError || !activeProblemId) {
      e.preventDefault();
      return;
    }

    lockRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <form
      action={saveProjectSubmission}
      onSubmit={handleFormSubmit}
      className="mt-8 space-y-6"
    >
      {/* 01 · Project Details */}
      <section className="rounded-2xl border border-[#e3dbd0] bg-white p-5 shadow-[0_6px_24px_rgba(27,5,62,0.025)] sm:p-8">
        <p className="editorial text-[15px] italic text-[#6828a2]">
          01 · Project details
        </p>
        <h2 className="editorial mt-1 text-2xl font-bold text-[#1b053e] sm:text-3xl">
          What did you build?
        </h2>

        {/* Problem Statement */}
        <div className="mt-6">
          <span className={ADMIN_LABEL_CLASS}>Selected problem statement *</span>

          {lockedProblem ? (
            <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-[#dfcdf5] bg-[#faf7ff] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1b053e]">
                  {lockedProblem.title}
                </p>
                {lockedProblem.domain && (
                  <p className="mt-0.5 text-xs text-[#6d627a]">
                    Domain: {lockedProblem.domain}
                  </p>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#dfcdf5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6828a2]">
                <Lock size={11} />
                Selected
              </span>
              <input
                type="hidden"
                name="problem_statement_id"
                value={lockedProblem.id}
              />
            </div>
          ) : (
            <select
              required
              name="problem_statement_id"
              value={selectedProblemId}
              onChange={(e) => setSelectedProblemId(e.target.value)}
              className={ADMIN_FIELD_CLASS}
            >
              <option value="" disabled>
                Choose your problem statement
              </option>
              {problems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-5">
          <label htmlFor="project_title" className={ADMIN_LABEL_CLASS}>
            Project title *
          </label>
          <input
            id="project_title"
            required
            minLength={3}
            maxLength={120}
            name="project_title"
            defaultValue={submission?.project_title ?? ""}
            className={ADMIN_FIELD_CLASS}
            placeholder="Give your project a clear name"
          />
        </div>

        <div className="mt-5">
          <label htmlFor="description" className={ADMIN_LABEL_CLASS}>
            Project summary *
          </label>
          <textarea
            id="description"
            required
            minLength={20}
            maxLength={3000}
            rows={4}
            name="description"
            defaultValue={submission?.description ?? ""}
            className={ADMIN_FIELD_CLASS}
            placeholder="Explain the problem you tackled and how your project solves it (20–3000 characters)."
          />
        </div>

        <div className="mt-5">
          <label htmlFor="solution_features" className={ADMIN_LABEL_CLASS}>
            Key features &amp; tech stack *
          </label>
          <textarea
            id="solution_features"
            required
            minLength={10}
            maxLength={3000}
            rows={4}
            name="solution_features"
            defaultValue={submission?.solution_features ?? ""}
            className={ADMIN_FIELD_CLASS}
            placeholder="List the core features, architecture, and tools used."
          />
        </div>
      </section>

      {/* 02 · Links */}
      <section className="rounded-2xl border border-[#e3dbd0] bg-white p-5 shadow-[0_6px_24px_rgba(27,5,62,0.025)] sm:p-8">
        <p className="editorial text-[15px] italic text-[#6828a2]">
          02 · Code &amp; live deployment
        </p>
        <h2 className="editorial mt-1 text-2xl font-bold text-[#1b053e] sm:text-3xl">
          Share your working links
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="github_url" className={ADMIN_LABEL_CLASS}>
              GitHub repository URL *
            </label>
            <input
              id="github_url"
              required
              type="url"
              name="github_url"
              pattern="https://.*"
              defaultValue={submission?.github_url ?? ""}
              className={ADMIN_FIELD_CLASS}
              placeholder="https://github.com/username/repo"
            />
          </div>

          <div>
            <label htmlFor="production_url" className={ADMIN_LABEL_CLASS}>
              Live production URL *
            </label>
            <input
              id="production_url"
              required
              type="url"
              name="production_url"
              pattern="https://.*"
              defaultValue={submission?.production_url ?? ""}
              className={ADMIN_FIELD_CLASS}
              placeholder="https://your-app.vercel.app"
            />
          </div>
        </div>
      </section>

      {/* 03 · Presentation */}
      <section className="rounded-2xl border border-[#e3dbd0] bg-white p-5 shadow-[0_6px_24px_rgba(27,5,62,0.025)] sm:p-8">
        <p className="editorial text-[15px] italic text-[#6828a2]">
          03 · Pitch deck
        </p>
        <h2 className="editorial mt-1 text-2xl font-bold text-[#1b053e] sm:text-3xl">
          Upload your presentation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#524661]">
          Upload a <strong className="font-semibold text-[#1b053e]">.ppt</strong>{" "}
          or <strong className="font-semibold text-[#1b053e]">.pptx</strong>{" "}
          deck (max 15 MB).
        </p>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="presentation" className={ADMIN_LABEL_CLASS}>
              Presentation file{" "}
              {submission?.presentation_path ? "(optional replacement)" : "*"}
            </label>
            {submission?.presentation_path && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b7a37]">
                <CheckCircle2 size={13} />
                Deck already on file
              </span>
            )}
          </div>

          <input
            id="presentation"
            type="file"
            name="presentation"
            accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            required={!submission?.presentation_path}
            onChange={handleFileChange}
            className={ADMIN_FIELD_CLASS}
          />

          {clientError && (
            <p role="alert" className="mt-2 text-xs font-semibold text-[#be123c]">
              {clientError}
            </p>
          )}
        </div>
      </section>

      {/* 04 · Declaration & Single-Submit Action */}
      <section className="rounded-2xl border border-[#e3dbd0] bg-white p-5 shadow-[0_6px_24px_rgba(27,5,62,0.025)] sm:p-8">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#3d2b54]">
          <input
            required
            type="checkbox"
            name="declaration"
            defaultChecked={Boolean(submission)}
            className="mt-1 size-4 shrink-0 accent-[#6828a2]"
          />
          <span>
            I confirm this is my original work and that my GitHub repository,
            live link, and presentation deck are publicly accessible for review.
          </span>
        </label>

        <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-[#ebe4dc] pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-[#6d627a]">
            {closeLabel
              ? `Closes on ${closeLabel} IST`
              : "You can update your entry anytime while submissions remain open."}
          </p>

          <button
            type="submit"
            disabled={isSubmitting || !activeProblemId}
            aria-busy={isSubmitting}
            className={`${ADMIN_PRIMARY_BTN} w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
          >
            <FileUp size={15} />
            <span>
              {isSubmitting
                ? "Submitting…"
                : submission
                  ? "Update submission"
                  : "Submit project"}
            </span>
          </button>
        </div>
      </section>
    </form>
  );
}