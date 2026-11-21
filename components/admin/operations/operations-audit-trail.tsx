"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ADMIN_SECONDARY_BTN } from "@/components/admin/admin-styles";
import type { OperationActivityItem } from "./operations-types";

interface OperationsAuditTrailProps {
  activity?: OperationActivityItem[];
  /** Optional fallback sync interval in ms (default: 30,000ms) */
  intervalMs?: number;
}

type ActivityCategory = "all" | "checkin" | "snacks" | "admin";

const ACTION_LABELS: Record<
  string,
  { label: string; category: ActivityCategory; tone: string }
> = {
  participant_checked_in: {
    label: "Participant checked in at gate",
    category: "checkin",
    tone: "text-[#1b7a37]",
  },
  checkin_recorded: {
    label: "Participant checked in at gate",
    category: "checkin",
    tone: "text-[#1b7a37]",
  },
  duplicate_checkin_attempt: {
    label: "Duplicate check-in scan blocked",
    category: "checkin",
    tone: "text-[#b45309]",
  },
  snack_claimed: {
    label: "Refreshment claimed",
    category: "snacks",
    tone: "text-[#6828a2]",
  },
  snack_distributed: {
    label: "Refreshment served",
    category: "snacks",
    tone: "text-[#6828a2]",
  },
  duplicate_snack_attempt: {
    label: "Duplicate snack scan blocked",
    category: "snacks",
    tone: "text-[#b45309]",
  },
  volunteer_saved: {
    label: "Volunteer scanner access updated",
    category: "admin",
    tone: "text-[#3d2b54]",
  },
  volunteer_status_changed: {
    label: "Volunteer duty status changed",
    category: "admin",
    tone: "text-[#3d2b54]",
  },
  snack_policy_updated: {
    label: "Snack distribution rule updated",
    category: "admin",
    tone: "text-[#3d2b54]",
  },
};

function classifyAction(action: string): {
  label: string;
  category: ActivityCategory;
  tone: string;
} {
  const normalized = action.toLowerCase().trim();
  if (ACTION_LABELS[normalized]) {
    return ACTION_LABELS[normalized];
  }

  const humanized = normalized
    .replaceAll("_", " ")
    .replace(/^\w/, (c) => c.toUpperCase());

  if (normalized.includes("check")) {
    return { label: humanized, category: "checkin", tone: "text-[#1b7a37]" };
  }
  if (normalized.includes("snack")) {
    return { label: humanized, category: "snacks", tone: "text-[#6828a2]" };
  }
  return { label: humanized, category: "admin", tone: "text-[#3d2b54]" };
}

function formatDetailsLine(item: OperationActivityItem): string {
  const parts: string[] = [];
  const details = item.details ?? {};

  const participantName =
    typeof details.participant_name === "string"
      ? details.participant_name.trim()
      : typeof details.name === "string"
        ? details.name.trim()
        : "";

  const appNumber =
    typeof details.application_number === "string"
      ? details.application_number.trim()
      : "";

  if (participantName) parts.push(participantName);
  if (appNumber) parts.push(appNumber);
  if (!appNumber && item.registration_id) {
    parts.push(`Pass ${item.registration_id.slice(0, 8).toUpperCase()}`);
  }

  parts.push(item.email ? `by ${item.email}` : "by System");
  return parts.join(" · ");
}

function formatEventTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(parsed)
    .replace(",", "");
}

