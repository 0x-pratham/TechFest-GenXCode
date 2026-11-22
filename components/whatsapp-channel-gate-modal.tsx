"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Lock,
  MessageCircle,
} from "lucide-react";

interface WhatsAppChannelGateModalProps {
  url: string | null;
  storageKeySuffix: string;
}

export function WhatsAppChannelGateModal({
  url,
  storageKeySuffix,
}: WhatsAppChannelGateModalProps) {
  const cleanUrl = url?.trim() ?? "";
  const storageKey = cleanUrl
    ? `gxc_wa_channel_joined:${storageKeySuffix}:${cleanUrl}`
    : "";

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (!storageKey || typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  const [hasClickedOpen, setHasClickedOpen] = useState<boolean>(false);
  const autoOpenedRef = useRef(false);

  const isOpen = Boolean(cleanUrl) && !dismissed;

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const popup = window.open(cleanUrl, "_blank", "noopener,noreferrer");
      if (popup) {
        queueMicrotask(() => setHasClickedOpen(true));
      }
    }

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, cleanUrl]);

  if (!isOpen) return null;

  function handleOpenChannel() {
    setHasClickedOpen(true);
    window.open(cleanUrl, "_blank", "noopener,noreferrer");
  }

  function handleConfirmJoined() {
    if (!hasClickedOpen) return;
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore private-mode storage restrictions
    }
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-channel-gate-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#120424]/75 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#e3dbd0] bg-white shadow-[0_24px_64px_rgba(18,4,36,0.32)]">
        <div
          aria-hidden="true"
          className="h-1.5 w-full bg-gradient-to-r from-[#168a45] via-[#22c55e] to-[#168a45]"
        />

        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfe6c9] bg-[#eefaf1] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#168a45]">
              <MessageCircle size={13} />
              <span>Mandatory Step</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6d627a]">
              <Lock size={12} />
              <span>Required to continue</span>
            </span>
          </div>

          <h2
            id="wa-channel-gate-title"
            className="editorial mt-4 text-2xl font-bold leading-snug text-[#1b053e] sm:text-[1.7rem]"
          >
            Join the official GenXCode WhatsApp Channel
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-[#524661]">
            All live schedule updates, problem statement announcements, hall
            allocations, and judging calls are posted in our official WhatsApp
            Channel. Join it now to unlock your dashboard.
          </p>

          <div className="mt-6 space-y-3">
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenChannel}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#168a45] px-5 py-3.5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(22,138,69,0.25)] transition-all hover:bg-[#13753b] active:scale-[0.99]"
            >
              <MessageCircle size={17} />
              <span>1. Open &amp; Join WhatsApp Channel</span>
              <ExternalLink size={15} />
            </a>

            <button
              type="button"
              disabled={!hasClickedOpen}
              onClick={handleConfirmJoined}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#dfcdf5] bg-[#faf7ff] px-5 py-3 text-xs font-bold text-[#220749] transition-all hover:border-[#8638cd] hover:bg-[#f2eafb] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
            >
              <CheckCircle2 size={16} className="text-[#168a45]" />
              <span>2. I&apos;ve Joined — Unlock Dashboard</span>
            </button>
          </div>

          {!hasClickedOpen && (
            <p className="mt-3 text-center text-[11.5px] text-[#76678a]">
              Tap <strong className="text-[#1b053e]">Open &amp; Join WhatsApp Channel</strong> first to enable the unlock button.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}