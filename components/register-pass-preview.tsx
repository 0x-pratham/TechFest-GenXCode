"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Check, Loader2, RotateCw, Ticket } from "lucide-react";

interface RegisterPassPreviewProps {
  attendeeName: string | null;
  college: string | null;
  branch?: string | null;
  studyYear?: string | null;
  city?: string | null;
  applicationNumber: string | null;
  formId?: string;
}

const PASS_PERKS = [
  "Full Hackathon & Live Pitching Arena access",
  "3 Free Expert Workshop Sessions",
  "Free Breakfast on event morning",
  "Free Tea & Refreshments throughout",
  "PromptWars live rounds & builder perks",
];

export function RegisterPassPreview({
  attendeeName,
  college,
  branch,
  studyYear,
  city,
  applicationNumber,
  formId = "gxc-registration-form",
}: RegisterPassPreviewProps) {
  const [selectedTier, setSelectedTier] = useState<"anniversary" | "standard">(
    "anniversary"
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync pending state directly with the registration form so feedback is instant
  useEffect(() => {
    const formEl =
      (document.getElementById(formId) as HTMLFormElement | null) ??
      (document.querySelector(
        "#registration-form-anchor form"
      ) as HTMLFormElement | null);

    if (!formEl) return;

    const handleFormSubmit = () => {
      if (formEl.checkValidity()) {
        setIsSubmitting(true);
      }
    };

    // Reset submitting state if validation errors or completion messages render
    const observer = new MutationObserver(() => {
      const hasDisabledFieldset = formEl.querySelector(
        "fieldset:disabled, input:disabled"
      );
      if (!hasDisabledFieldset) {
        setIsSubmitting(false);
      }
    });

    formEl.addEventListener("submit", handleFormSubmit);
    observer.observe(formEl, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });

    return () => {
      formEl.removeEventListener("submit", handleFormSubmit);
      observer.disconnect();
    };
  }, [formId]);

  function handlePassSubmit() {
    if (isSubmitting) return;
    const formEl =
      (document.getElementById(formId) as HTMLFormElement | null) ??
      (document.querySelector(
        "#registration-form-anchor form"
      ) as HTMLFormElement | null);

    if (!formEl) return;

    if (typeof formEl.requestSubmit === "function") {
      formEl.requestSubmit();
    } else {
      formEl.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true })
      );
    }
  }

  const academicLine = [branch?.trim(), studyYear?.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside className="flex w-full flex-col gap-4">
      {/* 1. Interactive 3D Flippable Ivory-White Ticket Pass */}
      <div
        onMouseEnter={() => setIsFlipped(true)}
        onMouseLeave={() => setIsFlipped(false)}
        onClick={() => setIsFlipped((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-label="Flip pass preview to see included perks"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
        style={{ perspective: 1400 }}
        className="w-full cursor-pointer select-none focus:outline-none"
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26, mass: 0.9 }}
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
            className="col-start-1 row-start-1 flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-[#e6dfd4] bg-gradient-to-b from-white via-[#fdfcfa] to-[#f7f4ee] bg-clip-padding text-[#1d1a18] shadow-[0_18px_45px_rgba(34,4,75,0.06)]"
          >
            {/* Curved Top Accent Cap matching both rounded edges */}
            <div
              aria-hidden="true"
              className="pointer-events-none h-1.5 w-full shrink-0 rounded-t-[calc(1.5rem-1px)] bg-gradient-to-r from-[#5f2295] via-[#8638cd] to-[#5f2295]"
            />

            {/* Washed-out Logo Watermark */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              <Image
                src="/genxcode-mark.webp"
                alt=""
                width={220}
                height={220}
                className="h-52 w-52 object-contain opacity-[0.045] grayscale contrast-75"
              />
            </div>

            {/* Top Pass Body */}
            <div className="relative z-10 p-5 pb-4 sm:p-6 sm:pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e6dfd4] bg-white shadow-2xs">
                    <Image
                      src="/genxcode-mark.webp"
                      alt="GenXCode"
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                    />
                  </div>
                  <div>
                    <p className="editorial text-[15px] font-bold leading-none text-[#1d1a18]">
                      GenXCode
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-[#756d65]">
                      Take Off With GenXCode
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#756d65]">
                  <RotateCw className="h-3 w-3 text-[#5f2295]" />
                  <span>Flip for perks</span>
                </span>
              </div>

              {/* Attendee Data Loaded Live from Form / Profile */}
              <div className="mt-5 sm:mt-6">
                <p className="text-[11px] text-[#837b72]">Issued to</p>
                <p className="editorial mt-0.5 truncate text-xl font-bold tracking-tight text-[#1d1a18] sm:text-2xl">
                  {attendeeName?.trim() || "Your Name"}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#6e665e]">
                  {college?.trim() || "Institution details will appear here"}
                </p>
              </div>

              {/* Clean Hairline Pass Metadata Grid */}
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e8e2d7] pt-3.5 text-xs sm:mt-5 sm:pt-4">
                <div className="min-w-0">
                  <dt className="text-[11px] text-[#837b72]">Track &amp; Year</dt>
                  <dd className="mt-0.5 truncate font-medium text-[#1d1a18]">
                    {academicLine || "Not added yet"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-[#837b72]">City</dt>
                  <dd className="mt-0.5 truncate font-medium text-[#1d1a18]">
                    {city?.trim() || "Not added yet"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Perforated Ticket Tear Line */}
            <div className="relative z-10 flex items-center justify-between px-4">
              <span className="-ml-6 h-5 w-5 rounded-full border border-[#e6dfd4] bg-[#fcfaff]" />
              <div className="w-full border-t border-dashed border-[#dfd8cc]" />
              <span className="-mr-6 h-5 w-5 rounded-full border border-[#e6dfd4] bg-[#fcfaff]" />
            </div>

            {/* Bottom Stub */}
            <div className="relative z-10 flex items-center justify-between bg-[#f4f0e8]/75 px-5 py-3.5 sm:px-6">
              <div>
                <p className="text-[11px] text-[#837b72]">Pass number</p>
                <p className="mt-0.5 font-mono text-xs font-semibold tracking-wider text-[#1d1a18]">
                  {applicationNumber ?? "Pending submission"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-[#837b72]">Admission</p>
                <div className="mt-0.5 flex items-baseline justify-end gap-2">
                  <span className="text-xs text-[#948b81] line-through">
                    ₹299
                  </span>
                  <span className="editorial text-xl font-bold text-[#5f2295]">
                    ₹0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= BACK FACE (PERKS & INCLUSIONS) ================= */}
          <div
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              pointerEvents: isFlipped ? "auto" : "none",
            }}
            className="col-start-1 row-start-1 flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-[#e6dfd4] bg-gradient-to-b from-white via-[#fdfcfa] to-[#f7f4ee] bg-clip-padding text-[#1d1a18] shadow-[0_18px_45px_rgba(34,4,75,0.06)]"
          >
            {/* Curved Top Accent Cap matching both rounded edges */}
            <div
              aria-hidden="true"
              className="pointer-events-none h-1.5 w-full shrink-0 rounded-t-[calc(1.5rem-1px)] bg-gradient-to-r from-[#5f2295] via-[#8638cd] to-[#5f2295]"
            />

            {/* Washed-out Logo Watermark */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              <Image
                src="/genxcode-mark.webp"
                alt=""
                width={220}
                height={220}
                className="h-52 w-52 object-contain opacity-[0.045] grayscale contrast-75"
              />
            </div>

            {/* Back Body */}
            <div className="relative z-10 p-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between border-b border-[#e8e2d7] pb-3">
                <div>
                  <p className="editorial text-base font-bold leading-none text-[#1d1a18]">
                    All-Access Builder Pass
                  </p>
                  <p className="mt-1 text-[11px] text-[#756d65]">
                    First Anniversary Celebration · Complimentary
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5f2295]">
                  <RotateCw className="h-3 w-3" />
                  <span>Front</span>
                </span>
              </div>

              <ul className="mt-3.5 space-y-2 text-[12.5px] text-[#1d1a18] sm:text-[13px]">
                {PASS_PERKS.map((perk) => (
                  <li key={perk} className="flex items-center gap-2.5">
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[#5f2295]"
                      strokeWidth={2.4}
                    />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Perforated Ticket Tear Line */}
            <div className="relative z-10 flex items-center justify-between px-4">
              <span className="-ml-6 h-5 w-5 rounded-full border border-[#e6dfd4] bg-[#fcfaff]" />
              <div className="w-full border-t border-dashed border-[#dfd8cc]" />
              <span className="-mr-6 h-5 w-5 rounded-full border border-[#e6dfd4] bg-[#fcfaff]" />
            </div>

            {/* Back Bottom Stub */}
            <div className="relative z-10 flex items-center justify-between bg-[#f4f0e8]/75 px-5 py-3.5 text-xs sm:px-6">
              <span className="font-medium text-[#756d65]">
                Take Off With GenXCode
              </span>
              <span className="editorial text-sm italic font-semibold text-[#5f2295]">
                &amp; much more
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2. Pass Selection & Single Submit Action */}
      <div className="rounded-2xl border border-[#eadff5] bg-white p-4 shadow-[0_10px_32px_rgba(34,4,75,0.04)] sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#220749]">Your pass</p>
          <span className="text-xs font-medium text-[#5f2295]">
            Anniversary offer
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedTier("anniversary")}
          className={`mt-3 flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
            selectedTier === "anniversary"
              ? "border-[#5f2295] bg-[#faf7ff] ring-2 ring-[#8638cd]/15"
              : "border-[#eadff5] bg-white hover:border-[#c7a6f3]"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5f2295] text-white">
              <Check className="h-3 w-3" strokeWidth={2.6} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[#220749]">
                Full Access Builder Pass
              </p>
              <p className="mt-0.5 text-xs text-[#76678a]">
                Hackathon, 3 workshops, breakfast, tea &amp; QR entry
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="block text-[11px] text-[#76678a] line-through">
              ₹299
            </span>
            <span className="editorial text-lg font-bold text-[#5f2295]">
              ₹0
            </span>
          </div>
        </button>

        {/* Hairline Total */}
        <div className="mt-3.5 flex items-center justify-between border-t border-[#eadff5] pt-3 text-xs text-[#76678a]">
          <span>Total payable today</span>
          <span className="text-sm font-bold text-[#220749]">₹0 (Free)</span>
        </div>

        {/* ONLY Submit Button on the Page */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handlePassSubmit}
          className="btn-primary mt-3.5 w-full rounded-xl py-3 text-[13.5px] font-bold disabled:cursor-not-allowed disabled:opacity-75"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Issuing your ₹0 pass…</span>
            </>
          ) : (
            <>
              <Ticket className="h-4 w-4" />
              <span>
                {applicationNumber
                  ? "Save & Update Pass"
                  : "Complete Registration · ₹0"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}