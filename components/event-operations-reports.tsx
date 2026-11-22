"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  LoaderCircle,
  Radio,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_SECONDARY_BTN,
} from "@/components/admin/admin-styles";

export interface ParticipantRecord {
  registration_id: string;
  participant_name: string;
  application_number: string;
  participant_email: string;
  college?: string | null;
  checked_in_at: string | null;
  checked_in_day?: number | null;
  snack_claims: number;
  last_snack_at?: string | null;
}

type AttendanceFilter = "all" | "checked_in" | "pending" | "snacks_taken";

interface EventOperationsReportsProps {
  allowExport?: boolean;
  /** Auto-refresh interval in milliseconds (default: 3,000ms) */
  intervalMs?: number;
}

const SCAN_SYNC_STORAGE_KEY = "gxc_last_scan_at";
export const SCAN_COMPLETED_EVENT = "gxc:scan-completed";

function formatTimestampIst(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
  intervalMs = 3000,
}: EventOperationsReportsProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>("all");
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("Live");
  const [latestScanBanner, setLatestScanBanner] = useState<string | null>(null);

  const latestQueryRef = useRef<string>("");
  const didMountRef = useRef<boolean>(false);
  const inFlightRef = useRef<boolean>(false);

  const fetchParticipants = useCallback(
    async (searchTerm: string, silent = false) => {
      if (inFlightRef.current && silent) return;
      inFlightRef.current = true;

      if (!silent) setIsSearching(true);
      setError("");

      try {
        const supabase = createClient();
        const trimmed = searchTerm.trim().toLowerCase();

        // Read passes, check-ins, and snack claims directly from DB so live scans are immediate
        const [
          { data: passes, error: passErr },
          { data: attendance, error: attErr },
          { data: snacks, error: snackErr },
          { data: regs },
        ] = await Promise.all([
          supabase
            .from("digital_passes")
            .select(
              "id,registration_id,user_id,application_number,holder_name,college,status,issued_at"
            )
            .order("issued_at", { ascending: false }),
          supabase
            .from("event_attendance")
            .select("registration_id,event_day,checked_in_at"),
          supabase
            .from("snack_distributions")
            .select("registration_id,event_day,distributed_at")
            .order("distributed_at", { ascending: false }),
          supabase.from("registrations").select("id,email,full_name,status"),
        ]);

        if (passErr || attErr || snackErr) {
          throw new Error(
            passErr?.message ||
              attErr?.message ||
              snackErr?.message ||
              "Could not load live scan data."
          );
        }

        const attendanceByReg = new Map<
          string,
          { checked_in_at: string; event_day: number | null }
        >();
        for (const row of attendance ?? []) {
          if (!row.registration_id) continue;
          attendanceByReg.set(String(row.registration_id), {
            checked_in_at: String(row.checked_in_at),
            event_day:
              typeof row.event_day === "number" ? row.event_day : null,
          });
        }

        const snacksByReg = new Map<
          string,
          { count: number; last_snack_at: string | null }
        >();
        for (const row of snacks ?? []) {
          if (!row.registration_id) continue;
          const key = String(row.registration_id);
          const prev = snacksByReg.get(key) ?? {
            count: 0,
            last_snack_at: null,
          };
          const nextTime =
            !prev.last_snack_at ||
            new Date(String(row.distributed_at)).getTime() >
              new Date(prev.last_snack_at).getTime()
              ? String(row.distributed_at)
              : prev.last_snack_at;
          snacksByReg.set(key, {
            count: prev.count + 1,
            last_snack_at: nextTime,
          });
        }

        const regById = new Map<
          string,
          { email: string; full_name: string; status: string }
        >();
        for (const r of regs ?? []) {
          regById.set(String(r.id), {
            email: typeof r.email === "string" ? r.email : "",
            full_name: typeof r.full_name === "string" ? r.full_name : "",
            status: typeof r.status === "string" ? r.status : "confirmed",
          });
        }

        const merged: ParticipantRecord[] = (passes ?? [])
          .filter((p) => {
            const regStatus = regById
              .get(String(p.registration_id))
              ?.status?.toLowerCase();
            return regStatus !== "cancelled";
          })
          .map((p) => {
            const regId = String(p.registration_id);
            const att = attendanceByReg.get(regId);
            const snk = snacksByReg.get(regId);
            const regInfo = regById.get(regId);

            return {
              registration_id: regId,
              participant_name:
                String(p.holder_name ?? "").trim() ||
                regInfo?.full_name ||
                "Unnamed participant",
              application_number: String(p.application_number ?? ""),
              participant_email: regInfo?.email ?? "",
              college: typeof p.college === "string" ? p.college : null,
              checked_in_at: att?.checked_in_at ?? null,
              checked_in_day: att?.event_day ?? null,
              snack_claims: snk?.count ?? 0,
              last_snack_at: snk?.last_snack_at ?? null,
            };
          });

        const filteredByQuery = trimmed
          ? merged.filter(
              (item) =>
                item.participant_name.toLowerCase().includes(trimmed) ||
                item.participant_email.toLowerCase().includes(trimmed) ||
                item.application_number.toLowerCase().includes(trimmed) ||
                (item.college ?? "").toLowerCase().includes(trimmed)
            )
          : merged;

        setParticipants(filteredByQuery.slice(0, 100));
        setHasLoadedOnce(true);
        setLastUpdatedLabel(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          }).format(new Date())
        );
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load participant scan data."
          );
        }
      } finally {
        inFlightRef.current = false;
        setIsSearching(false);
      }
    },
    []
  );

  function handleExportCsv() {
    if (isExporting || participants.length === 0) return;
    setIsExporting(true);
    setError("");

    try {
      const filename = `genxcode-live-scans-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      const header = [
        "Application Number",
        "Participant Name",
        "Email",
        "College",
        "Gate Status",
        "Check-in Time (IST)",
        "Snacks Taken",
        "Last Snack Time (IST)",
      ].join(",");

      const rows = participants.map((p) =>
        [
          p.application_number,
          p.participant_name,
          p.participant_email,
          p.college ?? "",
          p.checked_in_at ? "Checked in" : "Awaiting",
          p.checked_in_at ? formatTimestampIst(p.checked_in_at) : "Awaiting entry",
          p.snack_claims > 0 ? `Yes (${p.snack_claims})` : "No",
          p.last_snack_at ? formatTimestampIst(p.last_snack_at) : "—",
        ]
          .map(escapeCsvCell)
          .join(",")
      );

      const csvBlob = new Blob([`\uFEFF${[header, ...rows].join("\r\n")}`], {
        type: "text/csv;charset=utf-8;",
      });
      triggerBlobDownload(csvBlob, filename);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export event records."
      );
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    latestQueryRef.current = query;

    if (!didMountRef.current) {
      didMountRef.current = true;
      void fetchParticipants("", false);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchParticipants(query, false);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query, fetchParticipants]);

  useEffect(() => {
    const onScanEvent = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      const name =
        typeof detail?.participant_name === "string"
          ? detail.participant_name
          : "Participant";
      const code = typeof detail?.result === "string" ? detail.result : "scan";
      setLatestScanBanner(`${name} · ${code.replaceAll("_", " ")}`);
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

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("operations-live-scans-register")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_attendance" },
        () => void fetchParticipants(latestQueryRef.current, true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "snack_distributions" },
        () => void fetchParticipants(latestQueryRef.current, true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "digital_passes" },
        () => void fetchParticipants(latestQueryRef.current, true)
      )
      .subscribe();

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchParticipants(latestQueryRef.current, true);
      }
    }, intervalMs);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollTimer);
    };
  }, [fetchParticipants, intervalMs]);

  const checkedInCount = useMemo(
    () => participants.filter((p) => Boolean(p.checked_in_at)).length,
    [participants]
  );

  const awaitingCount = useMemo(
    () => Math.max(0, participants.length - checkedInCount),
    [participants.length, checkedInCount]
  );

  const snacksTakenParticipantsCount = useMemo(
    () => participants.filter((p) => (p.snack_claims || 0) > 0).length,
    [participants]
  );

  const totalSnackClaimsCount = useMemo(
    () => participants.reduce((sum, p) => sum + (p.snack_claims || 0), 0),
    [participants]
  );

  const filteredParticipants = useMemo(() => {
    if (statusFilter === "checked_in") {
      return participants.filter((p) => Boolean(p.checked_in_at));
    }
    if (statusFilter === "pending") {
      return participants.filter((p) => !p.checked_in_at);
    }
    if (statusFilter === "snacks_taken") {
      return participants.filter((p) => (p.snack_claims || 0) > 0);
    }
    return participants;
  }, [participants, statusFilter]);

  const isInitialLoading = isSearching && !hasLoadedOnce;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_8px_28px_rgba(27,5,62,0.03)]">
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-6 sm:px-7">
        <div>
          <div className="editorial inline-flex items-center gap-2 text-[15px] italic text-[#6828a2]">
            <span>Live Scan Register</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#eefaf1] px-2 py-0.5 font-mono text-[10px] font-bold not-italic text-[#1b7a37]">
              <Radio size={11} className="animate-pulse" />
              EVERY {Math.max(1, Math.round(intervalMs / 1000))}S
            </span>
          </div>
          <h2 className="editorial mt-0.5 text-2xl font-bold text-[#1b053e] sm:text-3xl">
            Live scans &amp; attendance report
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#5c4f6e]">
            Tracks all pass holders, who has checked in, who is awaiting entry,
            and who has claimed snacks.
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
              disabled={isExporting || participants.length === 0}
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
        {/* Live Counts Summary Strip: All / Checked in / Awaiting / Taken Snacks */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className="rounded-xl border border-[#e3dbd0] bg-[#faf7f2] px-3.5 py-2.5 text-left transition hover:border-[#c7a6f3]"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6d627a]">
              All participants
            </p>
            <p className="editorial mt-0.5 text-2xl font-bold tabular-nums text-[#1b053e]">
              {participants.length}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("checked_in")}
            className="rounded-xl border border-[#bfe6c9] bg-[#eefaf1] px-3.5 py-2.5 text-left transition hover:brightness-98"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b7a37]">
              Checked in
            </p>
            <p className="editorial mt-0.5 text-2xl font-bold tabular-nums text-[#14532d]">
              {checkedInCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className="rounded-xl border border-[#eadff5] bg-[#faf7ff] px-3.5 py-2.5 text-left transition hover:border-[#c7a6f3]"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6828a2]">
              Awaiting entry
            </p>
            <p className="editorial mt-0.5 text-2xl font-bold tabular-nums text-[#3d1173]">
              {awaitingCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("snacks_taken")}
            className="rounded-xl border border-[#f5d0fe] bg-[#fdf4ff] px-3.5 py-2.5 text-left transition hover:border-[#d8b4fe]"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#86198f]">
              Taken snacks
            </p>
            <p className="editorial mt-0.5 text-2xl font-bold tabular-nums text-[#701a75]">
              {snacksTakenParticipantsCount}{" "}
              <span className="font-mono text-xs font-semibold text-[#86198f]">
                ({totalSnackClaimsCount} claims)
              </span>
            </p>
          </button>
        </div>

        {latestScanBanner && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#bfe6c9] bg-[#eefaf1] px-3.5 py-2 text-xs font-semibold text-[#14532d]"
          >
            <span>Latest live scan: {latestScanBanner}</span>
            <button
              type="button"
              onClick={() => setLatestScanBanner(null)}
              className="rounded p-0.5 text-[#1b7a37] hover:bg-[#dcfce7]"
              aria-label="Dismiss scan alert"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Live Search + Filter Tabs */}
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
              placeholder="Search name, email, application number, or college…"
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

          <div
            role="tablist"
            aria-label="Filter by attendance and snack status"
            className="flex shrink-0 items-center gap-4 overflow-x-auto border-b border-[#ebe4dc] px-1 text-xs lg:border-b-0"
          >
            {(
              [
                { key: "all", label: `All (${participants.length})` },
                {
                  key: "checked_in",
                  label: `Checked in (${checkedInCount})`,
                },
                {
                  key: "pending",
                  label: `Awaiting (${awaitingCount})`,
                },
                {
                  key: "snacks_taken",
                  label: `Taken snacks (${snacksTakenParticipantsCount})`,
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
          <table className="w-full min-w-[740px] text-left text-xs">
            <thead className="border-b border-[#ebe4dc] bg-[#faf7f2] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#5e536b]">
              <tr>
                <th className="px-4 py-3.5">Participant</th>
                <th className="whitespace-nowrap px-4 py-3.5">Application</th>
                <th className="whitespace-nowrap px-4 py-3.5">Check-in</th>
                <th className="whitespace-nowrap px-4 py-3.5">Snacks</th>
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
                      <td className="px-4 py-4">
                        <div className="h-3.5 w-24 rounded bg-[#efe8f6]" />
                      </td>
                    </tr>
                  ))
                : filteredParticipants.map((p) => {
                    const isCheckedIn = Boolean(p.checked_in_at);
                    const hasSnacks = p.snack_claims > 0;

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
                            {p.participant_email || p.college || "—"}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-semibold text-[#3d2b54]">
                          {p.application_number || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5">
                          {isCheckedIn ? (
                            <div>
                              <span className="inline-flex rounded-full bg-[#eefaf1] px-2.5 py-0.5 font-semibold text-[#1b7a37]">
                                Checked in
                                {p.checked_in_day
                                  ? ` · Day ${p.checked_in_day}`
                                  : ""}
                              </span>
                              <p className="mt-0.5 font-mono text-[11px] text-[#5c4f6e]">
                                {formatTimestampIst(p.checked_in_at)}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#f4f1f8] px-2.5 py-0.5 font-medium text-[#7a6d8c]">
                              Awaiting entry
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3.5">
                          {hasSnacks ? (
                            <div>
                              <span className="inline-flex rounded-full bg-[#fdf4ff] px-2.5 py-0.5 font-semibold text-[#86198f]">
                                Taken ({p.snack_claims})
                              </span>
                              {p.last_snack_at && (
                                <p className="mt-0.5 font-mono text-[11px] text-[#5c4f6e]">
                                  {formatTimestampIst(p.last_snack_at)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#faf7f2] px-2.5 py-0.5 font-medium text-[#7a6d8c]">
                              Not claimed
                            </span>
                          )}
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
                      ? `No participants match "${query.trim()}".`
                      : "No participants match this filter yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11.5px] text-[#6d627a]">
          Showing up to 100 matching pass holders · Auto-updates every{" "}
          {Math.max(1, Math.round(intervalMs / 1000))}s (last sync{" "}
          <span className="font-mono font-semibold text-[#1b053e]">
            {lastUpdatedLabel}
          </span>
          ). Use{" "}
          <strong className="font-semibold text-[#1b053e]">Export CSV</strong>{" "}
          for the register.
        </p>
      </div>
    </section>
  );
}