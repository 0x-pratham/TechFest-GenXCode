"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RegisterPassPreview } from "@/components/register-pass-preview";

interface ProfileDraft {
  full_name: string | null;
  phone: string | null;
  college: string | null;
  branch: string | null;
  study_year: string | null;
  city: string | null;
  github_url: string | null;
  linkedin_url: string | null;
}

interface RegisterStageProps {
  initialProfile: ProfileDraft;
  applicationNumber: string | null;
  children: ReactNode;
}

type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function getControlLabelText(el: FieldControl): string {
  const parts: string[] = [
    el.name || "",
    el.id || "",
    el.getAttribute("aria-label") || "",
    "placeholder" in el ? el.placeholder || "" : "",
  ];

  if ("labels" in el && el.labels && el.labels.length > 0) {
    el.labels.forEach((lbl) => {
      if (lbl.textContent) parts.push(lbl.textContent);
    });
  }

  const parentLabel = el.closest("label");
  if (parentLabel?.textContent) {
    parts.push(parentLabel.textContent);
  }

  const wrapper = el.parentElement;
  if (wrapper) {
    const siblingLabel = wrapper.querySelector("label");
    if (siblingLabel?.textContent) parts.push(siblingLabel.textContent);
  }

  return parts.join(" ").toLowerCase();
}

function resolveFieldKey(
  el: FieldControl,
  allControls: FieldControl[]
): keyof ProfileDraft | null {
  const hint = getControlLabelText(el);

  if (hint.includes("github") || hint.includes("linkedin") || hint.includes("phone") || hint.includes("mobile")) {
    return null;
  }
  if (hint.includes("full_name") || hint.includes("fullname") || hint.includes("your name") || hint.includes("name")) {
    return "full_name";
  }
  if (hint.includes("college") || hint.includes("institute") || hint.includes("university") || hint.includes("school")) {
    return "college";
  }
  if (hint.includes("branch") || hint.includes("department") || hint.includes("stream") || hint.includes("course")) {
    return "branch";
  }
  if (hint.includes("study_year") || hint.includes("year") || hint.includes("semester")) {
    return "study_year";
  }
  if (hint.includes("city") || hint.includes("location") || hint.includes("town")) {
    return "city";
  }

  // Fallback by standard RegistrationWorkflow field order:
  // [0: full_name, 1: phone, 2: college, 3: branch, 4: study_year, 5: city]
  const idx = allControls.indexOf(el);
  if (idx === 0) return "full_name";
  if (idx === 2) return "college";
  if (idx === 3) return "branch";
  if (idx === 4) return "study_year";
  if (idx === 5) return "city";

  return null;
}

export function RegisterStage({
  initialProfile,
  applicationNumber,
  children,
}: RegisterStageProps) {
  const [liveDraft, setLiveDraft] = useState<ProfileDraft>(initialProfile);
  const formWrapperRef = useRef<HTMLDivElement | null>(null);

  function syncAllControls() {
    const root = formWrapperRef.current;
    if (!root) return;

    const controls = Array.from(
      root.querySelectorAll<FieldControl>("input, select, textarea")
    ).filter((el) => el.type !== "hidden" && el.type !== "submit");

    if (controls.length === 0) return;

    setLiveDraft((prev) => {
      let changed = false;
      const next = { ...prev };

      controls.forEach((ctrl) => {
        const key = resolveFieldKey(ctrl, controls);
        if (!key) return;
        const val = ctrl.value;
        if ((next[key] ?? "") !== val) {
          next[key] = val;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }

  useEffect(() => {
    // Sync initial browser autofill or hydrated values right after mount
    const raf = requestAnimationFrame(syncAllControls);
    const timer = window.setTimeout(syncAllControls, 300);

    const root = formWrapperRef.current;
    if (!root) {
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(timer);
      };
    }

    const observer = new MutationObserver(() => {
      syncAllControls();
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["value"],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-8 lg:h-full lg:grid-cols-12 lg:gap-12">
      {/* LEFT COLUMN: Independently Scrollable Registration Form */}
      <div
        onInputCapture={syncAllControls}
        onChangeCapture={syncAllControls}
        onKeyUpCapture={syncAllControls}
        className="lg:col-span-7 lg:h-full lg:overflow-y-auto lg:pb-12 lg:pr-3 [scrollbar-width:thin]"
      >
        <p className="editorial text-[16px] italic font-normal text-[#5f2295] sm:text-[19px]">
          Hackathon Registration
        </p>

        <h1 className="editorial mt-1.5 text-3xl leading-[1.04] tracking-[-0.03em] sm:text-5xl xl:text-[3.35rem]">
          One step closer.
          <br />
          <span className="italic font-normal text-[#5f2295]">
            Let’s get you registered.
          </span>
        </h1>

        <p className="mt-3.5 max-w-xl text-[14.5px] leading-relaxed text-[#76678a] sm:text-[15px]">
          Complete your participant profile below. Watch your pass update live
          on the right, then confirm to finish registration.
        </p>

        {/* Form Container (hides any inner submit button so Pass Preview holds the sole button) */}
        <div
          id="registration-form-anchor"
          ref={formWrapperRef}
          className="mt-6 sm:mt-8 [&_button[type='submit']]:hidden"
        >
          {children}
        </div>
      </div>

      {/* RIGHT COLUMN: Locked Non-Scrolling Live Pass Preview + Sole Submit Button */}
      <div className="lg:col-span-5 lg:flex lg:h-full lg:flex-col lg:justify-center lg:overflow-hidden lg:pb-8">
        <RegisterPassPreview
          attendeeName={liveDraft.full_name}
          college={liveDraft.college}
          branch={liveDraft.branch}
          studyYear={liveDraft.study_year}
          city={liveDraft.city}
          applicationNumber={applicationNumber}
          formId="gxc-registration-form"
        />
      </div>
    </div>
  );
}