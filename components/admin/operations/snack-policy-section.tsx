"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Loader2,
  QrCode,
  Save,
} from "lucide-react";
import { saveSnackPolicy } from "@/app/admin/operations/actions";
import { ADMIN_PRIMARY_BTN } from "@/components/admin/admin-styles";

interface SnackPolicySectionProps {
  snackPolicy: string;
  checkedIn: number;
  totalRegistered: number;
  snacksDistributed?: number;
  onMutated?: () => void;
}

const POLICY_OPTIONS: Array<{
  value: "event" | "daily";
  title: string;
  description: string;
}> = [
  {
    value: "event",
    title: "Once for the entire event",
    description:
      "Each participant pass can claim refreshments a single time across all event days.",
  },
  {
    value: "daily",
    title: "Once per event day",
    description:
      "Eligibility resets each calendar day so multi-day attendees can claim one meal per day.",
  },
];

function parseRedirectOutcome(error: unknown): "saved" | "error" | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    const digest = (error as { digest: string }).digest;
    if (!digest.startsWith("NEXT_REDIRECT")) return null;
    if (digest.includes("error=")) return "error";
    return "saved";
  }
  return null;
}

export function SnackPolicySection({
  snackPolicy,
  checkedIn,
  totalRegistered,
  snacksDistributed,
  onMutated,
}: SnackPolicySectionProps) {
  const normalizedProp = snackPolicy === "daily" ? "daily" : "event";
  const [committedPolicy, setCommittedPolicy] = useState<"event" | "daily">(
    normalizedProp
  );
  const [selectedPolicy, setSelectedPolicy] = useState<"event" | "daily">(
    normalizedProp
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    const next = snackPolicy === "daily" ? "daily" : "event";
    setCommittedPolicy(next);
    setSelectedPolicy(next);
  }, [snackPolicy]);

  const isDirty = selectedPolicy !== committedPolicy;

  const attendancePct =
    totalRegistered > 0
      ? Math.min(100, Math.round((checkedIn / totalRegistered) * 100))
      : 0;

  const snackPct =
    checkedIn > 0 && typeof snacksDistributed === "number"
      ? Math.min(100, Math.round((snacksDistributed / checkedIn) * 100))
      : 0;

  function handleSavePolicy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSaving || !isDirty) return;

    const previousPolicy = committedPolicy;
    const targetPolicy = selectedPolicy;

    setFeedback(null);
    // 0ms optimistic update
    setCommittedPolicy(targetPolicy);

    const formData = new FormData();
    formData.set("snack_policy", targetPolicy);

    const onSuccess = () => {
      setFeedback({
        type: "success",
        text:
          targetPolicy === "daily"
            ? "Updated to once per event day."
            : "Updated to once for the entire event.",
      });
      onMutated?.();
    };

    startSaveTransition(async () => {
      try {
        await saveSnackPolicy(formData);
        onSuccess();
      } catch (err) {
        if (parseRedirectOutcome(err) === "saved") {
          onSuccess();
          return;
        }
        setCommittedPolicy(previousPolicy);
        setFeedback({
          type: "error",
          text: "Could not update snack distribution rule. Please retry.",
        });
      }
    });
  }

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-[#e3dbd0] bg-white p-5 shadow-[0_8px_28px_rgba(27,5,62,0.03)] sm:p-7">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#ebe4dc] pb-4">
          <div>
            <p className="editorial text-[15px] italic text-[#6828a2]">
              Hospitality Quota
            </p>
            <h2 className="editorial mt-0.5 text-2xl font-bold text-[#1b053e]">
              Snack distribution rules
            </h2>
          </div>

          <span className="text-xs font-medium text-[#6d627a]">
            {committedPolicy === "daily"
              ? "Active: Once per day"
              : "Active: Once per event"}
          </span>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-[#5c4f6e]">
          Control how often each participant pass can redeem refreshments.
          Duplicate scans are blocked atomically across concurrent volunteer
          devices.
        </p>

        {/* Interactive Policy Selector Form */}
        <form onSubmit={handleSavePolicy} className="mt-5 space-y-3">
          <div
            role="radiogroup"
            aria-label="Snack eligibility window"
            className="space-y-2.5"
          >
            {POLICY_OPTIONS.map((option) => {
              const isSelected = selectedPolicy === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    isSelected
                      ? "border-[#c7a6f3] bg-[#faf7ff]"
                      : "border-[#e6dfd4] bg-[#fdfcfa] hover:border-[#d6c9e8]"
                  }`}
                >
                  <input
                    type="radio"
                    name="snack_policy"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedPolicy(option.value);
                      setFeedback(null);
                    }}
                    disabled={isSaving}
                    className="mt-0.5 size-4 accent-[#6828a2]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#1b053e]">
                      {option.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#5c4f6e]">
                      {option.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving || !isDirty}
              className={`${ADMIN_PRIMARY_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save distribution rule</span>
                </>
              )}
            </button>

            {feedback && (
              <p
                role={feedback.type === "error" ? "alert" : "status"}
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  feedback.type === "error"
                    ? "text-[#be123c]"
                    : "text-[#1b7a37]"
                }`}
              >
                {feedback.type === "error" ? (
                  <AlertCircle size={13} className="shrink-0" />
                ) : (
                  <Check size={13} className="shrink-0" />
                )}
                <span>{feedback.text}</span>
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Live Gate & Refreshment Turnout + Scanner Launch */}
      <div className="mt-6 space-y-3.5">
        <div className="rounded-xl border border-[#e6dfd4] bg-[#faf7f2] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#1d1a18]">
              Gate turnout
            </p>
            <span className="font-mono text-xs font-bold text-[#6828a2]">
              {attendancePct}%
            </span>
          </div>

          <p className="mt-1 text-xs text-[#5e564f]">
            {checkedIn.toLocaleString("en-IN")} of{" "}
            {totalRegistered.toLocaleString("en-IN")} confirmed participants
            checked in.
          </p>

          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#e6dfd4]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5f2295] to-[#8638cd] transition-all duration-300"
              style={{ width: `${attendancePct}%` }}
            />
          </div>

          {typeof snacksDistributed === "number" && (
            <div className="mt-4 border-t border-[#e6dfd4] pt-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#1d1a18]">
                  Refreshments claimed
                </p>
                <span className="font-mono text-xs font-bold text-[#1b7a37]">
                  {snacksDistributed.toLocaleString("en-IN")} served
                  {checkedIn > 0 ? ` (${snackPct}%)` : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/volunteer/dashboard"
          className="inline-flex w-full items-center justify-between rounded-xl border border-[#dfcdf5] bg-gradient-to-b from-white via-[#faf6ff] to-[#f1e6fd] px-4 py-3 text-xs font-semibold text-[#3d1173] shadow-[0_2px_8px_rgba(95,34,149,0.05)] transition-all hover:border-[#c7a6f3] hover:text-[#1b053e]"
        >
          <span className="inline-flex items-center gap-2">
            <QrCode size={15} className="text-[#6828a2]" />
            <span>Open live volunteer QR scanner</span>
          </span>
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </section>
  );
}