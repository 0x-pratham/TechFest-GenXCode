"use client";

import { useState } from "react";
import { Check, ExternalLink, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECONDARY_BTN,
} from "@/components/admin/admin-styles";
import {
  STATUS_BADGE_STYLES,
  STATUS_OPTIONS,
  type EnrichedSubmission,
} from "./submissions-types";

function formatSubmittedAtIst(iso: string | null): string {
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

interface SubmissionReviewCardProps {
  submission: EnrichedSubmission;
  onDecisionSaved?: (
    id: string,
    patch: { status: string; score: number | null; judge_remarks: string | null }
  ) => void;
}

export function SubmissionReviewCard({
  submission: s,
  onDecisionSaved,
}: SubmissionReviewCardProps) {
  const propKey = `${s.id}|${s.status || "pending"}|${typeof s.score === "number" ? s.score : ""}|${s.judge_remarks ?? ""}`;

  const [draft, setDraft] = useState<{
    key: string;
    status: string;
    scoreInput: string;
    remarks: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const activeDraft = draft && draft.key === propKey ? draft : null;
  const status = activeDraft ? activeDraft.status : s.status || "pending";
  const scoreInput = activeDraft
    ? activeDraft.scoreInput
    : typeof s.score === "number"
      ? String(s.score)
      : "";
  const remarks = activeDraft ? activeDraft.remarks : s.judge_remarks ?? "";

  function updateDraft(
    patch: Partial<{ status: string; scoreInput: string; remarks: string }>
  ) {
    setDraft({
      key: propKey,
      status,
      scoreInput,
      remarks,
      ...patch,
    });
    setFeedback(null);
  }

  const badgeStyle =
    STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.pending;
  const statusLabel =
    STATUS_OPTIONS.find((opt) => opt.value === status)?.label ??
    String(status || "pending").replaceAll("_", " ");

  async function handleSaveDecision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    let parsedScore: number | null = null;
    const trimmedScore = scoreInput.trim();
    if (trimmedScore !== "") {
      const num = Number(trimmedScore);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        setFeedback({
          type: "err",
          text: "Enter a valid score between 0 and 100.",
        });
        return;
      }
      parsedScore = num;
    }

    const cleanedRemarks = remarks.trim() || null;
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("project_submissions")
        .update({
          status,
          score: parsedScore,
          judge_remarks: cleanedRemarks,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", s.id);

      if (error) {
        setFeedback({
          type: "err",
          text: error.message || "Couldn’t save decision. Please try again.",
        });
        return;
      }

      onDecisionSaved?.(s.id, {
        status,
        score: parsedScore,
        judge_remarks: cleanedRemarks,
      });

      setDraft(null);
      setFeedback({
        type: "ok",
        text: "Decision saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_6px_24px_rgba(27,5,62,0.025)] transition-colors hover:border-[#d5c6e8]">
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6d627a]">
              <span className="font-mono font-semibold text-[#6828a2]">
                {s.application_number}
              </span>
              <span>·</span>
              <span>{formatSubmittedAtIst(s.submitted_at)} IST</span>
            </div>

            <h2 className="editorial mt-1 text-xl font-bold text-[#1b053e] sm:text-2xl">
              {s.project_title || "Untitled project"}
            </h2>

            <p className="mt-1 text-xs text-[#5c4f6e]">
              <strong className="font-semibold text-[#1b053e]">
                {s.participant_name}
              </strong>
              {s.participant_email ? ` · ${s.participant_email}` : ""}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-3.5 rounded-xl border border-[#ebe4dc] bg-[#faf7f2] px-3.5 py-2 text-xs">
          <span className="font-semibold text-[#6d627a]">Track: </span>
          <span className="font-semibold text-[#1b053e]">{s.problem_title}</span>
          {s.problem_domain ? (
            <span className="text-[#6d627a]"> · {s.problem_domain}</span>
          ) : null}
        </div>

        {s.description && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6d627a]">
              Overview
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#3d2b54]">
              {s.description}
            </p>
          </div>
        )}

        {s.solution_features && (
          <div className="mt-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6d627a]">
              What they built
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#524661]">
              {s.solution_features}
            </p>
          </div>
        )}

        {(s.github_url || s.production_url || s.signed_deck_url) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {s.github_url && (
              <a
                className={ADMIN_SECONDARY_BTN}
                href={s.github_url}
                target="_blank"
                rel="noreferrer"
              >
                <span>GitHub repo</span>
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
                <span>Live app</span>
                <ExternalLink size={13} className="text-[#6828a2]" />
              </a>
            )}

            {s.signed_deck_url && (
              <a
                className={ADMIN_SECONDARY_BTN}
                href={s.signed_deck_url}
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={13} className="text-[#6828a2]" />
                <span>Pitch deck</span>
              </a>
            )}
          </div>
        )}

        <form
          onSubmit={handleSaveDecision}
          className="mt-5 grid gap-3.5 rounded-xl border border-[#ebe4dc] bg-[#faf7f2] p-3.5 sm:grid-cols-2 sm:p-4"
        >
          <div>
            <label htmlFor={`status-${s.id}`} className={ADMIN_LABEL_CLASS}>
              Decision
            </label>
            <select
              id={`status-${s.id}`}
              value={status}
              onChange={(e) => updateDraft({ status: e.target.value })}
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
            <label htmlFor={`score-${s.id}`} className={ADMIN_LABEL_CLASS}>
              Score (out of 100)
            </label>
            <input
              id={`score-${s.id}`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 88"
              value={scoreInput}
              onChange={(e) => updateDraft({ scoreInput: e.target.value })}
              className={ADMIN_FIELD_CLASS}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={`remarks-${s.id}`} className={ADMIN_LABEL_CLASS}>
              Judge notes (private)
            </label>
            <textarea
              id={`remarks-${s.id}`}
              rows={2}
              placeholder="Notes for the judging panel…"
              value={remarks}
              onChange={(e) => updateDraft({ remarks: e.target.value })}
              className={ADMIN_FIELD_CLASS}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <div className="text-xs">
              {feedback ? (
                <span
                  role={feedback.type === "err" ? "alert" : "status"}
                  className={`inline-flex items-center gap-1 font-semibold ${
                    feedback.type === "err"
                      ? "text-[#be123c]"
                      : "text-[#1b7a37]"
                  }`}
                >
                  {feedback.type === "ok" && <Check size={13} />}
                  {feedback.text}
                </span>
              ) : (
                <span className="text-[#6d627a]">
                  {scoreInput.trim() !== ""
                    ? `Current score: ${scoreInput} / 100`
                    : "Not scored yet"}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`${ADMIN_PRIMARY_BTN} disabled:opacity-60`}
            >
              {saving ? "Saving…" : "Save decision"}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}