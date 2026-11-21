"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { saveVolunteer, setVolunteerActive } from "@/app/admin/operations/actions";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
  ADMIN_SECONDARY_BTN,
} from "@/components/admin/admin-styles";
import type { OperationVolunteer } from "./operations-types";

interface VolunteerAccessSectionProps {
  volunteers: OperationVolunteer[];
  onMutated?: () => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  both: "Gate check-in & snacks",
  checkin: "Gate check-in only",
  snacks: "Snack counter only",
};

function parseRedirectOutcome(error: unknown): "saved" | "error" | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    const digest = (error as { digest: string }).digest;
    if (!digest.startsWith("NEXT_REDIRECT")) return null;
    if (digest.includes("error=")) return "error";
    return "saved";
  }
  return null;
}

export function VolunteerAccessSection({
  volunteers,
  onMutated,
}: VolunteerAccessSectionProps) {
  const [roster, setRoster] = useState<OperationVolunteer[]>(volunteers);
  const [searchQuery, setSearchQuery] = useState("");

  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("both");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isSaving, startSaveTransition] = useTransition();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [, startRowTransition] = useTransition();

  useEffect(() => {
    setRoster(volunteers);
  }, [volunteers]);

  const activeCount = useMemo(
    () => roster.filter((v) => v.is_active).length,
    [roster]
  );

  const pausedCount = roster.length - activeCount;

  const rosterSummaryText = useMemo(() => {
    if (roster.length === 0) return "No volunteers on duty yet";
    const base = `${activeCount} on duty`;
    return pausedCount > 0 ? `${base} · ${pausedCount} paused` : base;
  }, [roster.length, activeCount, pausedCount]);

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (v) =>
        v.email.toLowerCase().includes(q) ||
        (v.name && v.name.toLowerCase().includes(q)) ||
        (PERMISSION_LABELS[v.permission] ?? v.permission)
          .toLowerCase()
          .includes(q)
    );
  }, [roster, searchQuery]);

  function handleAddVolunteer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSaving) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setFeedback(null);
    const formData = new FormData();
    formData.set("email", cleanEmail);
    formData.set("permission", permission);

    const onSuccess = () => {
      setRoster((prev) =>
        prev.map((item) =>
          item.email.toLowerCase() === cleanEmail
            ? { ...item, permission, is_active: true }
            : item
        )
      );
      setEmail("");
      setFeedback({
        type: "success",
        text: `Scanner access granted to ${cleanEmail}.`,
      });
      onMutated?.();
    };

    startSaveTransition(async () => {
      try {
        await saveVolunteer(formData);
        onSuccess();
      } catch (err) {
        if (parseRedirectOutcome(err) === "saved") {
          onSuccess();
          return;
        }
        setFeedback({
          type: "error",
          text: "Account not found. Ask the volunteer to sign in once first.",
        });
      }
    });
  }

  function handleToggleActive(volunteer: OperationVolunteer) {
    if (busyUserId) return;
    setFeedback(null);

    const previousRoster = roster;
    const nextActive = !volunteer.is_active;

    setRoster((prev) =>
      prev.map((item) =>
        item.user_id === volunteer.user_id
          ? { ...item, is_active: nextActive }
          : item
      )
    );
    setBusyUserId(volunteer.user_id);

    const formData = new FormData();
    formData.set("user_id", volunteer.user_id);
    formData.set("active", String(nextActive));

    startRowTransition(async () => {
      try {
        await setVolunteerActive(formData);
        onMutated?.();
      } catch (err) {
        if (parseRedirectOutcome(err) === "saved") {
          onMutated?.();
        } else {
          setRoster(previousRoster);
          setFeedback({
            type: "error",
            text: "Could not update volunteer status. Please retry.",
          });
        }
      } finally {
        setBusyUserId(null);
      }
    });
  }

  function handleChangePermission(
    volunteer: OperationVolunteer,
    nextPermission: string
  ) {
    if (busyUserId || volunteer.permission === nextPermission) return;
    setFeedback(null);

    const previousRoster = roster;

    setRoster((prev) =>
      prev.map((item) =>
        item.user_id === volunteer.user_id
          ? { ...item, permission: nextPermission }
          : item
      )
    );
    setBusyUserId(volunteer.user_id);

    const formData = new FormData();
    formData.set("email", volunteer.email);
    formData.set("permission", nextPermission);

    startRowTransition(async () => {
      try {
        await saveVolunteer(formData);
        onMutated?.();
      } catch (err) {
        if (parseRedirectOutcome(err) === "saved") {
          onMutated?.();
        } else {
          setRoster(previousRoster);
          setFeedback({
            type: "error",
            text: "Could not update scanner permission.",
          });
        }
      } finally {
        setBusyUserId(null);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-[#e3dbd0] bg-white p-5 shadow-[0_8px_28px_rgba(27,5,62,0.03)] sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#ebe4dc] pb-4">
        <div>
          <p className="editorial text-[15px] italic text-[#6828a2]">
            Gate &amp; Hospitality Crew
          </p>
          <h2 className="editorial mt-0.5 text-2xl font-bold text-[#1b053e]">
            Volunteer access
          </h2>
        </div>

        <span className="text-xs font-medium text-[#6d627a]">
          {rosterSummaryText}
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#5c4f6e]">
        Assign scanner access by email. Volunteers must sign in to the portal
        once before their account can be linked.
      </p>

      {/* Grant Access Form */}
      <form
        onSubmit={handleAddVolunteer}
        className="mt-5 space-y-3.5 rounded-xl border border-[#efe7f7] bg-[#faf7ff] p-4"
      >
        <div className="grid gap-3.5 sm:grid-cols-12">
          <label className={ADMIN_LABEL_CLASS + " sm:col-span-7"}>
            Account email *
            <input
              required
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFeedback(null);
              }}
              disabled={isSaving}
              placeholder="volunteer@college.edu"
              className={ADMIN_FIELD_CLASS}
            />
          </label>

          <label className={ADMIN_LABEL_CLASS + " sm:col-span-5"}>
            Scanner permission
            <select
              name="permission"
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              disabled={isSaving}
              className={ADMIN_FIELD_CLASS}
            >
              <option value="both">Check-in &amp; snacks</option>
              <option value="checkin">Check-in only</option>
              <option value="snacks">Snacks only</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className={`${ADMIN_PRIMARY_BTN} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Assigning…</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Grant scanner access</span>
              </>
            )}
          </button>

          {feedback && (
            <p
              role={feedback.type === "error" ? "alert" : "status"}
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                feedback.type === "error" ? "text-[#be123c]" : "text-[#1b7a37]"
              }`}
            >
              {feedback.type === "error" ? (
                <AlertCircle size={13} className="shrink-0" />
              ) : (
                <Check size={13} className="shrink-0" />
              )}
              <span>{feedback.text}</span>
            </p>
          )}
        </div>
      </form>

      {/* Roster Search Bar (shown when 4+ volunteers exist) */}
      {roster.length >= 4 && (
        <div className="relative mt-5">
          <Search
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a6d8c]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter volunteers by name, email, or role…"
            className="w-full rounded-xl border border-[#e3dbd0] bg-[#fdfcfa] py-2.5 pl-9 pr-3.5 text-xs text-[#1b053e] outline-none transition-colors placeholder:text-[#8d7ba3] focus:border-[#6828a2] focus:bg-white"
          />
        </div>
      )}

      {/* Volunteer Roster */}
      <div className="mt-5 space-y-2.5">
        {roster.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#dcd0ec] bg-[#fcfaff] py-6 text-center text-xs text-[#76678a]">
            Add a volunteer email above to build your gate and hospitality team.
          </p>
        ) : filteredRoster.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#dcd0ec] bg-[#fcfaff] py-5 text-center text-xs text-[#76678a]">
            No volunteers match &ldquo;{searchQuery}&rdquo;.
          </p>
        ) : (
          filteredRoster.map((v) => {
            const isRowBusy = busyUserId === v.user_id;
            return (
              <div
                key={v.user_id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  v.is_active
                    ? "border-[#ede6f5] bg-[#fdfcff]"
                    : "border-[#eee8e0] bg-[#faf8f5] opacity-80"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2.5">
                    <p className="truncate text-sm font-bold text-[#1b053e]">
                      {v.name || v.email}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        v.is_active ? "text-[#1b7a37]" : "text-[#be123c]"
                      }`}
                    >
                      {v.is_active ? "On duty" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-0.5 break-all text-xs text-[#6d627a]">
                    {v.email}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Scanner permission for ${v.name || v.email}`}
                    value={v.permission}
                    onChange={(e) => handleChangePermission(v, e.target.value)}
                    disabled={Boolean(busyUserId)}
                    className="rounded-xl border border-[#e3dbd0] bg-white px-2.5 py-2 text-xs font-medium text-[#3d2b54] outline-none transition-colors hover:border-[#c7a6f3] focus:border-[#6828a2] disabled:opacity-50"
                  >
                    <option value="both">Check-in &amp; snacks</option>
                    <option value="checkin">Check-in only</option>
                    <option value="snacks">Snacks only</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(v)}
                    disabled={Boolean(busyUserId)}
                    className={`${ADMIN_SECONDARY_BTN} disabled:opacity-50`}
                  >
                    {isRowBusy ? (
                      <>
                        <Loader2
                          size={13}
                          className="animate-spin text-[#5f2295]"
                        />
                        <span>Updating…</span>
                      </>
                    ) : v.is_active ? (
                      <>
                        <UserX size={13} className="text-[#be123c]" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={13} className="text-[#1b7a37]" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}