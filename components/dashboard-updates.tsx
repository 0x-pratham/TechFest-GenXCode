"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Layers,
  Loader2,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { invalidateProblemStatementsCache } from "@/app/dashboard/actions";

export interface EventDetailItem {
  id: string;
  day_number: number;
  title: string;
  venue: string | null;
  timing: string | null;
  pre_instructions: string | null;
}

export interface ProblemStatementItem {
  id: string;
  title: string;
  summary: string | null;
  domain: string | null;
  difficulty: string | null;
  max_slots: number | null;
  filled_slots: number;
}

interface DashboardUpdatesProps {
  events: EventDetailItem[];
  problems: ProblemStatementItem[];
  selectedProblemStatementId: string | null;
}

const EVENT_DAY_DATES: Record<number, string> = {
  1: "2026-12-05",
  2: "2026-12-06",
  3: "2026-12-07",
};

function getDefaultEventDay(availableDays: number[]): number {
  const fallback = availableDays[0] ?? 1;
  if (availableDays.length <= 1) return fallback;

  const todayIso = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const matched = availableDays.find(
    (day) => EVENT_DAY_DATES[day] === todayIso
  );
  return matched ?? fallback;
}

function ProblemSummary({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const needsToggle = text.length > 150 || text.includes("\n");

  return (
    <>
      <p
        className={`mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-[#4f4261] ${
          open ? "" : "line-clamp-3"
        }`}
      >
        {text}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-[#5f2295] hover:text-[#220749]"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}

export function DashboardUpdates({
  events,
  problems,
  selectedProblemStatementId,
}: DashboardUpdatesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const groupedByDay = useMemo(() => {
    const map = new Map<number, EventDetailItem[]>();
    for (const item of events ?? []) {
      const day = Number(item.day_number) || 1;
      const existing = map.get(day) ?? [];
      existing.push(item);
      map.set(day, existing);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [events]);

  const availableDays = useMemo(
    () => groupedByDay.map(([day]) => day),
    [groupedByDay]
  );

  const [activeDay, setActiveDay] = useState<number>(() =>
    getDefaultEventDay(availableDays)
  );
  const [optimisticSelectedId, setOptimisticSelectedId] = useState<
    string | null
  >(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync optimistic state once server prop updates
  useEffect(() => {
    setOptimisticSelectedId(null);
  }, [selectedProblemStatementId]);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const selectedId = optimisticSelectedId ?? selectedProblemStatementId;
  const isBusyGlobal = Boolean(selectingId) || isPending;

  const resolvedActiveDay = availableDays.includes(activeDay)
    ? activeDay
    : availableDays[0] ?? 1;

  const activeDayEvents = useMemo(() => {
    const found = groupedByDay.find(([day]) => day === resolvedActiveDay);
    return found ? found[1] : [];
  }, [groupedByDay, resolvedActiveDay]);

  const domains = useMemo(() => {
    const set = new Set<string>();
    for (const p of problems) {
      if (p.domain?.trim()) set.add(p.domain.trim());
    }
    return Array.from(set);
  }, [problems]);

  const selectedProblem = useMemo(
    () => problems.find((p) => p.id === selectedId) ?? null,
    [problems, selectedId]
  );

  const visibleProblems = useMemo(() => {
    const filtered =
      problems.length > 6 && activeDomain !== "ALL"
        ? problems.filter((p) => (p.domain?.trim() ?? "") === activeDomain)
        : problems;

    return [...filtered].sort((a, b) => {
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;
      return 0;
    });
  }, [problems, activeDomain, selectedId]);

  function showToast(next: { type: "success" | "error"; message: string }) {
    setFeedback(next);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 4500);
  }

  function handleTrackButtonClick(problemId: string) {
    if (isBusyGlobal || problemId === selectedId) return;

    if (confirmingId !== problemId) {
      setConfirmingId(problemId);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmingId((prev) => (prev === problemId ? null : prev));
      }, 3200);
      return;
    }

    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmingId(null);
    void commitSelectProblem(problemId);
  }

  async function commitSelectProblem(problemId: string) {
    setSelectingId(problemId);
    setFeedback(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(
        "select_registration_problem_statement",
        { p_problem_statement_id: problemId }
      );

      if (error) {
        showToast({
          type: "error",
          message:
            error.message || "Could not lock this track right now. Try again.",
        });
        return;
      }

      setOptimisticSelectedId(problemId);
      showToast({
        type: "success",
        message: "Problem statement updated on your builder pass.",
      });
      await invalidateProblemStatementsCache();
      startTransition(() => {
        router.refresh();
      });
    } catch {
      showToast({
        type: "error",
        message: "Network issue while updating your selection. Please retry.",
      });
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6 sm:space-y-10">
        {/* Schedule & Sessions */}
        <section className="overflow-hidden rounded-2xl border border-[#eadff5] bg-white shadow-[0_12px_36px_rgba(34,4,75,0.04)] sm:rounded-[1.5rem]">
          <div className="flex flex-col gap-4 border-b border-[#f0e8f8] bg-gradient-to-r from-white via-[#fdfbff] to-[#f8f3ff] p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:p-8">
            <div>
              <p className="editorial text-base italic text-[#5f2295]">
                Run of show
              </p>
              <h2 className="editorial mt-1 text-2xl font-bold tracking-tight text-[#220749] sm:text-3xl">
                Event schedule &amp; sessions
              </h2>
              <p className="mt-1.5 text-sm text-[#5e5070]">
                Timings, venues, and prep notes for workshops, hacking blocks,
                and refreshments.
              </p>
            </div>

            {availableDays.length > 1 ? (
              <div
                role="tablist"
                aria-label="Event schedule days"
                className="flex w-full items-center gap-1 rounded-xl border border-[#e5d6f5] bg-[#faf7ff] p-1 sm:inline-flex sm:w-auto"
              >
                {availableDays.map((day) => {
                  const isSelected = day === resolvedActiveDay;
                  return (
                    <button
                      key={day}
                      id={`schedule-tab-${day}`}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={`schedule-panel-${day}`}
                      onClick={() => setActiveDay(day)}
                      className={`relative min-h-11 flex-1 rounded-lg px-4 text-xs font-semibold transition-colors duration-150 sm:flex-initial ${
                        isSelected
                          ? "text-white"
                          : "text-[#5f2295] hover:text-[#220749]"
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="schedule-day-pill"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                          className="absolute inset-0 rounded-lg bg-[#5f2295] shadow-xs"
                        />
                      )}
                      <span className="relative z-10">Day {day}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#e5d6f5] bg-[#faf7ff] px-3.5 py-1.5 text-xs font-semibold text-[#5f2295]">
                <CalendarDays size={13} />
                <span>Day {resolvedActiveDay} Lineup</span>
              </span>
            )}
          </div>

          <div
            id={`schedule-panel-${resolvedActiveDay}`}
            role="tabpanel"
            aria-labelledby={
              availableDays.length > 1
                ? `schedule-tab-${resolvedActiveDay}`
                : undefined
            }
            className="p-4 sm:p-8"
          >
            {activeDayEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dfd2ef] bg-[#fcfaff] p-6 text-center sm:p-8">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadff5] bg-white text-[#5f2295]">
                  <Clock size={20} />
                </div>
                <h3 className="editorial mt-4 text-xl font-bold text-[#220749]">
                  Detailed schedule drops shortly
                </h3>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[#5e5070]">
                  We’re finalizing exact room allocations and workshop slots.
                  Updates appear here live as soon as each session is published.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.ol
                  key={resolvedActiveDay}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="relative space-y-4 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-gradient-to-b before:from-[#8638cd] before:via-[#d9c4f2] before:to-transparent sm:space-y-5 sm:before:left-[19px]"
                >
                  {activeDayEvents.map((session, index) => {
                    const hasTiming = Boolean(session.timing?.trim());
                    const hasVenue = Boolean(session.venue?.trim());
                    const hasInstructions = Boolean(
                      session.pre_instructions?.trim()
                    );

                    return (
                      <li key={session.id} className="relative pl-10 sm:pl-12">
                        <span
                          aria-hidden="true"
                          className={`absolute left-0 top-4 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold shadow-2xs sm:top-5 sm:h-10 sm:w-10 ${
                            index === 0
                              ? "border-[#5f2295] bg-[#5f2295] text-white"
                              : "border-[#dfd0f0] bg-white text-[#5f2295]"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="rounded-2xl border border-[#e7dcf3] bg-white p-4 shadow-[0_4px_16px_rgba(34,4,75,0.03)] transition-all duration-150 hover:border-[#c7a6f3] hover:shadow-[0_8px_24px_rgba(34,4,75,0.06)] sm:p-5">
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                            <h3 className="editorial break-words text-lg font-bold leading-snug text-[#220749] sm:text-xl">
                              {session.title}
                            </h3>

                            {(hasTiming || hasVenue) && (
                              <div className="flex flex-wrap items-center gap-2 text-xs sm:shrink-0">
                                {hasTiming && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfd0f0] bg-[#faf7ff] px-2.5 py-1 font-semibold text-[#4a1878]">
                                    <Clock
                                      size={12}
                                      className="shrink-0 text-[#5f2295]"
                                    />
                                    <span>{session.timing}</span>
                                  </span>
                                )}

                                {hasVenue && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2d9cb] bg-[#faf7f2] px-2.5 py-1 font-semibold text-[#3d3630]">
                                    <MapPin
                                      size={12}
                                      className="shrink-0 text-[#8638cd]"
                                    />
                                    <span>{session.venue}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {hasInstructions && (
                            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#e6dfd4] bg-[#faf7f2] px-3.5 py-2.5 text-sm leading-relaxed text-[#3d3630]">
                              <FileText
                                size={15}
                                className="mt-0.5 shrink-0 text-[#5f2295]"
                              />
                              <p className="min-w-0 flex-1 whitespace-pre-line break-words">
                                {session.pre_instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </motion.ol>
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Build Tracks / Problem Statements */}
        <section className="rounded-2xl border border-[#eadff5] bg-white p-4 shadow-[0_12px_36px_rgba(34,4,75,0.04)] sm:rounded-[1.5rem] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#f0e8f8] pb-4 sm:pb-5">
            <div>
              <p className="editorial text-base italic text-[#5f2295]">
                Build tracks
              </p>
              <h2 className="editorial mt-1 text-2xl font-bold tracking-tight text-[#220749] sm:text-3xl">
                Choose your problem statement
              </h2>
              <p className="mt-1.5 text-sm text-[#5e5070]">
                Select the challenge you want to build for. Tap twice to confirm
                before switching tracks.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f2295]">
              <Compass size={14} />
              <span>
                {problems.length > 0
                  ? `${problems.length} active tracks`
                  : "Tracks releasing soon"}
              </span>
            </span>
          </div>

          {/* Compact Selected Track Summary */}
          {selectedProblem && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#bfe6c9] bg-[#eefaf1] px-4 py-3 text-xs sm:text-sm">
              <div className="flex min-w-0 items-center gap-2 text-[#1b7a37]">
                <CheckCircle2 size={16} className="shrink-0" />
                <span className="truncate font-semibold">
                  Your track: {selectedProblem.title}
                </span>
              </div>
              {selectedProblem.domain && (
                <span className="shrink-0 rounded-md bg-white/80 px-2 py-0.5 text-xs font-semibold text-[#1b7a37]">
                  {selectedProblem.domain}
                </span>
              )}
            </div>
          )}

          {/* Horizontal Domain Filter Chips when > 6 tracks */}
          {problems.length > 6 && domains.length > 1 && (
            <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              <button
                type="button"
                onClick={() => setActiveDomain("ALL")}
                className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                  activeDomain === "ALL"
                    ? "border-[#5f2295] bg-[#5f2295] text-white"
                    : "border-[#e5d6f5] bg-[#faf7ff] text-[#5f2295] hover:border-[#c7a6f3]"
                }`}
              >
                All tracks ({problems.length})
              </button>
              {domains.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setActiveDomain(domain)}
                  className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                    activeDomain === domain
                      ? "border-[#5f2295] bg-[#5f2295] text-white"
                      : "border-[#e5d6f5] bg-[#faf7ff] text-[#5f2295] hover:border-[#c7a6f3]"
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          )}

          {/* Toast Feedback (fixed above sticky bottom bar on mobile, inline on desktop) */}
          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className={`fixed inset-x-4 bottom-24 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg sm:static sm:mt-5 sm:shadow-none ${
                feedback.type === "success"
                  ? "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
                  : "border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {visibleProblems.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#dfd2ef] bg-[#fcfaff] p-6 text-center sm:mt-6 sm:p-8">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadff5] bg-white text-[#5f2295]">
                <Compass size={20} />
              </div>
              <h3 className="editorial mt-4 text-xl font-bold text-[#220749]">
                Problem statements unlock at kickoff
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[#5e5070]">
                All hackathon tracks will appear right here as soon as the
                organizers publish them—no page reload needed once live.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 md:grid-cols-2">
              {visibleProblems.map((problem) => {
                const isSelected = problem.id === selectedId;
                const isBusy = selectingId === problem.id;
                const isConfirming = confirmingId === problem.id;
                const hasSlots =
                  problem.max_slots !== null && problem.max_slots > 0;
                const remaining = hasSlots
                  ? Math.max(problem.max_slots! - problem.filled_slots, 0)
                  : 0;
                const remainingRatio = hasSlots
                  ? remaining / problem.max_slots!
                  : 1;
                const isFull =
                  problem.max_slots !== null &&
                  problem.filled_slots >= problem.max_slots &&
                  !isSelected;
                const isAlmostFull =
                  hasSlots && !isFull && remainingRatio < 0.2;

                return (
                  <article
                    key={problem.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-150 sm:p-5 ${
                      isSelected
                        ? "border-[#5f2295] bg-[#faf7ff] ring-2 ring-[#8638cd]/15"
                        : "border-[#e7dcf3] bg-white hover:border-[#c7a6f3]"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                          {problem.domain && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#e5d6f5] bg-[#faf7ff] px-2.5 py-0.5 text-[#5f2295]">
                              <Layers size={12} />
                              <span>{problem.domain}</span>
                            </span>
                          )}
                          {problem.difficulty && (
                            <span className="rounded-md bg-[#f2ebfa] px-2.5 py-0.5 text-[#4a1878]">
                              {problem.difficulty}
                            </span>
                          )}
                        </div>

                        {isAlmostFull && (
                          <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold text-[#92400e]">
                            Almost full
                          </span>
                        )}
                      </div>

                      {hasSlots && (
                        <div
                          aria-label={`${remaining} of ${problem.max_slots} slots available`}
                          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#efe7f7]"
                        >
                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (problem.filled_slots / problem.max_slots!) *
                                    100
                                )
                              )}%`,
                            }}
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFull
                                ? "bg-[#9b8eb0]"
                                : isAlmostFull
                                  ? "bg-[#d97706]"
                                  : "bg-[#5f2295]"
                            }`}
                          />
                        </div>
                      )}

                      <h3 className="editorial mt-3 break-words text-xl font-bold leading-snug text-[#220749]">
                        {problem.title}
                      </h3>

                      {problem.summary && (
                        <ProblemSummary text={problem.summary} />
                      )}
                    </div>

                    <div className="mt-4 border-t border-[#efe7f7] pt-3.5 sm:mt-5 sm:pt-4">
                      <button
                        type="button"
                        disabled={isSelected || isFull || isBusyGlobal}
                        onClick={() => handleTrackButtonClick(problem.id)}
                        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all duration-150 ${
                          isSelected
                            ? "bg-[#eefaf1] text-[#1b7a37]"
                            : isFull
                              ? "cursor-not-allowed bg-[#f3eef8] text-[#9b8eb0]"
                              : isConfirming
                                ? "border border-[#5f2295] bg-[#f3e8ff] text-[#5f2295]"
                                : "btn-primary"
                        }`}
                      >
                        {isBusy || (isPending && problem.id === selectedId) ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Updating track…</span>
                          </>
                        ) : isSelected ? (
                          <>
                            <CheckCircle2 size={15} />
                            <span>Selected for your build</span>
                          </>
                        ) : isFull ? (
                          <span>Track full</span>
                        ) : isConfirming ? (
                          <span>Tap again to confirm</span>
                        ) : (
                          <span>Select this problem statement</span>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </MotionConfig>
  );
}