"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RegisterPassPreview } from "@/components/register-pass-preview";

type Profile = {
  full_name: string | null;
  phone: string | null;
  college: string | null;
  branch: string | null;
  study_year: string | null;
  city: string | null;
  github_url: string | null;
  linkedin_url: string | null;
};

type ExistingRegistration = { application_number: string | null };

const FORM_ID = "gxc-registration-form";

const fieldClass =
  "mt-2 block min-w-0 w-full max-w-full rounded-xl border border-[#eadff5] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#5f2295] focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-60";

export function RegistrationWorkflow({
  initialProfile,
  existing,
}: {
  initialProfile: Profile;
  existing: ExistingRegistration | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [application, setApplication] = useState<string | null>(null);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  const profileComplete = Boolean(
    profile.full_name?.trim() &&
      profile.phone?.trim() &&
      profile.college?.trim() &&
      profile.branch?.trim() &&
      profile.study_year?.trim()
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setError("Your session expired. Please sign in again.");
        return;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ ...profile, updated_at: new Date().toISOString() })
        .eq("id", auth.user.id);
      if (profileError) {
        setError(profileError.message);
        return;
      }
      const { data, error: registrationError } = await supabase.rpc(
        "submit_hackathon_registration"
      );
      if (registrationError) {
        setError(registrationError.message);
        return;
      }
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.application_number) {
        setError(
          "Application submitted but the application number could not be retrieved. Refresh the page."
        );
        return;
      }
      setApplication(result.application_number);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        "We couldn't complete registration. Check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const applicationNumber = application ?? existing?.application_number;
  if (applicationNumber) {
    return (
      <section className="card-hover mx-auto max-w-2xl rounded-2xl border border-[#eadff5] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3 text-[#1e8e3e]">
          <CheckCircle2 size={22} />
          <p className="text-sm font-bold">Hackathon application submitted</p>
        </div>
        <p className="editorial mt-5 text-4xl">{applicationNumber}</p>
        <p className="mt-3 text-sm leading-6 text-[#76678a]">
          Your application number has been generated. Complete your mandatory
          Hack2Skill registration on the dashboard to unlock your QR pass and
          problem statements.
        </p>
        <button
          type="button"
          onClick={() => {
            router.replace("/dashboard");
            router.refresh();
          }}
          className="mt-7 rounded-full bg-[#5f2295] px-6 py-3 text-sm font-semibold text-white"
        >
          Go to dashboard
        </button>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Left Column: Participant Profile Form */}
      <div id="registration-form-anchor" className="min-w-0 lg:col-span-7">
        <form id={FORM_ID} onSubmit={submit} className="space-y-6">
          <fieldset disabled={saving} className="min-w-0 space-y-6">
            <section className="card-hover min-w-0 rounded-2xl border border-[#eadff5] bg-white p-5 shadow-[0_12px_36px_rgba(34,4,75,0.03)] sm:p-8">
              <div className="mb-6">
                <p className="eyebrow">PARTICIPANT PROFILE</p>
                <h2 className="editorial mt-2 text-2xl sm:text-3xl">
                  Your details
                </h2>
                <p className="mt-2 text-sm text-[#76678a]">
                  Complete these details to finish your free hackathon
                  registration. Your pass preview updates live as you type.
                </p>
              </div>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  Full name *
                  <input
                    required
                    value={profile.full_name ?? ""}
                    onChange={(e) => update("full_name", e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  Phone number *
                  <input
                    required
                    type="tel"
                    value={profile.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                    className={fieldClass}
                    placeholder="+91"
                  />
                </label>
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  College / Institution *
                  <input
                    required
                    value={profile.college ?? ""}
                    onChange={(e) => update("college", e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  Branch / Department *
                  <input
                    required
                    value={profile.branch ?? ""}
                    onChange={(e) => update("branch", e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  Year of study *
                  <select
                    required
                    value={profile.study_year ?? ""}
                    onChange={(e) => update("study_year", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select year</option>
                    {[
                      "1st Year",
                      "2nd Year",
                      "3rd Year",
                      "4th Year",
                      "Postgraduate",
                      "Other",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  City
                  <input
                    value={profile.city ?? ""}
                    onChange={(e) => update("city", e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  GitHub profile
                  <input
                    type="url"
                    value={profile.github_url ?? ""}
                    onChange={(e) => update("github_url", e.target.value)}
                    className={fieldClass}
                    placeholder="https://github.com/..."
                  />
                </label>
                <label className="block min-w-0 text-xs font-semibold text-[#57436d]">
                  LinkedIn profile
                  <input
                    type="url"
                    value={profile.linkedin_url ?? ""}
                    onChange={(e) => update("linkedin_url", e.target.value)}
                    className={fieldClass}
                    placeholder="https://linkedin.com/in/..."
                  />
                </label>
              </div>
              {!profileComplete && (
                <p className="mt-4 text-xs text-[#a16207]">
                  Required fields: name, phone, college, branch and year of
                  study.
                </p>
              )}
            </section>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </form>
      </div>

      {/* Right Column: Live-Updating Pass Preview + Single Submit Action */}
      <div className="min-w-0 lg:sticky lg:top-28 lg:col-span-5">
        <RegisterPassPreview
          attendeeName={profile.full_name}
          college={profile.college}
          branch={profile.branch}
          studyYear={profile.study_year}
          city={profile.city}
          applicationNumber={null}
          formId={FORM_ID}
        />
      </div>
    </div>
  );
}