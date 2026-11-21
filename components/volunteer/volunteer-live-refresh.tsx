"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SCAN_SYNC_STORAGE_KEY = "gxc_last_scan_at";
const SCAN_COMPLETED_EVENT = "gxc:scan-completed";

export function VolunteerLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const triggerRefresh = () => {
      router.refresh();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === SCAN_SYNC_STORAGE_KEY) {
        triggerRefresh();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    };

    window.addEventListener(SCAN_COMPLETED_EVENT, triggerRefresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener(SCAN_COMPLETED_EVENT, triggerRefresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}