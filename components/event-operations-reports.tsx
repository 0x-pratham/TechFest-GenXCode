"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_SECONDARY_BTN,
} from "@/components/admin/admin-styles";

export interface ParticipantRecord {
  registration_id: string;
  participant_name: string;
  application_number: string;
  participant_email: string;
  checked_in_at: string | null;
  snack_claims: number;
}

type AttendanceFilter = "all" | "checked_in" | "pending";

interface EventOperationsReportsProps {
  allowExport?: boolean;
  /** Auto-refresh interval in milliseconds (default: 10,000ms) */
  intervalMs?: number;
}

const SCAN_SYNC_STORAGE_KEY = "gxc_last_scan_at";
export const SCAN_COMPLETED_EVENT = "gxc:scan-completed";

function formatAttendanceTime(value: string | null): string {
  if (!value) return "Awaiting entry";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(parsed)
    .replace(",", "");
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function EventOperationsReports({
  allowExport = true,
  intervalMs = 10000,
}: EventOperationsReportsProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>("all");
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const latestQueryRef = useRef<string>("");
  const didMountRef = useRef<boolean>(false);

  const fetchParticipants = useCallback(
    async (searchTerm: string, silent = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!silent) setIsSearching(true);
      setError("");

      try {
        const response = await fetch(
          `/api/event-operations/participants?q=${encodeURIComponent(
            searchTerm.trim()
          )}`,
          {
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            (data && typeof data.error === "string" && data.error) ||
              "Could not load participant records."
          );
        }

        const list: ParticipantRecord[] = Array.isArray(data?.participants)
          ? data.participants.map((row: Record<string, unknown>) => ({
              registration_id: String(row.registration_id ?? ""),
              participant_name: String(row.participant_name ?? ""),
              application_number: String(row.application_number ?? ""),
              participant_email: String(row.participant_email ?? ""),
              checked_in_at:
                typeof row.checked_in_at === "string"
                  ? row.checked_in_at
                  : null,
              snack_claims: Number.isFinite(Number(row.snack_claims))
                ? Number(row.snack_claims)
                : 0,
            }))
          : [];

        setParticipants(list);
        setHasLoadedOnce(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (!silent) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load participant records."
          );
        }
      } finally {
        if (abortRef.current === controller) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  async function handleExportCsv() {
    if (isExporting) return;
    setIsExporting(true);
    setError("");

    const filename = `genxcode-attendance-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    try {
      const response = await fetch("/api/event-operations/export", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        triggerBlobDownload(blob, filename);
        return;
      }

      if (participants.length > 0) {
        const header = [
          "Application Number",
          "Participant Name",
          "Email",
          "Gate Status",
          "Snack Claims",
        ].join(",");

        const rows = participants.map((p) =>
          [
            p.application_number,
            p.participant_name,
            p.participant_email,
            formatAttendanceTime(p.checked_in_at),
            p.snack_claims,
          ]
            .map(escapeCsvCell)
            .join(",")
        );

        const csvBlob = new Blob([`\uFEFF${[header, ...rows].join("\r\n")}`], {
          type: "text/csv;charset=utf-8;",
        });
        triggerBlobDownload(csvBlob, filename);
        return;
      }

      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Could not export event records.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export event records."
      );
    } finally {
      setIsExporting(false);
    }
  }

  // Immediate fetch on mount; 280ms debounced search on subsequent query edits
  useEffect(() => {
    latestQueryRef.current = query;

    if (!didMountRef.current) {
      didMountRef.current = true;
      void fetchParticipants("", false);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchParticipants(query, false);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query, fetchParticipants]);

  // Immediate sync when a scan occurs in this tab or another tab
  useEffect(() => {
    const onScanEvent = () => {
      void fetchParticipants(latestQueryRef.current, true);
    };

    const onStorageChange = (event: StorageEvent) => {
      if (event.key === SCAN_SYNC_STORAGE_KEY) {
        void fetchParticipants(latestQueryRef.current, true);
      }
    };

    window.addEventListener(SCAN_COMPLETED_EVENT, onScanEvent);
    window.addEventListener("storage", onStorageChange);

    return () => {
      window.removeEventListener(SCAN_COMPLETED_EVENT, onScanEvent);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [fetchParticipants]);

  // Silent background refresh while tab is visible
  useEffect(() => {
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchParticipants(latestQueryRef.current, true);
      }
    }, intervalMs);

    return () => {
      window.clearInterval(pollTimer);
      abortRef.current?.abort();
    };
  }, [fetchParticipants, intervalMs]);

  const filteredParticipants = useMemo(() => {
    if (statusFilter === "checked_in") {
      return participants.filter((p) => Boolean(p.checked_in_at));
    }
    if (statusFilter === "pending") {
      return participants.filter((p) => !p.checked_in_at);
    }
    return participants;
  }, [participants, statusFilter]);

  const checkedInInView = useMemo(
    () => participants.filter((p) => Boolean(p.checked_in_at)).length,
    [participants]
  );

  const isInitialLoading = isSearching && !hasLoadedOnce;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_8px_28px_rgba(27,5,62,0.03)]">
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-6 sm:px-7">
        <div>
          <p className="editorial text-[15px] italic text-[#6828a2]">
            Participant Register
          </p>
          <h2 className="editorial mt-0.5 text-2xl font-bold text-[#1b053e] sm:text-3xl">
            Attendance lookup
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#5c4f6e]">
            Search confirmed registrations in real time by name, email, or
            application number.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void fetchParticipants(query, false)}
            disabled={isSearching}
            className={`${ADMIN_SECONDARY_BTN} disabled:opacity-50`}
          >
            <RefreshCw
              size={13}
              className={`text-[#6828a2] ${isSearching ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          {allowExport && (
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5f2295] via-[#6e2aad] to-[#8638cd] px-4 py-2.5 text-xs font-bold tracking-wide text-white shadow-[0_4px_14px_rgba(95,34,149,0.2)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {isExporting ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  <span>Exporting…</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Export CSV</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {/* Live Search + Instant Filter Controls */}
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a6d8c]"
            />
            <input
              type="text"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void fetchParticipants(query, false);
                } else if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Type name, email, or application number…"
              className={`${ADMIN_FIELD_CLASS} !mt-0 pl-10 pr-10`}
            />
            {isSearching ? (
              <LoaderCircle
                size={15}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#6828a2]"
              />
            ) : (
              query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#7a6d8c] transition-colors hover:bg-[#efe7f7] hover:text-[#1b053e]"
                >
                  <X size={14} />
                </button>
              )
            )}
          </div>

          {/* Client-Side Underline Filter Tabs (0ms switch) */}
          <div
            role="tablist"
            aria-label="Filter by check-in status"
            className="flex shrink-0 items-center gap-5 overflow-x-auto border-b border-[#ebe4dc] px-1 text-xs lg:border-b-0"
          >
            {(
              [
                { key: "all", label: `All (${participants.length})` },
                {
                  key: "checked_in",
                  label: `Checked in (${checkedInInView})`,
                },
                {
                  key: "pending",
                  label: `Awaiting (${Math.max(
                    0,
                    participants.length - checkedInInView
                  )})`,
                },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`-mb-px whitespace-nowrap border-b-2 pb-2 font-semibold transition-colors ${
                    active
                      ? "border-[#6828a2] text-[#1b053e]"
                      : "border-transparent text-[#6d627a] hover:text-[#1b053e]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <p
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl border border-[#f5c2c7] bg-[#fff1f2] px-4 py-3 text-xs font-semibold text-[#be123c]"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {/* Register Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#ebe4dc]">
          <table className="w-full min-w-[660px] text-left text-xs">
            <thead className="border-b border-[#ebe4dc] bg-[#faf7f2] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#5e536b]">
              <tr>
                <th className="px-4 py-3.5">Participant</th>
                <th className="whitespace-nowrap px-4 py-3.5">Application</th>
                <th className="whitespace-nowrap px-4 py-3.5">Gate Status</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-right">
                  Snack Claims
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1ece4] bg-white">
              {isInitialLoading
                ? Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="px-4 py-4">
                        <div className="h-3.5 w-36 rounded bg-[#efe8f6]" />
                        <div className="mt-1.5 h-3 w-48 rounded bg-[#f5f0f9]" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3.5 w-24 rounded bg-[#efe8f6]" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3.5 w-28 rounded bg-[#efe8f6]" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="ml-auto h-3.5 w-8 rounded bg-[#efe8f6]" />
                      </td>
                    </tr>
                  ))
                : filteredParticipants.map((p) => {
                    const isCheckedIn = Boolean(p.checked_in_at);
                    return (
                      <tr
                        key={p.registration_id}
                        className="transition-colors hover:bg-[#fdfbff]"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-[#1b053e]">
                            {p.participant_name || "Unnamed participant"}
                          </p>
                          <p className="mt-0.5 text-[#6d627a]">
                            {p.participant_email}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-semibold text-[#3d2b54]">
                          {p.application_number || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span
                            className={`font-medium ${
                              isCheckedIn ? "text-[#1b7a37]" : "text-[#7a6d8c]"
                            }`}
                          >
                            {formatAttendanceTime(p.checked_in_at)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-[#1b053e]">
                          {p.snack_claims}
                        </td>
                      </tr>
                    );
                  })}

              {!isSearching && filteredParticipants.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-[#76678a]"
                  >
                    {query.trim()
                      ? `No confirmed registrations match "${query.trim()}".`
                      : "No confirmed registrations in this view yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11.5px] text-[#6d627a]">
          Showing up to 100 matching confirmed registrations · Auto-updates
          every {Math.round(intervalMs / 1000)}s. Use{" "}
          <strong className="font-semibold text-[#1b053e]">Export CSV</strong>{" "}
          for the complete register.
        </p>
      </div>
    </section>
  );
}