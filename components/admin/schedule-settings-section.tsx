"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  MessageCircle,
  Save,
  X,
} from "lucide-react";
import {
  saveEventDayCount,
  saveWhatsappChannelLink,
} from "@/app/admin/actions";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
  DAY_OPTIONS,
} from "./admin-styles";

interface ScheduleSettingsSectionProps {
  dayCount: number;
  whatsappChannelUrl: string | null;
  /** Highest day_number currently holding an event entry (prevents invalid reduction) */
  maxOccupiedDay?: number;
}

const WHATSAPP_CHANNEL_REGEX =
  /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+\/?(\?.*)?$/i;

export function ScheduleSettingsSection({
  dayCount,
  whatsappChannelUrl,
  maxOccupiedDay = 1,
}: ScheduleSettingsSectionProps) {
  const [draftDays, setDraftDays] = useState<number | null>(null);
  const [draftChannel, setDraftChannel] = useState<string | null>(null);

  const [daysFeedback, setDaysFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [channelFeedback, setChannelFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isSavingDays, startDaysTransition] = useTransition();
  const [isSavingChannel, startChannelTransition] = useTransition();

  const selectedDays = draftDays ?? dayCount;
  const channelInput = draftChannel ?? (whatsappChannelUrl ?? "");

  const effectiveMinDays = Math.max(1, maxOccupiedDay);
  const isDaysDirty = selectedDays !== dayCount;
  const trimmedChannel = channelInput.trim();
  const isChannelDirty = trimmedChannel !== (whatsappChannelUrl ?? "").trim();

  function handleSaveDays(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSavingDays || !isDaysDirty) return;

    if (selectedDays < effectiveMinDays) {
      setDaysFeedback({
        type: "error",
        text: `Day ${effectiveMinDays} has scheduled sessions. Move or delete them first.`,
      });
      return;
    }

    setDaysFeedback(null);
    const formData = new FormData();
    formData.set("day_count", String(selectedDays));

    startDaysTransition(async () => {
      try {
        await saveEventDayCount(formData);
        setDraftDays(null);
        setDaysFeedback({
          type: "success",
          text: `Schedule updated to ${selectedDays} ${selectedDays === 1 ? "day" : "days"}.`,
        });
      } catch {
        setDaysFeedback({
          type: "error",
          text: "Could not update event duration. Please retry.",
        });
      }
    });
  }

  function submitChannelValue(nextUrl: string) {
    if (isSavingChannel) return;

    if (nextUrl.length > 0 && !WHATSAPP_CHANNEL_REGEX.test(nextUrl)) {
      setChannelFeedback({
        type: "error",
        text: "Use a valid link starting with https://whatsapp.com/channel/",
      });
      return;
    }

    setChannelFeedback(null);
    const formData = new FormData();
    formData.set("whatsapp_channel_url", nextUrl);

    startChannelTransition(async () => {
      try {
        await saveWhatsappChannelLink(formData);
        setDraftChannel(null);
        setChannelFeedback({
          type: "success",
          text:
            nextUrl.length > 0
              ? "WhatsApp channel link published."
              : "WhatsApp channel button hidden.",
        });
      } catch {
        setChannelFeedback({
          type: "error",
          text: "Could not save channel link. Check the URL and retry.",
        });
      }
    });
  }

  function handleSaveChannel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitChannelValue(trimmedChannel);
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="flex flex-col justify-between rounded-2xl border border-[#e5dce0] bg-white p-5 shadow-[0_8px_28px_rgba(27,5,62,0.03)] sm:p-7">
        <div>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#eadff5] bg-[#faf7ff] text-[#6828a2]">
                <CalendarDays size={19} />
              </span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6828a2]">
                  Event Configuration
                </p>
                <h2 className="editorial mt-0.5 text-2xl font-bold text-[#1b053e]">
                  Schedule duration
                </h2>
              </div>
            </div>

            <span className="font-mono text-xs font-semibold text-[#5e536b]">
              {dayCount} {dayCount === 1 ? "DAY" : "DAYS"}
            </span>
          </div>

          <p className="text-[13px] leading-relaxed text-[#5c4f6e]">
            Set how many days the event runs. Days with existing sessions are
            locked until those sessions are moved.
          </p>
        </div>

        <div className="mt-5">
          <form
            onSubmit={handleSaveDays}
            className="flex flex-col gap-3 rounded-xl border border-[#efe7f7] bg-[#faf7ff] p-4 sm:flex-row sm:items-end"
          >
            <label className={ADMIN_LABEL_CLASS + " min-w-0 flex-1"}>
              Number of event days
              <select
                name="day_count"
                value={String(selectedDays)}
                onChange={(e) => {
                  setDraftDays(Number(e.target.value));
                  setDaysFeedback(null);
                }}
                disabled={isSavingDays}
                className={ADMIN_FIELD_CLASS + " h-[46px]"}
              >
                {DAY_OPTIONS.map((day) => {
                  const locked = day < effectiveMinDays;
                  return (
                    <option key={day} value={day} disabled={locked}>
                      {day} {day === 1 ? "day" : "days"}
                      {locked ? " (sessions active)" : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <button
              type="submit"
              disabled={isSavingDays || !isDaysDirty}
              className={`${ADMIN_PRIMARY_BTN} h-[46px] shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isSavingDays ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save days</span>
                </>
              )}
            </button>
          </form>

          {daysFeedback && (
            <p
              role={daysFeedback.type === "error" ? "alert" : "status"}
              className={`mt-2.5 flex items-center gap-1.5 text-xs font-semibold ${
                daysFeedback.type === "error"
                  ? "text-[#be123c]"
                  : "text-[#1b7a37]"
              }`}
            >
              {daysFeedback.type === "error" ? (
                <AlertCircle size={13} className="shrink-0" />
              ) : (
                <Check size={13} className="shrink-0" />
              )}
              <span>{daysFeedback.text}</span>
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col justify-between rounded-2xl border border-[#e5dce0] bg-white p-5 shadow-[0_8px_28px_rgba(27,5,62,0.03)] sm:p-7">
        <div>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#bfe6c9] bg-[#eefaf1] text-[#168a45]">
                <MessageCircle size={19} />
              </span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#168a45]">
                  Announcements
                </p>
                <h2 className="editorial mt-0.5 text-2xl font-bold text-[#1b053e]">
                  WhatsApp Channel
                </h2>
              </div>
            </div>

            {whatsappChannelUrl ? (
              <a
                href={whatsappChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#168a45] underline decoration-[#bfe6c9] underline-offset-2 hover:text-[#116b35]"
              >
                <span>Test link</span>
                <ExternalLink size={12} />
              </a>
            ) : (
              <span className="font-mono text-xs text-[#7a6d8c]">HIDDEN</span>
            )}
          </div>

          <p className="text-[13px] leading-relaxed text-[#5c4f6e]">
            Save an official channel link to show the Join button on
            participant dashboards. Clear the field to hide it.
          </p>
        </div>

        <div className="mt-5">
          <form
            onSubmit={handleSaveChannel}
            className="flex flex-col gap-3 rounded-xl border border-[#efe7f7] bg-[#faf7ff] p-4 sm:flex-row sm:items-end"
          >
            <label className={ADMIN_LABEL_CLASS + " min-w-0 flex-1"}>
              WhatsApp Channel URL
              <div className="relative">
                <input
                  name="whatsapp_channel_url"
                  type="url"
                  value={channelInput}
                  onChange={(e) => {
                    setDraftChannel(e.target.value);
                    setChannelFeedback(null);
                  }}
                  disabled={isSavingChannel}
                  className={
                    ADMIN_FIELD_CLASS +
                    ` h-[46px] ${channelInput.length > 0 ? "pr-9" : ""}`
                  }
                  placeholder="https://whatsapp.com/channel/..."
                />
                {channelInput.length > 0 && !isSavingChannel && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftChannel("");
                      if (whatsappChannelUrl) {
                        submitChannelValue("");
                      } else {
                        setChannelFeedback(null);
                      }
                    }}
                    aria-label="Clear channel link"
                    title="Clear channel link"
                    className="absolute right-2.5 top-[calc(50%+4px)] -translate-y-1/2 rounded-md p-1 text-[#7a6d8c] transition-colors hover:bg-[#efe7f7] hover:text-[#1b053e]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </label>

            <button
              type="submit"
              disabled={isSavingChannel || !isChannelDirty}
              className="inline-flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#168a45] px-5 text-xs font-bold tracking-wide text-white shadow-[0_4px_14px_rgba(22,138,69,0.2)] transition-all duration-150 hover:bg-[#13753b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingChannel ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save link</span>
                </>
              )}
            </button>
          </form>

          {channelFeedback && (
            <p
              role={channelFeedback.type === "error" ? "alert" : "status"}
              className={`mt-2.5 flex items-center gap-1.5 text-xs font-semibold ${
                channelFeedback.type === "error"
                  ? "text-[#be123c]"
                  : "text-[#1b7a37]"
              }`}
            >
              {channelFeedback.type === "error" ? (
                <AlertCircle size={13} className="shrink-0" />
              ) : (
                <Check size={13} className="shrink-0" />
              )}
              <span>{channelFeedback.text}</span>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}