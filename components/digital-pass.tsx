"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCw,
  ShieldCheck,
} from "lucide-react";

interface DigitalPassProps {
  fullName: string;
  applicationNumber: string;
  college?: string | null;
  branch?: string | null;
  studyYear?: string | null;
  city?: string | null;
}

const PASS_ACCESS_LIST = [
  "Main hackathon arena & pitching floor",
  "Three technical workshop tracks",
  "Morning breakfast & evening tea",
  "PromptWars live qualifier rounds",
  "Official certificate & participant kit",
];

const DEFAULT_TTL_SECONDS = 30;

export function DigitalPass({
  fullName,
  applicationNumber,
  college,
  branch,
  studyYear,
  city,
}: DigitalPassProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [ttlSeconds, setTtlSeconds] = useState<number>(DEFAULT_TTL_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState<number>(DEFAULT_TTL_SECONDS);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isObscured, setIsObscured] = useState<boolean>(false);
  const [tokenUnavailable, setTokenUnavailable] = useState<boolean>(false);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const expiresAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  const toggleFullScreen = useCallback(async () => {
    if (!isFullScreen) {
      setIsFlipped(false);
      setIsFullScreen(true);
      try {
        if (
          stageRef.current &&
          typeof stageRef.current.requestFullscreen === "function" &&
          !document.fullscreenElement
        ) {
          await stageRef.current.requestFullscreen();
        }
      } catch {
        // Fallback overlay handles iOS Safari / restricted webviews seamlessly
      }
    } else {
      setIsFullScreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore if already exited
      }
    }
  }, [isFullScreen]);

  // Sync state if user exits native fullscreen via browser gesture or Esc
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullScreen]);

  // Lock background page scroll while in full-screen overlay
  useEffect(() => {
    if (!isFullScreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullScreen]);

  const fetchLiveQr = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsRefreshing(true);

    try {
      const res = await fetch("/api/pass/token", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" && data.error.trim().length > 0
            ? data.error
            : `Unable to load pass (${res.status})`
        );
      }

      const serverDataUrl: unknown = data.qrDataUrl || data.qrUrl;
      const rawToken: unknown = data.token || data.qrToken || data.payload;

      if (typeof serverDataUrl === "string" && serverDataUrl.length > 0) {
        setQrSrc(serverDataUrl);
      } else if (typeof rawToken === "string" && rawToken.trim().length > 0) {
        setQrSrc(
          `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&color=1d1a18&bgcolor=ffffff&data=${encodeURIComponent(rawToken)}`
        );
      } else {
        throw new Error("Empty pass token");
      }

      const validSeconds =
        typeof data.expiresIn === "number" && data.expiresIn > 0
          ? Math.round(data.expiresIn)
          : DEFAULT_TTL_SECONDS;

      setTtlSeconds(validSeconds);
      setSecondsLeft(validSeconds);
      expiresAtRef.current = Date.now() + validSeconds * 1000;
      setTokenUnavailable(false);
      setErrorReason(null);
    } catch (err) {
      setQrSrc(null);
      setSecondsLeft(0);
      expiresAtRef.current = 0;
      setTokenUnavailable(true);
      setErrorReason(
        err instanceof Error ? err.message : "Tap refresh to load code"
      );
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchLiveQr();
    });

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setIsObscured(true);
      } else {
        setIsObscured(false);
        if (Date.now() >= expiresAtRef.current - 1500) {
          void fetchLiveQr();
        }
      }
    };

    const handleBlur = () => setIsObscured(true);
    const handleFocus = () => {
      setIsObscured(false);
      if (Date.now() >= expiresAtRef.current - 1500) {
        void fetchLiveQr();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchLiveQr]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!expiresAtRef.current) return;
      const remainingMs = expiresAtRef.current - Date.now();
      if (remainingMs <= 0) {
        setSecondsLeft(0);
        setQrSrc(null);
        void fetchLiveQr();
      } else {
        setSecondsLeft(Math.ceil(remainingMs / 1000));
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [fetchLiveQr]);

  const progressPercent =
    tokenUnavailable || secondsLeft <= 0
      ? 0
      : Math.max(0, Math.min(100, (secondsLeft / Math.max(ttlSeconds, 1)) * 100));
  const isExpiringSoon = secondsLeft > 0 && secondsLeft <= 6;

  const academicLine = [branch?.trim(), studyYear?.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      ref={stageRef}
      className={
        isFullScreen
          ? "fixed inset-0 z-[100] flex min-h-dvh w-full flex-col items-center justify-center overflow-y-auto bg-[#120424]/95 px-4 py-6 backdrop-blur-xl"
          : "mx-auto flex w-full max-w-[344px] flex-col items-center sm:max-w-[376px]"
      }
    >
      {/* Top Bar in Full-Screen Gate Mode */}
      {isFullScreen && (
        <div className="mb-3 flex w-full max-w-[400px] items-center justify-between text-xs text-white/80">
          <span className="font-medium tracking-wide">
            Gate Scan Mode · Keep screen bright
          </span>
          <button
            type="button"
            onClick={toggleFullScreen}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span>Exit Full Screen</span>
          </button>
        </div>
      )}

      <div
        onClick={() => setIsFlipped((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-label={
          isFlipped
            ? "Show front of pass with entry QR"
            : "Flip pass to check access details"
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
        style={{ perspective: 1300 }}
        className={`w-full cursor-pointer select-none focus:outline-none ${
          isFullScreen ? "max-w-[400px]" : ""
        }`}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.85 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative grid w-full will-change-transform"
        >
          {/* ================= FRONT FACE ================= */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: isFlipped ? "none" : "auto",
            }}
            className="col-start-1 row-start-1 flex flex-col justify-between overflow-hidden rounded-[1.4rem] border border-[#e3dbd0] bg-gradient-to-b from-white via-[#fdfcfa] to-[#f6f2ea] bg-clip-padding text-[#1d1a18] shadow-[0_18px_44px_rgba(34,4,75,0.12)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none h-2 w-full shrink-0 rounded-t-[calc(1.4rem-1px)] bg-gradient-to-r from-[#4b187a] via-[#7b2cbf] to-[#4b187a]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              <Image
                src="/genxcode-mark.webp"
                alt=""
                width={310}
                height={310}
                className="-rotate-12 h-72 w-72 object-contain opacity-[0.065] grayscale contrast-125"
              />
            </div>

            <div className="relative z-10 p-4 pb-3.5 sm:p-5 sm:pb-4">
              <div className="flex items-center justify-between gap-2 border-b border-[#e8e1d5] pb-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src="/genxcode-mark.webp"
                    alt="GenXCode"
                    width={46}
                    height={46}
                    className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
                    priority
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6828a2]">
                      GenXCode
                    </p>
                    <h2 className="editorial mt-0.5 truncate text-[17px] font-bold leading-tight tracking-tight text-[#1d1a18] sm:text-[18.5px]">
                      Take Off With GenXCode
                    </h2>
                  </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#e2d9cb] bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-[#5f2295]">
                  <RotateCw className="h-2.5 w-2.5" />
                  <span>Flip</span>
                </span>
              </div>

              <div className="mt-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#837b72]">
                  Issued To
                </p>
                <p className="editorial mt-0.5 truncate text-[21px] font-bold leading-snug tracking-tight text-[#1d1a18] sm:text-[23px]">
                  {fullName?.trim() || "Participant"}
                </p>
                {college?.trim() && (
                  <p className="mt-0.5 truncate text-[12px] font-medium text-[#5e564f]">
                    {college.trim()}
                  </p>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#e8e1d5] pt-2.5 text-[11.5px]">
                <div className="min-w-0">
                  <dt className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#837b72]">
                    Department &amp; Year
                  </dt>
                  <dd className="mt-0.5 truncate font-semibold text-[#1d1a18]">
                    {academicLine || "Registered"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#837b72]">
                    City
                  </dt>
                  <dd className="mt-0.5 truncate font-semibold text-[#1d1a18]">
                    {city?.trim() || "Pune"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3.5 overflow-hidden rounded-xl border border-[#e3dbd0] bg-white shadow-[0_2px_10px_rgba(29,26,24,0.03)]">
                <div className="flex flex-col items-center p-3 pb-2.5">
                  <div
                    onContextMenu={(e) => e.preventDefault()}
                    className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-[#f0eae0] bg-white p-1.5 transition-all ${
                      isFullScreen
                        ? "h-52 w-52 sm:h-60 sm:w-60"
                        : "h-36 w-36 sm:h-40 sm:w-40"
                    }`}
                  >
                    {tokenUnavailable ? (
                      <div className="flex flex-col items-center px-2 text-center">
                        <AlertCircle className="h-5 w-5 text-[#be123c]" />
                        <p className="mt-1.5 text-[11px] font-semibold text-[#1d1a18]">
                          QR paused
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight text-[#756d65]">
                          {errorReason || "Tap refresh to load code"}
                        </p>
                      </div>
                    ) : qrSrc ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrSrc}
                          alt="Entry QR code"
                          draggable={false}
                          className={`pointer-events-none h-full w-full object-contain transition-all duration-150 ${
                            isObscured
                              ? "scale-95 blur-md opacity-30"
                              : isRefreshing
                                ? "opacity-45"
                                : "opacity-100"
                          }`}
                        />
                        {isObscured && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 p-2 text-center backdrop-blur-xs">
                            <Lock className="h-4 w-4 text-[#5f2295]" />
                            <span className="mt-1 text-[10px] font-semibold text-[#220749]">
                              Focus window to view
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full w-full animate-pulse rounded-md bg-[#f7f4ee]" />
                    )}
                  </div>

                  <div className="mt-2.5 flex w-full items-center justify-between text-[10.5px]">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                        tokenUnavailable
                          ? "text-[#be123c]"
                          : isExpiringSoon
                            ? "text-[#b45309]"
                            : "text-[#1b7a37]"
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3 shrink-0" />
                      <span>
                        {tokenUnavailable
                          ? "Unavailable"
                          : `Token TTL · ${secondsLeft}s`}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void fetchLiveQr();
                      }}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-[#5f2295] transition-colors hover:bg-[#faf7ff] hover:text-[#220749] disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-2.5 w-2.5 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div className="h-1 w-full bg-[#f3efe7]">
                  <div
                    style={{ width: `${progressPercent}%` }}
                    className={`h-full transition-[width] duration-200 ease-linear ${
                      isExpiringSoon
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-[#5f2295] to-[#8638cd]"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between px-3.5">
              <span
                className={`-ml-5 h-4 w-4 rounded-full border border-[#e3dbd0] ${
                  isFullScreen ? "bg-[#120424]" : "bg-[#fcfaff]"
                }`}
              />
              <div className="w-full border-t border-dashed border-[#d9d1c5]" />
              <span
                className={`-mr-5 h-4 w-4 rounded-full border border-[#e3dbd0] ${
                  isFullScreen ? "bg-[#120424]" : "bg-[#fcfaff]"
                }`}
              />
            </div>

            <div className="relative z-10 flex items-center justify-between bg-[#f2ede3]/85 px-4 py-2.5 sm:px-5">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#837b72]">
                  Pass ID
                </p>
                <p className="mt-0.5 font-mono text-[12px] font-bold tracking-wider text-[#1d1a18]">
                  {applicationNumber}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#837b72]">
                  Admission
                </p>
                <div className="mt-0.5 flex items-baseline justify-end gap-1.5">
                  <span className="text-[11px] text-[#948b81] line-through">
                    ₹299
                  </span>
                  <span className="editorial text-lg font-bold leading-none text-[#5f2295]">
                    ₹0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= BACK FACE ================= */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              pointerEvents: isFlipped ? "auto" : "none",
            }}
            className="col-start-1 row-start-1 flex flex-col justify-between overflow-hidden rounded-[1.4rem] border border-[#e3dbd0] bg-gradient-to-b from-white via-[#fdfcfa] to-[#f6f2ea] bg-clip-padding text-[#1d1a18] shadow-[0_18px_44px_rgba(34,4,75,0.12)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none h-2 w-full shrink-0 rounded-t-[calc(1.4rem-1px)] bg-gradient-to-r from-[#4b187a] via-[#7b2cbf] to-[#4b187a]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              <Image
                src="/genxcode-mark.webp"
                alt=""
                width={310}
                height={310}
                className="-rotate-12 h-72 w-72 object-contain opacity-[0.065] grayscale contrast-125"
              />
            </div>

            <div className="relative z-10 p-4 pb-3.5 sm:p-5 sm:pb-4">
              <div className="flex items-center justify-between gap-2.5 border-b border-[#e8e1d5] pb-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src="/genxcode-mark.webp"
                    alt="GenXCode"
                    width={42}
                    height={42}
                    className="h-10 w-10 shrink-0 object-contain"
                  />
                  <div className="min-w-0">
                    <p className="editorial truncate text-[16px] font-bold leading-tight text-[#1d1a18]">
                      Take Off With GenXCode
                    </p>
                    <p className="mt-0.5 text-[10.5px] font-medium text-[#756d65]">
                      Participant Credential · Individual Entry
                    </p>
                  </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#e2d9cb] bg-white/95 px-2.5 py-1 text-[10.5px] font-semibold text-[#5f2295]">
                  <RotateCw className="h-2.5 w-2.5" />
                  <span>Front</span>
                </span>
              </div>

              <p className="mt-3.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#837b72]">
                Pass Scope
              </p>

              <ul className="mt-2.5 space-y-2 text-[12px] font-medium text-[#1d1a18]">
                {PASS_ACCESS_LIST.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[#5f2295]"
                      strokeWidth={2.5}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl border border-[#e3dbd0] bg-white/90 p-3 text-[11px] leading-relaxed text-[#5e564f]">
                <p className="font-bold uppercase tracking-[0.08em] text-[#1d1a18]">
                  Verification Rules
                </p>
                <p className="mt-1">
                  Single-holder pass, non-transferable. Rotating QR tokens
                  expire every 30s; present live screen with valid college ID.
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between px-3.5">
              <span
                className={`-ml-5 h-4 w-4 rounded-full border border-[#e3dbd0] ${
                  isFullScreen ? "bg-[#120424]" : "bg-[#fcfaff]"
                }`}
              />
              <div className="w-full border-t border-dashed border-[#d9d1c5]" />
              <span
                className={`-mr-5 h-4 w-4 rounded-full border border-[#e3dbd0] ${
                  isFullScreen ? "bg-[#120424]" : "bg-[#fcfaff]"
                }`}
              />
            </div>

            <div className="relative z-10 flex items-center justify-between bg-[#f2ede3]/85 px-4 py-2.5 text-[11.5px] sm:px-5">
              <span className="font-mono font-bold tracking-wider text-[#1d1a18]">
                {applicationNumber}
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5f2295]">
                GXC-2026
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={toggleFullScreen}
        className={`mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-150 ${
          isFullScreen
            ? "max-w-[400px] border-white/20 bg-white/12 text-white hover:bg-white/20"
            : "border-[#dfcdf5] bg-gradient-to-b from-white via-[#faf6ff] to-[#f1e6fd] text-[#3d1173] shadow-[0_2px_10px_rgba(95,34,149,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-[#c7a6f3] hover:text-[#220749] hover:shadow-[0_6px_18px_rgba(95,34,149,0.12)] active:scale-[0.99]"
        }`}
      >
        {isFullScreen ? (
          <>
            <Minimize2 className="h-3.5 w-3.5" />
            <span>Exit Full Screen</span>
          </>
        ) : (
          <>
            <Maximize2 className="h-3.5 w-3.5 text-[#5f2295]" />
            <span>Open Full Screen Pass</span>
          </>
        )}
      </button>
    </div>
  );
}