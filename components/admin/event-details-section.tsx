"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { deleteEventDetail, saveEventDetail } from "@/app/admin/actions";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECONDARY_BTN,
  DAY_OPTIONS,
} from "./admin-styles";

export interface AdminEventRow {
  id: string;
  day_number: number;
  title: string;
  venue: string | null;
  timing: string | null;
  pre_instructions: string | null;
  is_published: boolean;
}

interface EventDetailsSectionProps {
  dayCount: number;
  events: AdminEventRow[];
}

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function EventDetailsSection({
  dayCount,
  events,
}: EventDetailsSectionProps) {
  const router = useRouter();
  const [composerDay, setComposerDay] = useState<string>("1");
  const [composerTitle, setComposerTitle] = useState<string>("");
  const [composerVenue, setComposerVenue] = useState<string>("");
  const [composerTiming, setComposerTiming] = useState<string>("");
  const [composerNotes, setComposerNotes] = useState<string>("");
  const [composerPublished, setComposerPublished] = useState<boolean>(true);
  const [composerFeedback, setComposerFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isAdding, startAddTransition] = useTransition();

  useEffect(() => {
    if (Number(composerDay) > dayCount) {
      setComposerDay(String(Math.max(1, dayCount)));
    }
  }, [dayCount, composerDay]);

  const publishedCount = events.filter((e) => e.is_published).length;
  const draftCount = events.length - publishedCount;

  const groupedByDay = Array.from(
    events.reduce((acc, item) => {
      const day = item.day_number || 1;
      const list = acc.get(day) ?? [];
      list.push(item);
      acc.set(day, list);
      return acc;
    }, new Map<number, AdminEventRow[]>())
  ).sort((a, b) => a[0] - b[0]);

  function toggleCard(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleAddSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isAdding) return;

    const cleanTitle = composerTitle.trim();
    if (!cleanTitle) {
      setComposerFeedback({
        type: "error",
        text: "Enter a session title before adding.",
      });
      return;
    }

    setComposerFeedback(null);
    const formData = new FormData();
    formData.set("day_number", composerDay);
    formData.set("title", cleanTitle);
    formData.set("venue", composerVenue.trim());
    formData.set("timing", composerTiming.trim());
    formData.set("pre_instructions", composerNotes.trim());
    if (composerPublished) {
      formData.set("is_published", "on");
    }

    startAddTransition(async () => {
      try {
        await saveEventDetail(formData);
        setComposerTitle("");
        setComposerVenue("");
        setComposerTiming("");
        setComposerNotes("");
        setComposerFeedback({
          type: "success",
          text: `"${cleanTitle}" added to Day ${composerDay}.`,
        });
        router.refresh();
      } catch (err) {
        if (isNextRedirectError(err)) {
          setComposerTitle("");
          setComposerVenue("");
          setComposerTiming("");
          setComposerNotes("");
          setComposerFeedback({
            type: "success",
            text: `"${cleanTitle}" added to Day ${composerDay}.`,
          });
          router.refresh();
          return;
        }
        setComposerFeedback({
          type: "error",
          text: "Could not add session. Check the fields and retry.",
        });
      }
    });
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_10px_32px_rgba(27,5,62,0.03)]">
      {/* Top Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-6 sm:px-8 sm:py-7">
        <div>
          <p className="editorial text-[15px] italic text-[#6828a2]">
            Run of Show · Program Lineup
          </p>
          <h2 className="editorial mt-1 text-2xl font-bold tracking-[-0.02em] text-[#1b053e] sm:text-[2rem]">
            Schedule &amp; sessions
          </h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-[#5c4f6e]">
            Manage timings, hall allocations, and attendee notes across each
            configured event day.
          </p>
        </div>

        <p className="font-mono text-xs font-semibold text-[#5e536b]">
          {publishedCount} LIVE
          {draftCount > 0 ? ` · ${draftCount} DRAFT` : ""}
        </p>
      </div>

      <div className="p-5 sm:p-8">
        {/* New Session Composer */}
        <div className="rounded-xl border border-[#e6ddf2] bg-[#faf7ff] p-4 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between border-b border-[#ebe1f7] pb-3">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6828a2]">
                New Entry
              </p>
              <h3 className="editorial mt-0.5 text-lg font-bold text-[#1b053e]">
                Add a session to the lineup
              </h3>
            </div>
            <span className="hidden text-xs font-medium text-[#7a6d8c] sm:inline">
              {dayCount} {dayCount === 1 ? "day" : "days"} configured
            </span>
          </div>

          <form onSubmit={handleAddSession} className="space-y-4">
            <div className="grid min-w-0 gap-3.5 sm:grid-cols-12 sm:gap-4">
              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-3"}>
                Event Day
                <select
                  name="day_number"
                  required
                  value={composerDay}
                  onChange={(e) => setComposerDay(e.target.value)}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                >
                  {DAY_OPTIONS.slice(0, Math.max(1, dayCount)).map((day) => (
                    <option key={day} value={day}>
                      Day {day}
                    </option>
                  ))}
                </select>
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-9"}>
                Session Title *
                <input
                  required
                  name="title"
                  value={composerTitle}
                  onChange={(e) => {
                    setComposerTitle(e.target.value);
                    setComposerFeedback(null);
                  }}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                  placeholder="Opening Keynote & Gate Check-in"
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-6"}>
                Hall / Venue
                <input
                  name="venue"
                  value={composerVenue}
                  onChange={(e) => setComposerVenue(e.target.value)}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                  placeholder="Main Auditorium, Block A"
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-6"}>
                Time Slot
                <input
                  name="timing"
                  value={composerTiming}
                  onChange={(e) => setComposerTiming(e.target.value)}
                  disabled={isAdding}
                  className={ADMIN_FIELD_CLASS}
                  placeholder="09:00 AM – 10:15 AM"
                />
              </label>
            </div>

            <label className={ADMIN_LABEL_CLASS + " min-w-0"}>
              Attendee Notes
              <textarea
                name="pre_instructions"
                rows={2}
                value={composerNotes}
                onChange={(e) => setComposerNotes(e.target.value)}
                disabled={isAdding}
                className={ADMIN_FIELD_CLASS}
                placeholder="Carry college ID and arrive 15 minutes early for badge scan."
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ebe1f7] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[#3d2b54]">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={composerPublished}
                  onChange={(e) => setComposerPublished(e.target.checked)}
                  disabled={isAdding}
                  className="size-4 rounded accent-[#5f2295]"
                />
                <span>Publish immediately to participant dashboards</span>
              </label>

              <button
                type="submit"
                disabled={isAdding}
                className={`${ADMIN_PRIMARY_BTN} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isAdding ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Adding…</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Add to Schedule</span>
                  </>
                )}
              </button>
            </div>

            {composerFeedback && (
              <p
                role={composerFeedback.type === "error" ? "alert" : "status"}
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  composerFeedback.type === "error"
                    ? "text-[#be123c]"
                    : "text-[#1b7a37]"
                }`}
              >
                {composerFeedback.type === "error" ? (
                  <AlertCircle size={13} className="shrink-0" />
                ) : (
                  <Check size={13} className="shrink-0" />
                )}
                <span>{composerFeedback.text}</span>
              </p>
            )}
          </form>
        </div>

        {/* Grouped Day Lineups */}
        {groupedByDay.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-[#dcd0ec] bg-[#fcfaff] p-8 text-center">
            <p className="editorial text-lg font-bold text-[#1b053e]">
              No sessions scheduled yet
            </p>
            <p className="mt-1 text-xs text-[#76678a]">
              Add your first session above to build the participant schedule.
            </p>
          </div>
        ) : (
          <div className="mt-9 space-y-9">
            {groupedByDay.map(([day, dayEvents]) => (
              <div key={day}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-xs font-bold tracking-[0.14em] text-[#6828a2]">
                    DAY {String(day).padStart(2, "0")}
                  </span>
                  <div className="h-px flex-1 bg-[#e8e0d8]" />
                  <span className="text-xs font-medium text-[#7a6d8c]">
                    {dayEvents.length}{" "}
                    {dayEvents.length === 1 ? "session" : "sessions"}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {dayEvents.map((event, idx) => (
                    <SessionRowCard
                      key={`${event.id}-${event.day_number}-${event.title}-${event.venue ?? ""}-${event.timing ?? ""}-${event.pre_instructions ?? ""}-${event.is_published}`}
                      event={event}
                      index={idx}
                      dayCount={dayCount}
                      isExpanded={Boolean(expandedIds[event.id])}
                      onToggle={() => toggleCard(event.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface SessionRowCardProps {
  event: AdminEventRow;
  index: number;
  dayCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function SessionRowCard({
  event,
  index,
  dayCount,
  isExpanded,
  onToggle,
}: SessionRowCardProps) {
  const router = useRouter();
  const [dayNumber, setDayNumber] = useState<string>(String(event.day_number));
  const [title, setTitle] = useState<string>(event.title);
  const [venue, setVenue] = useState<string>(event.venue ?? "");
  const [timing, setTiming] = useState<string>(event.timing ?? "");
  const [notes, setNotes] = useState<string>(event.pre_instructions ?? "");
  const [isPublished, setIsPublished] = useState<boolean>(event.is_published);

  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const effectiveMaxDay = Math.max(dayCount, event.day_number, 1);

  const isDirty =
    Number(dayNumber) !== event.day_number ||
    title.trim() !== event.title ||
    venue.trim() !== (event.venue ?? "") ||
    timing.trim() !== (event.timing ?? "") ||
    notes.trim() !== (event.pre_instructions ?? "") ||
    isPublished !== event.is_published;

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSaving || !isDirty) return;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFeedback({ type: "error", text: "Session title is required." });
      return;
    }

    setFeedback(null);
    const formData = new FormData();
    formData.set("id", event.id);
    formData.set("day_number", dayNumber);
    formData.set("title", cleanTitle);
    formData.set("venue", venue.trim());
    formData.set("timing", timing.trim());
    formData.set("pre_instructions", notes.trim());
    if (isPublished) {
      formData.set("is_published", "on");
    }

    startSaveTransition(async () => {
      try {
        await saveEventDetail(formData);
        setFeedback({ type: "success", text: "Session updated." });
        router.refresh();
      } catch (err) {
        if (isNextRedirectError(err)) {
          setFeedback({ type: "success", text: "Session updated." });
          router.refresh();
          return;
        }
        setFeedback({
          type: "error",
          text: "Could not save changes. Please retry.",
        });
      }
    });
  }

  function handleDelete() {
    if (isDeleting) return;
    setFeedback(null);

    const formData = new FormData();
    formData.set("id", event.id);

    startDeleteTransition(async () => {
      try {
        await deleteEventDetail(formData);
        router.refresh();
      } catch (err) {
        if (isNextRedirectError(err)) {
          router.refresh();
          return;
        }
        setConfirmingDelete(false);
        setFeedback({
          type: "error",
          text: "Could not remove this session. Please retry.",
        });
      }
    });
  }

  return (
    <article
      className={`min-w-0 rounded-xl border bg-white transition-colors ${
        isExpanded
          ? "border-[#cdb0ef] shadow-[0_8px_24px_rgba(27,5,62,0.04)]"
          : "border-[#e6ddf2] hover:border-[#cdb0ef]"
      }`}
    >
      {/* Compact Clickable Summary Header */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-3 p-4 select-none sm:px-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 font-mono text-xs font-bold text-[#6828a2]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="editorial truncate text-lg font-bold leading-snug text-[#1b053e]">
              {event.title}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6e6080]">
              {event.timing && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Clock size={12} className="text-[#6828a2]" />
                  <span>{event.timing}</span>
                </span>
              )}
              {event.venue && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <MapPin size={12} className="text-[#6828a2]" />
                  <span>{event.venue}</span>
                </span>
              )}
              {!event.timing && !event.venue && (
                <span className="text-[#8d7ba3]">No venue or timing set</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span
            className={`font-mono text-[11px] font-bold tracking-wider ${
              event.is_published ? "text-[#1b7a37]" : "text-[#7a6d8c]"
            }`}
          >
            {event.is_published ? "LIVE" : "DRAFT"}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5f2295]">
            <span className="hidden sm:inline">
              {isExpanded ? "Close" : "Edit"}
            </span>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </div>

      {/* Expandable Inline Editor */}
      {isExpanded && (
        <div className="border-t border-[#f0e8f8] bg-[#fdfcff] p-4 sm:p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid min-w-0 gap-3.5 sm:grid-cols-12 sm:gap-4">
              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-3"}>
                Event Day
                <select
                  name="day_number"
                  value={dayNumber}
                  onChange={(e) => {
                    setDayNumber(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                >
                  {DAY_OPTIONS.slice(0, effectiveMaxDay).map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-9"}>
                Session Title *
                <input
                  required
                  name="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-6"}>
                Hall / Venue
                <input
                  name="venue"
                  value={venue}
                  onChange={(e) => {
                    setVenue(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " min-w-0 sm:col-span-6"}>
                Time Slot
                <input
                  name="timing"
                  value={timing}
                  onChange={(e) => {
                    setTiming(e.target.value);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className={ADMIN_FIELD_CLASS}
                />
              </label>
            </div>

            <label className={ADMIN_LABEL_CLASS + " min-w-0"}>
              Attendee Notes
              <textarea
                name="pre_instructions"
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setFeedback(null);
                }}
                disabled={isSaving || isDeleting}
                className={ADMIN_FIELD_CLASS}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe1f7] pt-4">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[#3d2b54]">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={isPublished}
                  onChange={(e) => {
                    setIsPublished(e.target.checked);
                    setFeedback(null);
                  }}
                  disabled={isSaving || isDeleting}
                  className="size-4 rounded accent-[#5f2295]"
                />
                <span>Visible on participant dashboards</span>
              </label>

              <div className="flex flex-wrap items-center gap-2.5">
                {!confirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={isSaving || isDeleting}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5c2c7] bg-[#fff8f8] px-3.5 py-2.5 text-xs font-semibold text-[#be123c] transition-colors hover:bg-[#fff1f2] disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#be123c] px-3.5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9f1239] disabled:opacity-60"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Removing…</span>
                        </>
                      ) : (
                        <span>Confirm delete</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="rounded-xl border border-[#e3dbd0] bg-white px-3 py-2.5 text-xs font-semibold text-[#5e564f] hover:bg-[#faf7f2]"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSaving || isDeleting || !isDirty}
                  className={`${ADMIN_SECONDARY_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-[#5f2295]" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} className="text-[#5f2295]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

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
          </form>
        </div>
      )}
    </article>
  );
}