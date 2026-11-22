"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

export function DashboardUpdates({
  events,
  problems,
  selectedProblemStatementId,
}: DashboardUpdatesProps) {
  const router = useRouter();

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

  const [activeDay, setActiveDay] = useState<number>(availableDays[0] ?? 1);
  const [optimisticSelectedId, setOptimisticSelectedId] = useState<
    string | null
  >(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const selectedId = optimisticSelectedId ?? selectedProblemStatementId;

  const resolvedActiveDay = availableDays.includes(activeDay)
    ? activeDay
    : availableDays[0] ?? 1;

  const activeDayEvents = useMemo(() => {
    const found = groupedByDay.find(([day]) => day === resolvedActiveDay);
    return found ? found[1] : [];
  }, [groupedByDay, resolvedActiveDay]);

  async function handleSelectProblem(problemId: string) {
    if (selectingId || problemId === selectedId) return;

    setSelectingId(problemId);
    setFeedback(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(
        "select_registration_problem_statement",
        { p_problem_statement_id: problemId }
      );

      if (error) {
        setFeedback({
          type: "error",
          message:
            error.message || "Could not lock this track right now. Try again.",
        });
        return;
      }

      setOptimisticSelectedId(problemId);
      setFeedback({
        type: "success",
        message: "Problem statement updated on your builder pass.",
      });
      await invalidateProblemStatementsCache();
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "Network issue while updating your selection. Please retry.",
      });
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[1.5rem] border border-[#eadff5] bg-white shadow-[0_12px_36px_rgba(34,4,75,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#f0e8f8] bg-gradient-to-r from-white via-[#fdfbff] to-[#f8f3ff] p-6 sm:p-8">
          <div>
            <p className="editorial text-[16px] italic text-[#5f2295]">
              Run of show
            </p>
            <h2 className="editorial mt-1 text-2xl font-bold tracking-tight text-[#220749] sm:text-3xl">
              Event schedule &amp; sessions
            </h2>
            <p className="mt-1.5 text-[13.5px] text-[#5e5070]">
              Timings, venues, and prep notes for workshops, hacking blocks, and
              refreshments.
            </p>
          </div>

          {availableDays.length > 1 ? (
            <div
              role="tablist"
              aria-label="Event schedule days"
              className="inline-flex items-center gap-1 rounded-xl border border-[#e5d6f5] bg-[#faf7ff] p-1"
            >
              {availableDays.map((day) => {
                const isSelected = day === resolvedActiveDay;
                return (
                  <button
                    key={day}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveDay(day)}
                    className={`relative rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors duration-150 ${
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5d6f5] bg-[#faf7ff] px-3.5 py-1.5 text-xs font-semibold text-[#5f2295]">
              <CalendarDays size={13} />
              <span>Day {resolvedActiveDay} Lineup</span>
            </span>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {activeDayEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfd2ef] bg-[#fcfaff] p-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadff5] bg-white text-[#5f2295]">
                <Clock size={20} />
              </div>
              <h3 className="editorial mt-4 text-xl font-bold text-[#220749]">
                Detailed schedule drops shortly
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[#5e5070]">
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
                className="relative space-y-5 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-gradient-to-b before:from-[#8638cd] before:via-[#d9c4f2] before:to-transparent sm:before:left-[19px]"
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
                        className={`absolute left-0 top-5 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold shadow-2xs sm:h-10 sm:w-10 sm:text-xs ${
                          index === 0
                            ? "border-[#5f2295] bg-[#5f2295] text-white"
                            : "border-[#dfd0f0] bg-white text-[#5f2295]"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="rounded-2xl border border-[#e7dcf3] bg-white p-5 shadow-[0_4px_16px_rgba(34,4,75,0.03)] transition-all duration-150 hover:border-[#c7a6f3] hover:shadow-[0_8px_24px_rgba(34,4,75,0.06)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <h3 className="editorial break-words text-lg font-bold leading-snug text-[#220749] sm:text-xl">
                            {session.title}
                          </h3>

                          {(hasTiming || hasVenue) && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                              {hasTiming && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfd0f0] bg-[#faf7ff] px-2.5 py-1 font-semibold text-[#4a1878]">
                                  <Clock size={12} className="text-[#5f2295]" />
                                  <span>{session.timing}</span>
                                </span>
                              )}

                              {hasVenue && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2d9cb] bg-[#faf7f2] px-2.5 py-1 font-semibold text-[#3d3630]">
                                  <MapPin size={12} className="text-[#8638cd]" />
                                  <span>{session.venue}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {hasInstructions && (
                          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-[#e6dfd4] bg-[#faf7f2] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[#3d3630]">
                            <FileText
                              size={14}
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

      <section className="rounded-[1.5rem] border border-[#eadff5] bg-white p-6 shadow-[0_12px_36px_rgba(34,4,75,0.04)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#f0e8f8] pb-5">
          <div>
            <p className="editorial text-[16px] italic text-[#5f2295]">
              Build tracks
            </p>
            <h2 className="editorial mt-1 text-2xl font-bold tracking-tight text-[#220749] sm:text-3xl">
              Choose your problem statement
            </h2>
            <p className="mt-1.5 text-[13.5px] text-[#5e5070]">
              Select the challenge you want to build for. You can switch tracks
              while open slots remain.
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

        {feedback && (
          <div
            role="status"
            className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
              feedback.type === "success"
                ? "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
                : "border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {problems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#dfd2ef] bg-[#fcfaff] p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadff5] bg-white text-[#5f2295]">
              <Compass size={20} />
            </div>
            <h3 className="editorial mt-4 text-xl font-bold text-[#220749]">
              Problem statements unlock at kickoff
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[#5e5070]">
              All hackathon tracks will appear right here as soon as the
              organizers publish them—no page reload needed once live.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {problems.map((problem) => {
              const isSelected = problem.id === selectedId;
              const isBusy = selectingId === problem.id;
              const isFull =
                problem.max_slots !== null &&
                problem.filled_slots >= problem.max_slots &&
                !isSelected;

              return (
                <article
                  key={problem.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all duration-150 ${
                    isSelected
                      ? "border-[#5f2295] bg-[#faf7ff] ring-2 ring-[#8638cd]/15"
                      : "border-[#e7dcf3] bg-white hover:border-[#c7a6f3]"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                        {problem.domain && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#e5d6f5] bg-[#faf7ff] px-2 py-0.5 text-[#5f2295]">
                            <Layers size={11} />
                            <span>{problem.domain}</span>
                          </span>
                        )}
                        {problem.difficulty && (
                          <span className="rounded-md bg-[#f2ebfa] px-2 py-0.5 text-[#4a1878]">
                            {problem.difficulty}
                          </span>
                        )}
                      </div>

                      {problem.max_slots !== null && (
                        <span className="text-[11px] font-semibold text-[#5e5070]">
                          {Math.max(
                            problem.max_slots - problem.filled_slots,
                            0
                          )}{" "}
                          of {problem.max_slots} slots left
                        </span>
                      )}
                    </div>

                    <h3 className="editorial mt-3 break-words text-xl font-bold leading-snug text-[#220749]">
                      {problem.title}
                    </h3>

                    {problem.summary && (
                      <p className="mt-2 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-[#4f4261]">
                        {problem.summary}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[#efe7f7] pt-4">
                    <button
                      type="button"
                      disabled={isSelected || isFull || Boolean(selectingId)}
                      onClick={() => handleSelectProblem(problem.id)}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150 ${
                        isSelected
                          ? "bg-[#eefaf1] text-[#1b7a37]"
                          : isFull
                            ? "cursor-not-allowed bg-[#f3eef8] text-[#9b8eb0]"
                            : "btn-primary"
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Updating track…</span>
                        </>
                      ) : isSelected ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Selected for your build</span>
                        </>
                      ) : isFull ? (
                        <span>Track full</span>
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
  );
}