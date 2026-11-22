"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SUBMISSION_STATUS_META,
  type ParticipantSubmissionRecord,
} from "./submission-types";

interface SubmissionStatusCardProps {
  submission: ParticipantSubmissionRecord;
  problemTitle: string;
}

function formatIstTimestamp(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";

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

export function SubmissionStatusCard({
  submission,
  problemTitle,
}: SubmissionStatusCardProps) {
  const [realtimePatch, setRealtimePatch] = useState<{
    status?: string;
    submitted_at?: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`participant-submission-${submission.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "project_submissions",
          filter: `id=eq.${submission.id}`,
        },
        (payload) => {
          const next = payload.new as Partial<ParticipantSubmissionRecord>;
          setRealtimePatch({
            status: typeof next.status === "string" ? next.status : undefined,
            submitted_at:
              typeof next.submitted_at === "string"
                ? next.submitted_at
                : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [submission.id]);

  const liveStatus = realtimePatch?.status ?? (submission.status || "pending");
  const submittedAt =
    realtimePatch?.submitted_at !== undefined
      ? realtimePatch.submitted_at
      : submission.submitted_at;

  const meta =
    SUBMISSION_STATUS_META[liveStatus] ?? SUBMISSION_STATUS_META.pending;
  const isHighlighted = liveStatus === "shortlisted" || liveStatus === "winner";

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_6px_24px_rgba(27,5,62,0.025)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
              isHighlighted
                ? "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
                : "border-[#dfcdf5] bg-[#f6f0fd] text-[#6828a2]"
            }`}
          >
            {isHighlighted ? (
              <Sparkles size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
          </span>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6d627a]">
              Project status
            </p>
            <h2 className="editorial text-lg font-bold text-[#1b053e] sm:text-xl">
              {submission.project_title}
            </h2>
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-[#524661] sm:px-7">
        <div className="space-y-1">
          <p className="font-medium text-[#1b053e]">{meta.summary}</p>
          <p className="text-[#6d627a]">
            Track:{" "}
            <strong className="font-semibold text-[#1b053e]">
              {problemTitle}
            </strong>
          </p>
        </div>

        {submittedAt && (
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#6d627a]">
            <Clock size={12} className="text-[#6828a2]" />
            <span>Saved {formatIstTimestamp(submittedAt)} IST</span>
          </p>
        )}
      </div>
    </section>
  );
}