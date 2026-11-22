"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  ScanLine,
  Search,
  Utensils,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

type ScanResult = {
  result: string;
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

function normalizePassToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // If QR encodes a URL containing ?token=... or #token=...
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
  const [action, setAction] = useState<"checkin" | "snack">(
    permission === "snacks" ? "snack" : "checkin"
  );
  const [day, setDay] = useState(1);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
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

  const canCheckin =
    permission === "admin" || permission === "checkin" || permission === "both";
  const canSnacks =
    permission === "admin" || permission === "snacks" || permission === "both";

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const processToken = useCallback(
    async (raw: string) => {
      const cleanToken = normalizePassToken(raw);
      if (!cleanToken || busyRef.current) return;

      busyRef.current = true;
      setBusy(true);
      setResult(null);

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
        setResult(
          response.ok
            ? data
            : {
                result: "error",
                error: data.error || "Unable to verify this pass.",
              }
        );

        if (
          response.ok &&
          (data.result === "checked_in" || data.result === "snack_distributed")
        ) {
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
            "checked_in",
            "snack_distributed",
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

  const approved =
    result?.result === "checked_in" || result?.result === "snack_distributed";
  const rejected =
    result?.result === "already_checked_in" ||
    result?.result === "already_distributed" ||
    result?.result === "invalid" ||
    result?.result === "error";

  const decisionBadge =
    result?.result === "checked_in"
      ? "APPROVED · VALID PASS CHECK-IN"
      : result?.result === "snack_distributed"
        ? "APPROVED · FOOD NOT CLAIMED YET"
        : result?.result === "already_distributed"
          ? "REJECTED · FOOD ALREADY CLAIMED"
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
        : result?.result === "already_distributed"
          ? result?.snack_policy === "daily"
            ? "Food/snack has already been claimed on this event day. Rejected."
            : "Food/snack has already been claimed for this event. Rejected."
          : result?.result === "already_checked_in"
            ? "This participant pass has already been checked in."
            : result?.result === "invalid"
              ? "Pass is invalid, revoked, or expired. Ask participant to refresh their pass."
              : "Could not verify pass.");

  return (
    <section className="container-shell py-12 sm:py-16">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="editorial text-4xl font-extrabold tracking-tight text-[#220749] sm:text-5xl">
          Event Operations<span className="text-[#8638cd]">.</span>
        </h1>
        <p className="mt-3 text-[15px] font-medium text-[#76678a]">
          Secure check-in and distribution terminal for GenXCode Tech Fest.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* LEFT PANEL: SCANNER & CONTROLS */}
        <div className="surface-glass-panel flex flex-col overflow-hidden rounded-[2rem] border border-[#eadff5] bg-white/70 p-6 shadow-[0_8px_30px_rgba(34,4,75,0.04)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eadff5]/60 pb-6">
            <div className="flex items-center gap-2 text-[#5f2295]">
              <ShieldCheck size={20} strokeWidth={2.5} />
              <p className="text-sm font-bold uppercase tracking-widest">
                Live Terminal
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#76678a]">
                Event Day
              </span>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="rounded-full border border-[#eadff5] bg-white px-4 py-1.5 text-sm font-bold text-[#220749] outline-none transition-all focus:border-[#8638cd] focus:ring-1 focus:ring-[#8638cd]"
              >
                {Array.from({ length: dayCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Day {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {canCheckin && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setAction("checkin");
                  setResult(null);
                }}
                className={`relative flex flex-col overflow-hidden rounded-[1.25rem] border p-5 text-left transition-all ${
                  action === "checkin"
                    ? "border-[#8638cd] bg-white shadow-md shadow-[#8638cd]/10 ring-1 ring-[#8638cd]"
                    : "border-[#eadff5] bg-white/50 hover:bg-white"
                }`}
              >
                <UserCheck
                  className={`mb-3 ${
                    action === "checkin" ? "text-[#8638cd]" : "text-[#76678a]"
                  }`}
                  size={24}
                />
                <span className="text-[15px] font-bold text-[#220749]">
                  Pass &amp; entry check
                </span>
                <span className="mt-1 text-[13px] font-medium text-[#76678a]">
                  Verify valid pass &amp; approve entry
                </span>
                {action === "checkin" && (
                  <div className="absolute right-0 top-0 h-full w-1 bg-[#8638cd]" />
                )}
              </motion.button>
            )}

            {canSnacks && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setAction("snack");
                  setResult(null);
                }}
                className={`relative flex flex-col overflow-hidden rounded-[1.25rem] border p-5 text-left transition-all ${
                  action === "snack"
                    ? "border-[#8638cd] bg-white shadow-md shadow-[#8638cd]/10 ring-1 ring-[#8638cd]"
                    : "border-[#eadff5] bg-white/50 hover:bg-white"
                }`}
              >
                <Utensils
                  className={`mb-3 ${
                    action === "snack" ? "text-[#8638cd]" : "text-[#76678a]"
                  }`}
                  size={24}
                />
                <span className="text-[15px] font-bold text-[#220749]">
                  Food claim check
                </span>
                <span className="mt-1 text-[13px] font-medium text-[#76678a]">
                  Approve if unclaimed, reject if claimed
                </span>
                {action === "snack" && (
                  <div className="absolute right-0 top-0 h-full w-1 bg-[#8638cd]" />
                )}
              </motion.button>
            )}
          </div>

          <div className="relative mt-8 overflow-hidden rounded-[1.5rem] bg-[#0a0a0a] shadow-inner ring-1 ring-black/5">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`aspect-video w-full object-cover transition-opacity duration-500 ${
                cameraOn ? "opacity-100" : "opacity-0"
              }`}
            />

            <AnimatePresence>
              {!cameraOn && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 flex aspect-video flex-col items-center justify-center gap-3 bg-[#11081f] text-[#d8c5ee]"
                >
                  <ScanLine
                    size={48}
                    strokeWidth={1.5}
                    className="mb-2 opacity-50"
                  />
                  <p className="text-[15px] font-bold tracking-wide">
                    Scanner Offline
                  </p>
                  <p className="text-[13px] font-medium opacity-60">
                    Initialize camera to scan participant passes
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {cameraOn && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                <div className="size-full max-h-[250px] max-w-[250px] rounded-3xl border-2 border-dashed border-white/40" />
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            {!cameraOn ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startCamera}
                className="btn-primary flex items-center gap-2 !px-6 !py-3"
              >
                <Camera size={18} />
                Initialize Scanner
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={stopCamera}
                className="flex items-center gap-2 rounded-full border-2 border-[#eadff5] bg-white px-6 py-2.5 text-[14px] font-bold text-[#76678a] transition-colors hover:border-[#76678a] hover:text-[#220749]"
              >
                <CameraOff size={18} />
                Stop Scanner
              </motion.button>
            )}

            {busy && (
              <span className="flex items-center gap-2 rounded-full bg-[#f4effc] px-4 py-2 text-[13px] font-bold text-[#8638cd]">
                <LoaderCircle className="animate-spin" size={16} />
                Verifying Pass...
              </span>
            )}
          </div>

          {cameraError && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-[13px] font-medium text-red-700">
              {cameraError}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-[#eadff5] bg-[#fcfaff] p-5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#76678a]">
              Manual Override / Fallback
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste GXC-PASS-V1 token..."
                className="min-w-0 flex-1 rounded-xl border border-[#eadff5] bg-white px-5 py-3 text-[14px] font-medium text-[#220749] outline-none transition-all placeholder:text-[#76678a]/60 focus:border-[#8638cd] focus:ring-1 focus:ring-[#8638cd]"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!manualToken.trim() || busy}
                onClick={() => void processToken(manualToken)}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#220749] px-6 py-3 text-[14px] font-bold text-white transition-all disabled:opacity-50 sm:w-auto"
              >
                <Search size={16} />
                Verify
              </motion.button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: RESULTS */}
        <div className="surface-glass-panel flex h-full flex-col overflow-hidden rounded-[2rem] border border-[#eadff5] bg-white/70 p-6 sm:p-8">
          <p className="mb-6 border-b border-[#eadff5]/60 pb-6 text-sm font-bold uppercase tracking-widest text-[#5f2295]">
            Telemetry Data
          </p>

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-1 flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-[#f4effc] text-[#c7a6f3]">
                  <ScanLine size={32} />
                </div>
                <p className="text-[16px] font-bold text-[#220749]">
                  Awaiting Pass
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#76678a]">
                  Scan a participant&apos;s QR code or enter their token manually
                  to verify validity or food claim status.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-1 flex-col"
              >
                <div
                  className={`rounded-2xl p-5 ${
                    approved
                      ? "bg-green-50 text-green-900 ring-1 ring-green-200"
                      : rejected
                        ? "bg-red-50 text-red-900 ring-1 ring-red-200"
                        : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {approved ? (
                      <CheckCircle2
                        size={24}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                    ) : (
                      <CircleAlert
                        size={24}
                        className="mt-0.5 shrink-0 text-red-600"
                      />
                    )}
                    <p className="text-[15px] font-extrabold leading-snug">
                      {decisionBadge}
                    </p>
                  </div>
                  <p className="mt-3 text-[13.5px] font-medium leading-relaxed opacity-85">
                    {decisionDetail}
                  </p>
                </div>

                {result.participant_name && (
                  <div className="mt-8 space-y-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                        Identity
                      </p>
                      <p className="mt-1.5 text-lg font-extrabold text-[#220749]">
                        {result.participant_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                        Registration Number
                      </p>
                      <p className="mt-1.5 font-mono text-[15px] font-bold text-[#5f2295]">
                        {result.application_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#76678a]">
                        Email
                      </p>
                      <p className="mt-1.5 break-all text-[14px] font-medium text-[#76678a]">
                        {result.participant_email}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-8">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setResult(null);
                      setManualToken("");
                    }}
                    className="w-full rounded-xl bg-[#f4effc] py-4 text-[14.5px] font-bold text-[#5f2295] transition-colors hover:bg-[#eadff5]"
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