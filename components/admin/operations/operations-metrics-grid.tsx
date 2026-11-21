"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface OperationsMetricsGridProps {
  totalRegistered?: number;
  checkedIn?: number;
  snacksDistributed?: number;
  pendingCheckin?: number;
  /** Optional fallback sync interval in ms (default: 30,000ms) */
  intervalMs?: number;
}

interface MetricsSnapshot {
  totalRegistered: number;
  checkedIn: number;
  snacksDistributed: number;
  pendingCheckin: number;
}

export function OperationsMetricsGrid({
  totalRegistered = 0,
  checkedIn = 0,
  snacksDistributed = 0,
  pendingCheckin = 0,
  intervalMs = 30000,
}: OperationsMetricsGridProps) {
  const [counts, setCounts] = useState<MetricsSnapshot>({
    totalRegistered,
    checkedIn,
    snacksDistributed,
    pendingCheckin,
  });

  const inFlightRef = useRef(false);

  // Instant 0ms sync whenever parent OperationsLiveWorkspace receives fresh data
  useEffect(() => {
    setCounts({
      totalRegistered,
      checkedIn,
      snacksDistributed,
      pendingCheckin,
    });
  }, [totalRegistered, checkedIn, snacksDistributed, pendingCheckin]);

  const loadMetricsFromDatabase = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const response = await fetch("/api/operations/summary", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const total = Number(data.total_registered ?? 0);
        const checked = Number(data.checked_in ?? 0);
        const snacks = Number(data.snacks_distributed ?? 0);
        const pending =
          typeof data.pending_checkin === "number"
            ? data.pending_checkin
            : Math.max(0, total - checked);

        setCounts({
          totalRegistered: total,
          checkedIn: checked,
          snacksDistributed: snacks,
          pendingCheckin: pending,
        });
        return;
      }

      // Direct registrations table fallback if API is unreachable
      const supabase = createClient();
      const { data: rows, error: tableError } = await supabase
        .from("registrations")
        .select("*");

      if (!tableError && Array.isArray(rows)) {
        const total = rows.length;
        const checked = rows.filter(
          (r: Record<string, unknown>) =>
            r.checked_in === true || Boolean(r.checked_in_at)
        ).length;
        const snacks = rows.reduce((sum: number, r: Record<string, unknown>) => {
          const val = Number(
            r.snack_claims ??
              r.snacks_count ??
              r.snack_count ??
              (r.snack_claimed === true ? 1 : 0)
          );
          return sum + (Number.isFinite(val) ? val : 0);
        }, 0);

        setCounts({
          totalRegistered: total,
          checkedIn: checked,
          snacksDistributed: snacks,
          pendingCheckin: Math.max(0, total - checked),
        });
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadMetricsFromDatabase();
      }
    }, intervalMs);

    return () => {
      window.clearInterval(pollTimer);
    };
  }, [intervalMs, loadMetricsFromDatabase]);

  const metrics = [
    {
      label: "Confirmed passes",
      value: counts.totalRegistered,
      accent: "text-[#1b053e]",
    },
    {
      label: "Checked in",
      value: counts.checkedIn,
      accent: "text-[#1b7a37]",
    },
    {
      label: "Snacks served",
      value: counts.snacksDistributed,
      accent: "text-[#6828a2]",
    },
    {
      label: "Awaiting entry",
      value: counts.pendingCheckin,
      accent: "text-[#5e536b]",
    },
  ];

  return (
    <dl className="mt-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4">
      {metrics.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[#e3dbd0] bg-white p-4 shadow-[0_6px_22px_rgba(27,5,62,0.025)] sm:p-5"
        >
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d627a]">
            {item.label}
          </dt>
          <dd
            className={`editorial mt-2 text-3xl font-bold tabular-nums sm:text-4xl ${item.accent}`}
          >
            {item.value.toLocaleString("en-IN")}
          </dd>
        </div>
      ))}
    </dl>
  );
}