"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CheckCircle2, Lock } from "lucide-react";
import { confirmHack2SkillRegistration } from "@/app/register/hack2skill/actions";

const HACK2SKILL_URL =
  "https://hack2skill.com/event/promptwars-x-gxctakeoff?utm_source=hack2skill&utm_medium=homepage";

interface Hack2SkillGateCardProps {
  applicationNumber: string;
  participantName: string;
}

export function Hack2SkillGateCard({
  applicationNumber,
  participantName,
}: Hack2SkillGateCardProps) {
  const [hasOpenedHack2Skill, setHasOpenedHack2Skill] = useState(false);
  const [returnedFromH2S, setReturnedFromH2S] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!hasOpenedHack2Skill) return;

    const markReturned = () => {
      if (document.visibilityState === "visible") {
        setReturnedFromH2S(true);
      }
    };

    window.addEventListener("focus", markReturned);
    document.addEventListener("visibilitychange", markReturned);

    return () => {
      window.removeEventListener("focus", markReturned);
      document.removeEventListener("visibilitychange", markReturned);
    };
  }, [hasOpenedHack2Skill]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!hasOpenedHack2Skill || !isChecked || lockRef.current || isSubmitting) {
      e.preventDefault();
      return;
    }
    lockRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <section className="rounded-3xl border border-[#e3dbd0] bg-white p-6 shadow-[0_12px_36px_rgba(27,5,62,0.04)] sm:p-9">
      {/* Step 1: Mandatory Hack2Skill Portal Registration */}
      <div className="rounded-2xl border border-[#dfcdf5] bg-[#faf7ff] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6828a2]">
            Step 1 of 2 · Official Partner Portal
          </span>
          {hasOpenedHack2Skill && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b7a37]">
              <CheckCircle2 size={14} />
              {returnedFromH2S
                ? "Welcome back · Step 2 unlocked"
                : "Portal opened"}
            </span>
          )}
        </div>

        <h2 className="editorial mt-2 text-xl font-bold text-[#1b053e] sm:text-2xl">
          Register on Hack2Skill (Mandatory)
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#524661]">
          Hi{" "}
          <strong className="font-semibold text-[#1b053e]">
            {participantName}
          </strong>{" "}
          (
          <span className="font-mono text-xs text-[#6828a2]">
            {applicationNumber}
          </span>
          ), complete your registration on the official Hack2Skill event page
          to unlock your QR pass, problem statements, and dashboard.
        </p>

        <div className="mt-5">
          <a
            href={HACK2SKILL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setHasOpenedHack2Skill(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1b053e] px-6 py-3.5 text-sm font-semibold text-[#f9f6f1] shadow-[0_8px_22px_rgba(27,5,62,0.18)] transition-all hover:bg-[#6828a2] active:scale-[0.99] sm:w-auto"
          >
            <span>Register on Hack2Skill</span>
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>

      {/* Step 2: Confirm & Unlock Dashboard */}
      <form
        action={confirmHack2SkillRegistration}
        onSubmit={handleSubmit}
        className="mt-6 border-t border-[#ebe4dc] pt-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d627a]">
          Step 2 of 2 · Unlock Dashboard
        </p>

        <label
          className={`mt-3 flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed transition-colors ${
            hasOpenedHack2Skill
              ? "cursor-pointer border-[#e3dbd0] bg-[#faf7f2] text-[#1b053e] hover:border-[#c7a6f3]"
              : "cursor-not-allowed border-[#ebe4dc] bg-[#faf7f2]/60 text-[#8d7ba3]"
          }`}
        >
          <input
            type="checkbox"
            name="hack2skill_confirmed"
            disabled={!hasOpenedHack2Skill}
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-[#6828a2]"
          />
          <span>
            I have completed my registration on Hack2Skill for{" "}
            <strong className="font-semibold">
              PromptWars × GenXCode TakeOff
            </strong>{" "}
            using my registered details.
          </span>
        </label>

        {!hasOpenedHack2Skill && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-[#6d627a]">
            <Lock size={12} className="text-[#6828a2]" />
            Open the Hack2Skill registration link in Step 1 first to unlock
            confirmation.
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-[#6d627a]">
            Required for QR entry pass &amp; project submission access.
          </p>

          <button
            type="submit"
            disabled={!hasOpenedHack2Skill || !isChecked || isSubmitting}
            aria-busy={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6828a2] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(104,40,162,0.22)] transition-all hover:bg-[#531d85] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          >
            <span>{isSubmitting ? "Unlocking…" : "Unlock Dashboard"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}