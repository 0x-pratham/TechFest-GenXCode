"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  X,
} from "lucide-react";
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

interface ScanPopupNotification {
  id: number;
  tone: "success" | "error";
  title: string;
  message: string;
  participant?: string;
  applicationNumber?: string;
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
  const [popup, setPopup] = useState<ScanPopupNotification | null>(null);

  const inFlightRef = useRef(false);
  const lastSyncAtRef = useRef<number | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  const showPopup = useCallback((next: Omit<ScanPopupNotification, "id">) => {
    if (popupTimerRef.current !== null) {
      window.clearTimeout(popupTimerRef.current);
    }
    const id = Date.now();
    setPopup({ ...next, id });
    popupTimerRef.current = window.setTimeout(() => {
      setPopup((current) => (current?.id === id ? null : current));
    }, 5500);
  }, []);

  useEffect(() => {
    return () => {
      if (popupTimerRef.current !== null) {
        window.clearTimeout(popupTimerRef.current);
      }
    };
  }, []);

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

  // Listen for scan events & cross-tab sync and immediately pop up status + refresh DB summary
  useEffect(() => {
    const handleScanCompleted = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      const scanCode = typeof detail?.result === "string" ? detail.result : "";
      const participantName =
        typeof detail?.participant_name === "string"
          ? detail.participant_name
          : undefined;
      const appNo =
        typeof detail?.application_number === "string"
          ? detail.application_number
          : undefined;
      const errMsg =
        typeof detail?.error === "string" ? detail.error : undefined;

      const isApproved =
        scanCode === "checked_in" || scanCode === "snack_distributed";
      const title =
        scanCode === "checked_in"
          ? "Approved · Check-in Recorded"
          : scanCode === "snack_distributed"
            ? "Approved · Food Claim Logged"
            : scanCode === "already_distributed"
              ? "Rejected · Food Already Claimed"
              : scanCode === "already_checked_in"
                ? "Rejected · Already Checked In"
                : scanCode === "invalid"
                  ? "Rejected · Invalid Pass"
                  : isApproved
                    ? "Scan Approved"
                    : "Scan Rejected";

      const message =
        errMsg ||
        (scanCode === "checked_in"
          ? "Valid pass verified and check-in saved to database."
          : scanCode === "snack_distributed"
            ? "First-time food claim approved and saved to database."
            : scanCode === "already_distributed"
              ? "Participant has already claimed food. Duplicate claim rejected."
              : scanCode === "already_checked_in"
                ? "Participant has already checked in."
                : scanCode === "invalid"
                  ? "Pass token is invalid or expired."
                  : "Scan recorded.");

      showPopup({
        tone: isApproved ? "success" : "error",
        title,
        message,
        participant: participantName,
        applicationNumber: appNo,
      });

      void fetchLatestSummary(false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "gxc_last_scan_at") {
        void fetchLatestSummary(false);
      }
    };

    window.addEventListener("gxc:scan-completed", handleScanCompleted);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("gxc:scan-completed", handleScanCompleted);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchLatestSummary, showPopup]);

  // Realtime push + background API polling
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("operations-live-telemetry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_schedule_settings" },
        () => void fetchLatestSummary(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void fetchLatestSummary(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations" },
        () => void fetchLatestSummary(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_attendance" },
        () => void fetchLatestSummary(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "snack_distributions" },
        () => void fetchLatestSummary(false)
      )
      .subscribe();

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchLatestSummary(false);
      }
    }, intervalMs);

    const ticker = window.setInterval(() => {
      if (lastSyncAtRef.current === null) {
        setLastSyncedLabel("Just now");
        return;
      }
      const diffSec = Math.floor(
        (Date.now() - lastSyncAtRef.current) / 1000
      );
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
        void fetchLatestSummary(false);
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
    <div className="relative">
      {/* Floating Scan / Status Pop-Up */}
      {popup && (
        <div
          role={popup.tone === "error" ? "alert" : "status"}
          aria-live="assertive"
          className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border bg-white p-4 shadow-[0_16px_42px_rgba(27,5,62,0.18)] sm:bottom-6 sm:right-6"
          style={{
            borderColor: popup.tone === "success" ? "#bbf7d0" : "#fecaca",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {popup.tone === "success" ? (
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-[#1b7a37]"
                />
              ) : (
                <CircleAlert
                  size={20}
                  className="mt-0.5 shrink-0 text-[#be123c]"
                />
              )}

              <div className="min-w-0">
                <p
                  className={`text-sm font-bold ${
                    popup.tone === "success"
                      ? "text-[#14532d]"
                      : "text-[#9f1239]"
                  }`}
                >
                  {popup.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#524661]">
                  {popup.message}
                </p>
                {(popup.participant || popup.applicationNumber) && (
                  <p className="mt-2 font-mono text-[11px] font-semibold text-[#1b053e]">
                    {popup.participant ?? "Participant"}
                    {popup.applicationNumber ? ` · ${popup.applicationNumber}` : ""}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPopup(null)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-[#76678a] transition-colors hover:bg-[#f4effc] hover:text-[#1b053e]"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

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
            onClick={() => void fetchLatestSummary(true)}
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
          onMutated={() => void fetchLatestSummary(true)}
        />

        <SnackPolicySection
          snackPolicy={summary.snack_policy ?? "event"}
          checkedIn={summary.checked_in}
          totalRegistered={summary.total_registered}
          snacksDistributed={summary.snacks_distributed}
          onMutated={() => void fetchLatestSummary(true)}
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