export function OperationsAuditTrail({
  activity = [],
  intervalMs = 30000,
}: OperationsAuditTrailProps) {
  const [items, setItems] = useState<OperationActivityItem[]>(activity);
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const inFlightRef = useRef(false);

  useEffect(() => {
    setItems(activity);
  }, [activity]);

  const syncLatestActivity = useCallback(async (showSpinner = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (showSpinner) setIsRefreshing(true);

    try {
      const response = await fetch("/api/operations/summary", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data?.recent_activity)) {
        setItems(data.recent_activity);
      }
    } catch {
      // Retain existing entries silently on transient network drops
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncLatestActivity(false);
      }
    }, intervalMs);

    return () => window.clearInterval(pollTimer);
  }, [intervalMs, syncLatestActivity]);

  const enrichedItems = useMemo(
    () =>
      items.slice(0, 50).map((item, idx) => ({
        raw: item,
        key: `${item.created_at}-${item.action}-${item.registration_id ?? idx}`,
        meta: classifyAction(item.action),
        subtitle: formatDetailsLine(item),
        formattedTime: formatEventTimestamp(item.created_at),
      })),
    [items]
  );

  const counts = useMemo(() => {
    let checkin = 0;
    let snacks = 0;
    let admin = 0;
    for (const entry of enrichedItems) {
      if (entry.meta.category === "checkin") checkin += 1;
      else if (entry.meta.category === "snacks") snacks += 1;
      else admin += 1;
    }
    return { all: enrichedItems.length, checkin, snacks, admin };
  }, [enrichedItems]);

  const visibleEntries = useMemo(() => {
    if (activeCategory === "all") return enrichedItems;
    return enrichedItems.filter(
      (entry) => entry.meta.category === activeCategory
    );
  }, [enrichedItems, activeCategory]);

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_8px_28px_rgba(27,5,62,0.03)]">
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-6 sm:px-7">
        <div>
          <p className="editorial text-[15px] italic text-[#6828a2]">
            Security &amp; Scan Log
          </p>
          <h2 className="editorial mt-0.5 text-2xl font-bold text-[#1b053e] sm:text-3xl">
            Recent activity
          </h2>
          <p className="mt-1 text-xs text-[#5c4f6e]">
            Live chronological feed of gate scans, refreshment redemptions, and
            staff changes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#6d627a]">
            {enrichedItems.length === 0
              ? "No events logged yet"
              : `Showing latest ${enrichedItems.length} ${
                  enrichedItems.length === 1 ? "event" : "events"
                }`}
          </span>

          <button
            type="button"
            onClick={() => void syncLatestActivity(true)}
            disabled={isRefreshing}
            className={`${ADMIN_SECONDARY_BTN} disabled:opacity-50`}
          >
            <RefreshCw
              size={13}
              className={`text-[#6828a2] ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {/* 0ms Client-Side Category Tabs */}
        {enrichedItems.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter activity log"
            className="mb-4 flex items-center gap-5 overflow-x-auto border-b border-[#ebe4dc] text-xs"
          >
            {(
              [
                { key: "all", label: `All (${counts.all})` },
                { key: "checkin", label: `Gate check-ins (${counts.checkin})` },
                { key: "snacks", label: `Snacks (${counts.snacks})` },
                { key: "admin", label: `Staff & rules (${counts.admin})` },
              ] as const
            ).map((tab) => {
              const isSelected = activeCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCategory(tab.key)}
                  className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 font-semibold transition-colors ${
                    isSelected
                      ? "border-[#6828a2] text-[#1b053e]"
                      : "border-transparent text-[#6d627a] hover:text-[#1b053e]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Activity Stream */}
        {visibleEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dcd0ec] bg-[#fcfaff] py-10 text-center">
            <p className="text-sm font-semibold text-[#1b053e]">
              {enrichedItems.length === 0
                ? "No gate check-ins or snack scans recorded yet"
                : "No events in this category yet"}
            </p>
            <p className="mt-1 text-xs text-[#76678a]">
              New scans from volunteer devices will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f1ece4]">
            {visibleEntries.map((entry) => (
              <div
                key={entry.key}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors hover:bg-[#fdfbff]"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${entry.meta.tone}`}>
                    {entry.meta.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[#6d627a]">
                    {entry.subtitle}
                  </p>
                </div>

                <time
                  dateTime={entry.raw.created_at}
                  className="shrink-0 font-mono text-xs text-[#6d627a]"
                >
                  {entry.formattedTime}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}