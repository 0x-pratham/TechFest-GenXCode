"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AdminLiveSyncProps {
  /** Sync window in milliseconds (default: 15,000ms) */
  intervalMs?: number;
}

function isUserTypingInForm(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function AdminLiveSync({ intervalMs = 15000 }: AdminLiveSyncProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasQueuedUpdate, setHasQueuedUpdate] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string>("Just now");
  const lastSyncTimeRef = useRef<number>(Date.now());

  const triggerRefresh = useCallback(
    (force = false) => {
      if (!force && isUserTypingInForm()) {
        setHasQueuedUpdate(true);
        return;
      }

      setHasQueuedUpdate(false);
      setIsSyncing(true);
      router.refresh();
      lastSyncTimeRef.current = Date.now();
      setLastSyncedLabel("Just now");

      window.setTimeout(() => {
        setIsSyncing(false);
      }, 450);
    },
    [router]
  );

  // Flush any queued database update as soon as the organizer leaves a form field
  useEffect(() => {
    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (hasQueuedUpdate && !isUserTypingInForm()) {
          triggerRefresh(true);
        }
      }, 150);
    };

    document.addEventListener("focusout", handleFocusOut);
    return () => document.removeEventListener("focusout", handleFocusOut);
  }, [hasQueuedUpdate, triggerRefresh]);

  // Supabase Realtime channel + periodic window fallback
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-control-room-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_schedule_settings" },
        () => triggerRefresh(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_details" },
        () => triggerRefresh(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "problem_statements" },
        () => triggerRefresh(false)
      )
      .subscribe();

    // Windowed background poll while tab is visible
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        triggerRefresh(false);
      }
    }, intervalMs);

    // Human-readable relative timestamp ticker
    const ageInterval = window.setInterval(() => {
      const elapsedSec = Math.floor(
        (Date.now() - lastSyncTimeRef.current) / 1000
      );
      if (elapsedSec < 5) {
        setLastSyncedLabel("Just now");
      } else if (elapsedSec < 60) {
        setLastSyncedLabel(`${elapsedSec}s ago`);
      } else {
        setLastSyncedLabel(`${Math.floor(elapsedSec / 60)}m ago`);
      }
    }, 5000);

    // Sync immediately when returning to the tab
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastSyncTimeRef.current >= intervalMs
      ) {
        triggerRefresh(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollInterval);
      window.clearInterval(ageInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, triggerRefresh]);

  return (
    <div className="inline-flex items-center gap-3 text-xs text-[#6d627a]">
      <span>
        {hasQueuedUpdate
          ? "Update ready · finishes when you leave field"
          : `Live window (${Math.round(intervalMs / 1000)}s) · Synced ${lastSyncedLabel}`}
      </span>

      <button
        type="button"
        onClick={() => triggerRefresh(true)}
        disabled={isSyncing}
        className="inline-flex items-center gap-1 font-semibold text-[#6828a2] transition-colors hover:text-[#1b053e] disabled:opacity-50"
      >
        <RefreshCw
          size={12}
          className={isSyncing ? "animate-spin" : ""}
        />
        <span>Sync now</span>
      </button>
    </div>
  );
}