"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, Unlock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
} from "@/components/admin/admin-styles";

interface SubmissionWindowCardProps {
  effectiveOpen: boolean;
  closeValue: string;
}

function toIstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(parsed.getTime() + 330 * 60000).toISOString().slice(0, 16);
}

function toUtcIsoFromIst(istInput: string): string | null {
  const trimmed = istInput.trim();
  if (!trimmed) return null;
  const normalized =
    trimmed.length === 16 ? `${trimmed}:00+05:30` : `${trimmed}+05:30`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function computeIsLive(rawOpen: boolean, closeInput: string): boolean {
  if (!rawOpen) return false;
  const iso = toUtcIsoFromIst(closeInput);
  if (!iso) return true;
  return new Date(iso).getTime() > Date.now();
}

export function SubmissionWindowCard({
  effectiveOpen,
  closeValue,
}: SubmissionWindowCardProps) {
  const [isOpenFlag, setIsOpenFlag] = useState<boolean>(effectiveOpen);
  const [closesAtInput, setClosesAtInput] = useState<string>(closeValue);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const isDirtyRef = useRef(false);

  // Sync from fresh SSR props when not mid-edit
  useEffect(() => {
    if (!isDirtyRef.current) {
      setIsOpenFlag(effectiveOpen);
      setClosesAtInput(closeValue);
    }
  }, [effectiveOpen, closeValue]);

  const refreshFromDb = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_submission_settings")
      .select("is_open,closes_at")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data && !isDirtyRef.current) {
      const nextClose = toIstInput(data.closes_at);
      setClosesAtInput(nextClose);
      setIsOpenFlag(Boolean(data.is_open));
      setNowTick(Date.now());
    }
  }, []);

  // Realtime DB listener + 15s background & deadline-expiry check
  useEffect(() => {
    void refreshFromDb();

    const supabase = createClient();
    const channel = supabase
      .channel("submission-window-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_submission_settings",
        },
        () => void refreshFromDb()
      )
      .subscribe();

    const timer = window.setInterval(() => {
      setNowTick(Date.now());
      if (document.visibilityState === "visible") {
        void refreshFromDb();
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(timer);
    };
  }, [refreshFromDb]);

  const currentlyLive = useMemo(() => {
    void nowTick;
    return computeIsLive(isOpenFlag, closesAtInput);
  }, [isOpenFlag, closesAtInput, nowTick]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const closesAtIso = toUtcIsoFromIst(closesAtInput);
    if (closesAtInput.trim() && !closesAtIso) {
      setFeedback({
        type: "err",
        text: "Invalid closing time. Pick a valid IST date and time.",
      });
      return;
    }

    // Warn immediately if admin checked "Open" with a deadline already in the past
    if (isOpenFlag && closesAtIso && new Date(closesAtIso).getTime() <= Date.now()) {
      setFeedback({
        type: "err",
        text: "That closing time has already passed. Clear it or pick a future IST time.",
      });
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("project_submission_settings")
        .upsert(
          {
            id: 1,
            is_open: isOpenFlag,
            closes_at: closesAtIso,
          },
          { onConflict: "id" }
        );

      if (error) {
        setFeedback({
          type: "err",
          text: error.message || "Could not save window settings.",
        });
        return;
      }

      isDirtyRef.current = false;
      setNowTick(Date.now());
      setFeedback({
        type: "ok",
        text: isOpenFlag
          ? "Entries are now open to participants."
          : "Entries are now closed.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_6px_24px_rgba(27,5,62,0.025)]">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe4dc] bg-[#fdfcfa] px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-colors ${
              currentlyLive
                ? "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
                : "border-[#e3dbd0] bg-[#faf7f2] text-[#5e536b]"
            }`}
          >
            {currentlyLive ? <Unlock size={18} /> : <Lock size={18} />}
          </span>

          <div>
            <h2 className="editorial text-lg font-bold text-[#1b053e] sm:text-xl">
              {currentlyLive ? "Accepting entries" : "Entries closed"}
            </h2>
            <p className="text-xs text-[#6d627a]">
              {currentlyLive
                ? closesAtInput
                  ? `Closes automatically on ${closesAtInput.replace("T", " at ")} IST`
                  : "Open until you close it manually"
                : "Participants cannot upload or edit projects right now"}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
            currentlyLive
              ? "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
              : "border-[#e3dbd0] bg-[#faf7f2] text-[#6d627a]"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              currentlyLive ? "bg-[#1b7a37]" : "bg-[#8d7ba3]"
            }`}
          />
          {currentlyLive ? "Open" : "Locked"}
        </span>
      </div>

      {/* Controls */}
      <div className="p-4 sm:p-6">
        <form
          onSubmit={handleSave}
          className="grid gap-3.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[#e3dbd0] bg-[#faf7f2] px-3.5 py-2.5 text-xs font-semibold text-[#1b053e] transition-colors hover:border-[#c7a6f3] sm:text-sm">
            <input
              type="checkbox"
              checked={isOpenFlag}
              onChange={(e) => {
                isDirtyRef.current = true;
                setIsOpenFlag(e.target.checked);
                setFeedback(null);
              }}
              className="size-4 accent-[#6828a2]"
            />
            <span>Allow project uploads</span>
          </label>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="closes_at" className={ADMIN_LABEL_CLASS}>
                Auto-close time (IST, optional)
              </label>
              {closesAtInput && (
                <button
                  type="button"
                  onClick={() => {
                    isDirtyRef.current = true;
                    setClosesAtInput("");
                    setFeedback(null);
                  }}
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6828a2] hover:underline"
                >
                  <X size={11} />
                  Clear
                </button>
              )}
            </div>
            <input
              id="closes_at"
              type="datetime-local"
              value={closesAtInput}
              onChange={(e) => {
                isDirtyRef.current = true;
                setClosesAtInput(e.target.value);
                setFeedback(null);
              }}
              className={ADMIN_FIELD_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`${ADMIN_PRIMARY_BTN} w-full justify-center disabled:opacity-60 sm:w-auto`}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        {feedback && (
          <p
            role={feedback.type === "err" ? "alert" : "status"}
            className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${
              feedback.type === "err" ? "text-[#be123c]" : "text-[#1b7a37]"
            }`}
          >
            {feedback.type === "ok" && <Check size={14} />}
            <span>{feedback.text}</span>
          </p>
        )}
      </div>
    </section>
  );
}