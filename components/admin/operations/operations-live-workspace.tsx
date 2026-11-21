"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EventOperationsReports } from "@/components/event-operations-reports";
import { OperationsMetricsGrid } from "./operations-metrics-grid";
import { VolunteerAccessSection } from "./volunteer-access-section";
import { SnackPolicySection } from "./snack-policy-section";
import { OperationsAuditTrail } from "./operations-audit-trail";
import type { OperationsSummary } from "./operations-types";

interface OperationsLiveWorkspaceProps {
  initialSummary: OperationsSummary | null;
  /** Auto-refresh interval in milliseconds (default: 5,000ms) */
  intervalMs?: number;
}

const EMPTY_SUMMARY: OperationsSummary = {
  total_registered: 0,
  checked_in: 0,
  snacks_distributed: 0,
  pending_checkin: 0,
  snack_policy: "event",
  volunteers: [],
  recent_activity: [],
};

export function OperationsLiveWorkspace({
  initialSummary,
  intervalMs = 5000,
}: OperationsLiveWorkspaceProps) {
  const [summary, setSummary] = useState<OperationsSummary>(
    initialSummary ?? EMPTY_SUMMARY
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState("Just now");

  const inFlightRef = useRef(false);
  const lastSyncAtRef = useRef<number>(Date.now());

  const fetchLatestSummary = useCallback(async (showSpinner = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (showSpinner) setIsSyncing(true);

    try {
      const res = await fetch("/api/operations/summary", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load operations summary");

      const resolved = (await res.json()) as OperationsSummary;
      setSummary(resolved);
      lastSyncAtRef.current = Date.now();
      setLastSyncedLabel("Just now");
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally {
      inFlightRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Sync if server props change (e.g. direct navigation)
  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary);
    }
  }, [initialSummary]);

  // Realtime push + 5-second background API polling
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("operations-live-telemetry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_schedule_settings" },
        () => fetchLatestSummary(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchLatestSummary(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations" },
        () => fetchLatestSummary(false)
      )
      .subscribe();

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLatestSummary(false);
      }
    }, intervalMs);

    const ticker = window.setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastSyncAtRef.current) / 1000);
      if (diffSec < 4) {
        setLastSyncedLabel("Just now");
      } else if (diffSec < 60) {
        setLastSyncedLabel(`${diffSec}s ago`);
      } else {
        setLastSyncedLabel(`${Math.floor(diffSec / 60)}m ago`);
      }
    }, 2000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchLatestSummary(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollTimer);
      window.clearInterval(ticker);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchLatestSummary, intervalMs]);

  return (
    <div>
      {/* Live Telemetry Status Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e0d8] pb-3.5 text-xs text-[#6d627a]">
        <p>
          <strong className="font-semibold text-[#1b053e]">
            {summary.checked_in} of {summary.total_registered}
          </strong>{" "}
          checked in ·{" "}
          <strong className="font-semibold text-[#1b053e]">
            {summary.snacks_distributed}
          </strong>{" "}
          snacks served ·{" "}
          <strong className="font-semibold text-[#1b053e]">
            {summary.pending_checkin}
          </strong>{" "}
          awaiting entry
        </p>

        <div className="inline-flex items-center gap-3">
          <span>
            {syncError
              ? "Reconnecting live feed…"
              : `Auto-sync (${Math.round(intervalMs / 1000)}s) · Updated ${lastSyncedLabel}`}
          </span>

          <button
            type="button"
            onClick={() => fetchLatestSummary(true)}
            disabled={isSyncing}
            className="inline-flex items-center gap-1 font-semibold text-[#6828a2] transition-colors hover:text-[#1b053e] disabled:opacity-50"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Live KPI Cards */}
      <OperationsMetricsGrid
        totalRegistered={summary.total_registered}
        checkedIn={summary.checked_in}
        snacksDistributed={summary.snacks_distributed}
        pendingCheckin={summary.pending_checkin}
        intervalMs={30000}
      />

      {/* Volunteer Access & Snack Distribution Rules */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <VolunteerAccessSection
          volunteers={summary.volunteers ?? []}
          onMutated={() => fetchLatestSummary(true)}
        />

        <SnackPolicySection
          snackPolicy={summary.snack_policy ?? "event"}
          checkedIn={summary.checked_in}
          totalRegistered={summary.total_registered}
          snacksDistributed={summary.snacks_distributed}
          onMutated={() => fetchLatestSummary(true)}
        />
      </div>

      {/* Operations Reports */}
      <div className="mt-8">
        <EventOperationsReports />
      </div>

      {/* Live Audit Trail */}
      <OperationsAuditTrail
        activity={summary.recent_activity ?? []}
        intervalMs={30000}
      />
    </div>
  );
}