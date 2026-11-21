"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderGit2,
  LayoutDashboard,
  Menu,
  SlidersHorizontal,
  X,
} from "lucide-react";

const SCAN_SYNC_STORAGE_KEY = "gxc_last_scan_at";
const SCAN_COMPLETED_EVENT = "gxc:scan-completed";

export function AdminMobileNav({ signOutSlot }: { signOutSlot: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className="inline-flex items-center justify-center rounded-full border border-[#e3dbd0] bg-white p-2 text-[#1b053e] shadow-sm transition-colors hover:bg-[#f4effc]"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div
          role="menu"
          className="fixed inset-x-4 top-20 z-50 flex flex-col gap-1.5 rounded-2xl border border-[#e3dbd0] bg-[#fdfcfa] p-3 shadow-[0_14px_36px_rgba(27,5,62,0.14)]"
        >
          <Link
            href="/admin/operations"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1b053e] transition-colors hover:bg-[#f2eafb]"
          >
            <SlidersHorizontal size={15} className="text-[#6828a2]" />
            <span>Operations</span>
          </Link>

          <Link
            href="/admin/submissions"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1b053e] transition-colors hover:bg-[#f2eafb]"
          >
            <FolderGit2 size={15} className="text-[#6828a2]" />
            <span>Submissions</span>
          </Link>

          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1b053e] transition-colors hover:bg-[#f2eafb]"
          >
            <LayoutDashboard size={15} className="text-[#6828a2]" />
            <span>Dashboard</span>
          </Link>

          <div className="mt-1 border-t border-[#ebe4dc] pt-2">{signOutSlot}</div>
        </div>
      )}
    </div>
  );
}

export function AdminLiveSync() {
  const router = useRouter();

  useEffect(() => {
    const refreshView = () => {
      router.refresh();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === SCAN_SYNC_STORAGE_KEY) {
        refreshView();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshView();
      }
    };

    window.addEventListener(SCAN_COMPLETED_EVENT, refreshView);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener(SCAN_COMPLETED_EVENT, refreshView);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}