"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_SECONDARY_BTN } from "@/components/admin/admin-styles";
import { SubmissionReviewCard } from "./submission-review-card";
import type { EnrichedSubmission } from "./submissions-types";

interface SubmissionsLiveWorkspaceProps {
  submissions: EnrichedSubmission[];
  effectiveOpen: boolean;
  intervalMs?: number;
}

type FilterTab = "all" | "queue" | "shortlisted" | "winner" | "rejected";

export function SubmissionsLiveWorkspace({
  submissions,
  effectiveOpen,
  intervalMs = 15000,
}: SubmissionsLiveWorkspaceProps) {
  const [items, setItems] = useState<EnrichedSubmission[]>(submissions);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const inFlightRef = useRef(false);

  useEffect(() => {
    setItems(submissions);
  }, [submissions]);

  const syncSubmissionsFromDb = useCallback(async (showSpinner = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (showSpinner) setIsRefreshing(true);

    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from("project_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error || !Array.isArray(rows)) return;

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

      const regMap = new Map((registrations ?? []).map((r) => [r.id, r]));
      const probMap = new Map((problems ?? []).map((p) => [p.id, p]));

      const enriched: EnrichedSubmission[] = rows.map((s, idx) => {
        const reg = regMap.get(s.registration_id);
        const prob = probMap.get(s.problem_statement_id);

        return {
          id: String(s.id),
          project_title: s.project_title || "Untitled project",
          description: s.description ?? null,
          solution_features: s.solution_features ?? null,
          github_url: s.github_url ?? null,
          production_url: s.production_url ?? null,
          signed_deck_url: signedResults[idx]?.data?.signedUrl ?? null,
          status: s.status ?? "pending",
          score: typeof s.score === "number" ? s.score : null,
          judge_remarks: s.judge_remarks ?? null,
          submitted_at: s.submitted_at ?? null,
          participant_name: reg?.name ?? "Participant",
          participant_email: reg?.email ?? "",
          application_number: reg?.application_number ?? "UNASSIGNED",
          problem_title: prob?.title ?? "General track",
          problem_domain: prob?.domain ?? null,
        };
      });

      setItems(enriched);
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("project-submissions-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_submissions" },
        () => void syncSubmissionsFromDb(false)
      )
      .subscribe();

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncSubmissionsFromDb(false);
      }
    }, intervalMs);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollTimer);
    };
  }, [intervalMs, syncSubmissionsFromDb]);

  // 0ms optimistic state patch when an organizer saves a decision on any card
  const handleDecisionSaved = useCallback(
    (
      id: string,
      patch: {
        status: string;
        score: number | null;
        judge_remarks: string | null;
      }
    ) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
    },
    []
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      queue: items.filter(
        (s) => s.status === "pending" || s.status === "under_review"
      ).length,
      shortlisted: items.filter((s) => s.status === "shortlisted").length,
      winner: items.filter((s) => s.status === "winner").length,
      rejected: items.filter((s) => s.status === "rejected").length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (
        activeTab === "queue" &&
        s.status !== "pending" &&
        s.status !== "under_review"
      ) {
        return false;
      }
      if (
        activeTab !== "all" &&
        activeTab !== "queue" &&
        s.status !== activeTab
      ) {
        return false;
      }
      if (!q) return true;
      return (
        s.project_title.toLowerCase().includes(q) ||
        s.participant_name.toLowerCase().includes(q) ||
        s.participant_email.toLowerCase().includes(q) ||
        s.application_number.toLowerCase().includes(q) ||
        s.problem_title.toLowerCase().includes(q)
      );
    });
  }, [items, activeTab, query]);

  return (
    <section className="mt-8">
      {/* Toolbar: Filter Tabs + Search + Manual Sync */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter submissions"
          className="flex items-center gap-4 overflow-x-auto border-b border-[#e5ddd2] text-xs"
        >
          {(
            [
              { key: "all", label: `All (${counts.all})` },
              { key: "queue", label: `Needs review (${counts.queue})` },
              { key: "shortlisted", label: `Shortlisted (${counts.shortlisted})` },
              { key: "winner", label: `Winners (${counts.winner})` },
              { key: "rejected", label: `Not selected (${counts.rejected})` },
            ] as const
          ).map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.key)}
                className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 font-semibold transition-colors ${
                  selected
                    ? "border-[#6828a2] text-[#1b053e]"
                    : "border-transparent text-[#6d627a] hover:text-[#1b053e]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#76678a]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search project, student, track…"
              className="w-full rounded-xl border border-[#e3dbd0] bg-white py-2 pl-8 pr-3 text-xs text-[#1b053e] outline-none transition-colors placeholder:text-[#8d7ba3] focus:border-[#6828a2]"
            />
          </div>

          <button
            type="button"
            onClick={() => void syncSubmissionsFromDb(true)}
            disabled={isRefreshing}
            aria-label="Refresh submissions"
            className={`${ADMIN_SECONDARY_BTN} shrink-0 disabled:opacity-50`}
          >
            <RefreshCw
              size={13}
              className={`text-[#6828a2] ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Submission Cards */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((submission) => (
            <SubmissionReviewCard
              key={submission.id}
              submission={submission}
              onDecisionSaved={handleDecisionSaved}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#dcd0ec] bg-white p-10 text-center sm:p-12">
          <p className="editorial text-xl font-bold text-[#1b053e]">
            {items.length === 0
              ? "No entries submitted yet"
              : "No matching entries"}
          </p>
          <p className="mt-1.5 text-sm text-[#6d627a]">
            {items.length === 0 ? (
              <>
                Submissions are currently{" "}
                <strong className="font-semibold text-[#1b053e]">
                  {effectiveOpen ? "open" : "closed"}
                </strong>
                . New entries will show up here automatically.
              </>
            ) : (
              "Clear your search or switch tabs to see other entries."
            )}
          </p>
        </div>
      )}
    </section>
  );
}