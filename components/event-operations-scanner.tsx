"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  CircleAlert,
  Coffee,
  Droplets,
  LoaderCircle,
  ScanLine,
  Search,
  Utensils,
  UserCheck,
  ShieldCheck,
  X,
} from "lucide-react";

type ScanAction = "checkin" | "snack" | "tea" | "water";

type ScanResult = {
  result: string;
  action?: ScanAction | string;
  participant_name?: string;
  application_number?: string;
  participant_email?: string;
  occurred_at?: string;
  snack_policy?: string;
  error?: string;
};

type Props = {
  dayCount: number;
  permission: string;
};

const APPROVED_RESULTS = new Set([
  "checked_in",
  "snack_distributed",
  "tea_distributed",
  "water_distributed",
]);

function normalizePassToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const paramToken =
        url.searchParams.get("token") ||
        url.searchParams.get("pass") ||
        url.searchParams.get("code");
      if (paramToken) return paramToken.trim();
    }
  } catch {
    // Not a URL; treat as raw token
  }

  return trimmed;
}

export function EventOperationsScanner({ dayCount, permission }: Props) {
  const canCheckin =
    permission === "admin" || permission === "checkin" || permission === "both";
  const canHospitality =
    permission === "admin" || permission === "snacks" || permission === "both";

  const [action, setAction] = useState<ScanAction>(
    !canCheckin && canHospitality ? "snack" : "checkin"
  );
  const [day, setDay] = useState(1);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{
    detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
  } | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!popupOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopupOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [popupOpen]);

  const dismissPopupAndReset = useCallback(() => {
    setPopupOpen(false);
    setResult(null);
    setManualToken("");
  }, []);

  const processToken = useCallback(
    async (raw: string) => {
      const cleanToken = normalizePassToken(raw);
      if (!cleanToken || busyRef.current) return;

      busyRef.current = true;
      setBusy(true);
      setResult(null);
      setPopupOpen(false);

      try {
        const response = await fetch("/api/event-operations/scan", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: cleanToken,
            action,
            eventDay: day,
          }),
        });

        const data = (await response.json()) as ScanResult;
        const nextResult: ScanResult = response.ok
          ? data
          : {
              result: "error",
              error: data.error || "Unable to verify this pass.",
            };

        setResult(nextResult);
        setPopupOpen(true);

        if (response.ok && APPROVED_RESULTS.has(data.result)) {
          try {
            window.localStorage.setItem("gxc_last_scan_at", String(Date.now()));
          } catch {
            // Ignore storage quota/private-mode errors
          }
          window.dispatchEvent(
            new CustomEvent("gxc:scan-completed", { detail: data })
          );
        }

        if (
          response.ok &&
          [
            ...APPROVED_RESULTS,
            "already_checked_in",
            "already_distributed",
            "invalid",
          ].includes(data.result)
        ) {
          stopCamera();
        }
      } catch {
        setResult({
          result: "error",
          error: "Network error. Check your connection and try again.",
        });
        setPopupOpen(true);
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [action, day, stopCamera]
  );

  const startCamera = async () => {
    setCameraError("");
    setResult(null);
    setPopupOpen(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is unavailable. Use manual token entry below."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const BarcodeDetectorConstructor = (
        window as unknown as {
          BarcodeDetector?: new (options?: { formats: string[] }) => {
            detect: (
              source: HTMLVideoElement
            ) => Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector;

      if (!BarcodeDetectorConstructor) {
        setCameraError(
          "This browser does not support QR scanning. Use manual token entry instead."
        );
        stopCamera();
        return;
      }
      detectorRef.current = new BarcodeDetectorConstructor({
        formats: ["qr_code"],
      });
      setCameraOn(true);

      const scanFrame = async () => {
        if (!videoRef.current || !detectorRef.current || busyRef.current) {
          frameRef.current = requestAnimationFrame(scanFrame);
          return;
        }
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            await processToken(codes[0].rawValue);
            return;
          }
        } catch {
          /* Camera frame may not be ready yet. */
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setCameraError(
        "Camera permission was denied or the camera is unavailable. Allow camera access or use manual token entry."
      );
      stopCamera();
    }
  };

  const approved = Boolean(result && APPROVED_RESULTS.has(result.result));
  const rejected = Boolean(
    result &&
      ["already_checked_in", "already_distributed", "invalid", "error"].includes(
        result.result
      )
  );

  const activeModeLabel =
    action === "snack"
      ? "Food Claim"
      : action === "tea"
        ? "Tea Claim"
        : action === "water"
          ? "Water Bottle"
          : "Gate Check-in";

  const decisionBadge =
    result?.result === "checked_in"
      ? "APPROVED · VALID PASS CHECK-IN"
      : result?.result === "snack_distributed"
        ? "APPROVED · FOOD NOT CLAIMED YET"
        : result?.result === "tea_distributed"
          ? "APPROVED · TEA CLAIM RECORDED"
          : result?.result === "water_distributed"
            ? "APPROVED · WATER BOTTLE RECORDED"
            : result?.result === "already_distributed"
              ? result?.action === "tea"
                ? "REJECTED · TEA ALREADY CLAIMED"
                : result?.action === "water"
                  ? "REJECTED · WATER BOTTLE ALREADY CLAIMED"
                  : "REJECTED · FOOD ALREADY CLAIMED"
              : result?.result === "already_checked_in"
                ? "REJECTED · ALREADY CHECKED IN"
                : result?.result === "invalid"
                  ? "REJECTED · INVALID OR EXPIRED PASS"
                  : "REJECTED · VERIFICATION FAILED";

  const decisionDetail =
    result?.error ||
    (result?.result === "checked_in"
      ? "Participant pass is valid and entry has been approved."
      : result?.result === "snack_distributed"
        ? "No prior food claim found. Food distribution is approved and logged."
        : result?.result === "tea_distributed"
          ? "Tea distribution approved and logged for this pass."
          : result?.result === "water_distributed"
            ? "Water bottle distribution approved and logged for this pass."
            : result?.result === "already_distributed"
              ? result?.action === "tea"
                ? "Tea has already been claimed on this event day. Rejected."
                : result?.action === "water"
                  ? "Water bottle has already been claimed on this event day. Rejected."
                  : result?.snack_policy === "daily"
                    ? "Food/snack has already been claimed on this event day. Rejected."
                    : "Food/snack has already been claimed for this event. Rejected."
              : result?.result === "already_checked_in"
                ? "This participant pass has already been checked in."
                : result?.result === "invalid"
                  ? "Pass is invalid, revoked, or expired. Ask participant to refresh their pass."
                  : "Could not verify pass.");

  const scanModes: Array<{
    id: ScanAction;
    title: string;
    subtitle: string;
    enabled: boolean;
    Icon: typeof UserCheck;
  }> = [
    {
      id: "checkin",
      title: "Pass & entry check",
      subtitle: "Verify pass & approve entry",
      enabled: canCheckin,
      Icon: UserCheck,
    },
    {
      id: "snack",
      title: "Food claim check",
      subtitle: "Check & log food claim",
      enabled: canHospitality,
      Icon: Utensils,
    },
    {
      id: "tea",
      title: "Tea",
      subtitle: "Log tea for event day",
      enabled: canHospitality,
      Icon: Coffee,
    },
    {
      id: "water",
      title: "Water Bottles",
      subtitle: "Log water for event day",
      enabled: canHospitality,
      Icon: Droplets,
    },
  ];

  return (
    <section className="min-w-0 py-4 sm:py-8">
      {/* Scan Result Pop-Up Modal */}
      <AnimatePresence>
        {popupOpen && result && (
          <motion.div
            key="scan-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Scan verification result"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#120424]/70 p-3.5 backdrop-blur-xs sm:p-5"
            onClick={() => setPopupOpen(false)}
          >
            <motion.div
              key="scan-popup-card"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_24px_64px_rgba(18,4,36,0.3)] sm:rounded-3xl"
            >
              <div
                className={`flex items-start justify-between gap-3 border-b p-4 sm:p-6 ${
                  approved
                    ? "border-green-200 bg-green-50 text-green-950"
                    : "border-red-200 bg-red-50 text-red-950"
                }`}
              >
                <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                  {approved ? (
                    <CheckCircle2
                      size={24}
                      className="mt-0.5 shrink-0 text-green-600 sm:size-7"
                    />
                  ) : (
                    <CircleAlert
                      size={24}
                      className="mt-0.5 shrink-0 text-red-600 sm:size-7"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-75">
                      Day {day} · {activeModeLabel}
                    </p>
                    <h2 className="mt-1 text-sm font-extrabold leading-snug sm:text-lg">
                      {decisionBadge}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPopupOpen(false)}
                  aria-label="Close pop-up"
                  className="shrink-0 rounded-lg p-1.5 opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto p-4 sm:p-6">
                <p className="text-[13px] font-medium leading-relaxed text-[#3d2b54] sm:text-sm">
                  {decisionDetail}
                </p>

                {result.participant_name && (
                  <div className="mt-4 space-y-2.5 rounded-2xl border border-[#ebe4dc] bg-[#faf7f2] p-3.5 sm:mt-5 sm:space-y-3 sm:p-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                        Participant
                      </p>
                      <p className="mt-0.5 break-words text-sm font-extrabold text-[#220749] sm:text-base">
                        {result.participant_name}
                      </p>
                    </div>

                    {result.application_number && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                          Pass / Application ID
                        </p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-[#5f2295] sm:text-sm">
                          {result.application_number}
                        </p>
                      </div>
                    )}

                    {result.participant_email && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                          Email
                        </p>
                        <p className="mt-0.5 break-all text-xs font-medium text-[#5c4f6e]">
                          {result.participant_email}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPopupOpen(false)}
                    className="rounded-xl border border-[#e3dbd0] bg-white px-4 py-3 text-xs font-bold text-[#5c4f6e] transition-colors hover:bg-[#faf7f2] hover:text-[#1b053e] sm:w-auto"
                  >
                    Keep Details
                  </button>
                  <button
                    type="button"
                    onClick={dismissPopupAndReset}
                    className="btn-primary flex-1 rounded-xl py-3 text-center text-xs font-bold sm:text-sm"
                  >
                    Scan Next Pass
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Heading */}
      <div className="mb-5 text-center sm:mb-7 sm:text-left">
        <h2 className="editorial text-2xl font-extrabold tracking-tight text-[#220749] sm:text-4xl">
          Pass Scanner<span className="text-[#8638cd]">.</span>
        </h2>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#76678a] sm:text-[14.5px]">
          Scan passes for check-in, food, tea, or water bottles with instant
          pop-up feedback.
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        {/* LEFT PANEL: SCANNER & CONTROLS */}
        <div className="surface-glass-panel flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#eadff5] bg-white/80 p-4 shadow-[0_8px_30px_rgba(34,4,75,0.04)] sm:rounded-[2rem] sm:p-7">
          {/* Terminal Bar + Day Selector */}
          <div className="flex items-center justify-between gap-3 border-b border-[#eadff5]/70 pb-4 sm:pb-5">
            <div className="flex min-w-0 items-center gap-2 text-[#5f2295]">
              <ShieldCheck size={18} strokeWidth={2.5} className="shrink-0" />
              <p className="truncate text-xs font-bold uppercase tracking-wider sm:text-sm sm:tracking-widest">
                Live Terminal
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#76678a]">
                Day
              </span>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                aria-label="Select event day"
                className="rounded-full border border-[#eadff5] bg-white px-3 py-1.5 text-xs font-bold text-[#220749] outline-none transition-all focus:border-[#8638cd] focus:ring-1 focus:ring-[#8638cd] sm:px-4 sm:text-sm"
              >
                {Array.from({ length: dayCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Day {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Scan Action Modes (2x2 on mobile and desktop) */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4">
            {scanModes
              .filter((mode) => mode.enabled)
              .map(({ id, title, subtitle, Icon }) => {
                const isSelected = action === id;
                return (
                  <motion.button
                    key={id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setAction(id);
                      setResult(null);
                      setPopupOpen(false);
                    }}
                    className={`relative flex min-w-0 flex-col overflow-hidden rounded-xl border p-3.5 text-left transition-all sm:rounded-[1.25rem] sm:p-5 ${
                      isSelected
                        ? "border-[#8638cd] bg-white shadow-md shadow-[#8638cd]/10 ring-1 ring-[#8638cd]"
                        : "border-[#eadff5] bg-white/60 hover:bg-white"
                    }`}
                  >
                    <Icon
                      className={`mb-2 shrink-0 sm:mb-3 ${
                        isSelected ? "text-[#8638cd]" : "text-[#76678a]"
                      }`}
                      size={20}
                    />
                    <span className="truncate text-xs font-bold text-[#220749] sm:text-[15px]">
                      {title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-[#76678a] sm:mt-1 sm:text-[13px]">
                      {subtitle}
                    </span>
                    {isSelected && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-[#8638cd] sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-full sm:w-1" />
                    )}
                  </motion.button>
                );
              })}
          </div>

          {/* Camera Viewport */}
          <div className="relative mt-5 overflow-hidden rounded-2xl bg-[#0a0a0a] shadow-inner ring-1 ring-black/5 sm:mt-7">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`aspect-[4/3] w-full object-cover transition-opacity duration-300 sm:aspect-video ${
                cameraOn ? "opacity-100" : "opacity-0"
              }`}
            />

            <AnimatePresence>
              {!cameraOn && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#11081f] px-4 text-center text-[#d8c5ee]"
                >
                  <ScanLine
                    size={36}
                    strokeWidth={1.5}
                    className="opacity-55 sm:size-11"
                  />
                  <p className="text-sm font-bold tracking-wide sm:text-[15px]">
                    Scanner Offline
                  </p>
                  <p className="max-w-xs text-xs font-medium opacity-65 sm:text-[13px]">
                    Tap Initialize Scanner to scan participant QR passes
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {cameraOn && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="size-44 rounded-2xl border-2 border-dashed border-white/50 sm:size-56 sm:rounded-3xl" />
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 sm:mt-6 sm:gap-4">
            {!cameraOn ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={startCamera}
                className="btn-primary flex w-full items-center justify-center gap-2 !px-5 !py-3 text-xs sm:w-auto sm:!px-6 sm:text-sm"
              >
                <Camera size={17} />
                <span>Initialize Scanner</span>
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={stopCamera}
                className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#eadff5] bg-white px-5 py-2.5 text-xs font-bold text-[#76678a] transition-colors hover:border-[#76678a] hover:text-[#220749] sm:w-auto sm:px-6 sm:text-sm"
              >
                <CameraOff size={17} />
                <span>Stop Scanner</span>
              </motion.button>
            )}

            {busy && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f4effc] px-3.5 py-2 text-xs font-bold text-[#8638cd]">
                <LoaderCircle className="animate-spin" size={15} />
                <span>Verifying Pass...</span>
              </span>
            )}
          </div>

          {cameraError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              {cameraError}
            </div>
          )}

          {/* Manual Token Fallback */}
          <div className="mt-5 rounded-2xl border border-[#eadff5] bg-[#fcfaff] p-4 sm:mt-7 sm:p-5">
            <label
              htmlFor="manual-pass-token"
              className="text-[11px] font-bold uppercase tracking-widest text-[#76678a]"
            >
              Manual Override / Fallback
            </label>
            <div className="mt-2.5 flex flex-col gap-2.5 sm:mt-3 sm:flex-row sm:gap-3">
              <input
                id="manual-pass-token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualToken.trim() && !busy) {
                    e.preventDefault();
                    void processToken(manualToken);
                  }
                }}
                placeholder="Paste GXC-PASS-V1 token..."
                className="min-w-0 flex-1 rounded-xl border border-[#eadff5] bg-white px-4 py-2.5 text-xs font-medium text-[#220749] outline-none transition-all placeholder:text-[#76678a]/60 focus:border-[#8638cd] focus:ring-1 focus:ring-[#8638cd] sm:px-5 sm:py-3 sm:text-sm"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={!manualToken.trim() || busy}
                onClick={() => void processToken(manualToken)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#220749] px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
              >
                <Search size={15} />
                <span>Verify</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: TELEMETRY RESULTS */}
        <div className="surface-glass-panel flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#eadff5] bg-white/80 p-4 shadow-[0_8px_30px_rgba(34,4,75,0.04)] sm:rounded-[2rem] sm:p-7">
          <p className="mb-4 border-b border-[#eadff5]/70 pb-4 text-xs font-bold uppercase tracking-wider text-[#5f2295] sm:mb-6 sm:pb-5 sm:text-sm sm:tracking-widest">
            Telemetry Data
          </p>

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-1 flex-col items-center justify-center py-8 text-center sm:py-12"
              >
                <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-[#f4effc] text-[#c7a6f3] sm:mb-4 sm:size-20">
                  <ScanLine size={28} className="sm:size-8" />
                </div>
                <p className="text-sm font-bold text-[#220749] sm:text-base">
                  Awaiting Pass
                </p>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[#76678a] sm:text-sm">
                  Scan a participant&apos;s QR code or enter a token manually to
                  verify validity or claim status.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-1 flex-col"
              >
                <div
                  className={`rounded-2xl p-4 sm:p-5 ${
                    approved
                      ? "bg-green-50 text-green-900 ring-1 ring-green-200"
                      : rejected
                        ? "bg-red-50 text-red-900 ring-1 ring-red-200"
                        : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    {approved ? (
                      <CheckCircle2
                        size={22}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                    ) : (
                      <CircleAlert
                        size={22}
                        className="mt-0.5 shrink-0 text-red-600"
                      />
                    )}
                    <p className="text-xs font-extrabold leading-snug sm:text-[15px]">
                      {decisionBadge}
                    </p>
                  </div>
                  <p className="mt-2.5 text-xs font-medium leading-relaxed opacity-85 sm:mt-3 sm:text-[13.5px]">
                    {decisionDetail}
                  </p>
                </div>

                {result.participant_name && (
                  <div className="mt-5 space-y-4 sm:mt-7 sm:space-y-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                        Identity
                      </p>
                      <p className="mt-1 break-words text-base font-extrabold text-[#220749] sm:text-lg">
                        {result.participant_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                        Registration Number
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold text-[#5f2295] sm:text-[15px]">
                        {result.application_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                        Email
                      </p>
                      <p className="mt-1 break-all text-xs font-medium text-[#76678a] sm:text-sm">
                        {result.participant_email}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2.5 pt-2 sm:mt-auto sm:pt-8">
                  <button
                    type="button"
                    onClick={() => setPopupOpen(true)}
                    className="w-full rounded-xl border border-[#dfcdf5] bg-white py-2.5 text-xs font-bold text-[#5f2295] transition-colors hover:bg-[#faf7ff] sm:py-3"
                  >
                    Reopen Pop-Up
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={dismissPopupAndReset}
                    className="w-full rounded-xl bg-[#f4effc] py-3.5 text-xs font-bold text-[#5f2295] transition-colors hover:bg-[#eadff5] sm:py-4 sm:text-[14.5px]"
                  >
                    Clear &amp; Scan Next
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}