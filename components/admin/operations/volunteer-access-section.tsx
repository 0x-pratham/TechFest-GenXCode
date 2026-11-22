"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  createOrAssignVolunteer,
  toggleVolunteerStatus,
  updateVolunteerPermission,
  type VolunteerActionState,
} from "@/app/admin/operations/actions";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_PRIMARY_BTN,
} from "@/components/admin/admin-styles";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export type VolunteerRecord = {
  id?: string | null;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  permission: string;
  is_active: boolean;
  created_at?: string | null;
};

interface VolunteerAccessSectionProps {
  volunteers: VolunteerRecord[];
  onMutated?: () => void;
}

export function VolunteerAccessSection({
  volunteers,
  onMutated,
}: VolunteerAccessSectionProps) {
  const [state, formAction] = useActionState<VolunteerActionState, FormData>(
    createOrAssignVolunteer,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      onMutated?.();
    }
  }, [state, onMutated]);

  const activeCount = volunteers.filter((v) => v.is_active).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e3dbd0] bg-white shadow-[0_10px_32px_rgba(27,5,62,0.03)]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebe4dc] bg-[#fdfcfa] px-5 py-6 sm:px-8 sm:py-7">
        <div>
          <p className="editorial text-[15px] italic text-[#6828a2]">
            Floor Team · Operations Access
          </p>
          <h2 className="editorial mt-1 text-2xl font-bold tracking-[-0.02em] text-[#1b053e] sm:text-[2rem]">
            Volunteer credentials &amp; access
          </h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-[#5c4f6e]">
            Create dedicated volunteer logins with email and password. They can
            sign in immediately at{" "}
            <span className="font-mono font-semibold text-[#6828a2]">
              /volunteer/login
            </span>
            .
          </p>
        </div>

        <p className="font-mono text-xs font-semibold text-[#5e536b]">
          {activeCount} ACTIVE · {volunteers.length} TOTAL
        </p>
      </div>

      <div className="p-5 sm:p-8">
        {/* Create Volunteer Form */}
        <div className="rounded-xl border border-[#e6ddf2] bg-[#faf7ff] p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 border-b border-[#ebe1f7] pb-3">
            <UserPlus size={16} className="text-[#6828a2]" />
            <h3 className="editorial text-lg font-bold text-[#1b053e]">
              Create or assign volunteer account
            </h3>
          </div>

          <form ref={formRef} action={formAction} className="space-y-4">
            <div className="grid gap-3.5 sm:grid-cols-12 sm:gap-4">
              <label className={ADMIN_LABEL_CLASS + " sm:col-span-3"}>
                Full Name *
                <input
                  required
                  name="full_name"
                  placeholder="Rohan Kulkarni"
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " sm:col-span-3"}>
                Login Email *
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="rohan.ops@genxcode.in"
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " sm:col-span-3"}>
                Password *
                <input
                  required
                  type="password"
                  name="password"
                  minLength={8}
                  placeholder="Min 8 characters"
                  className={ADMIN_FIELD_CLASS}
                />
              </label>

              <label className={ADMIN_LABEL_CLASS + " sm:col-span-3"}>
                Station Scope *
                <select
                  name="permission"
                  defaultValue="both"
                  className={ADMIN_FIELD_CLASS}
                >
                  <option value="both">Gate Check-in &amp; Snacks</option>
                  <option value="checkin">Gate Check-in Only</option>
                  <option value="snacks">Snacks / Hospitality Only</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe1f7] pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#6d627a]">
                <KeyRound size={13} className="text-[#6828a2]" />
                <span>
                  Email is auto-confirmed so the volunteer can log in right away.
                </span>
              </span>

              <PendingSubmitButton
                pendingLabel="Creating account…"
                className={ADMIN_PRIMARY_BTN}
              >
                <ShieldCheck size={15} />
                <span>Create Volunteer</span>
              </PendingSubmitButton>
            </div>

            {state && (
              <p
                role={state.ok ? "status" : "alert"}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                  state.ok
                    ? "border border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37]"
                    : "border border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]"
                }`}
              >
                {state.ok ? (
                  <CheckCircle2 size={14} className="shrink-0" />
                ) : (
                  <AlertCircle size={14} className="shrink-0" />
                )}
                <span>{state.message}</span>
              </p>
            )}
          </form>
        </div>

        {/* Assigned Volunteers Table */}
        <div className="mt-7 overflow-x-auto rounded-xl border border-[#ebe4dc]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-[#ebe4dc] bg-[#faf7f2] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#5e536b]">
              <tr>
                <th className="px-4 py-3.5">Volunteer</th>
                <th className="px-4 py-3.5">Station Permission</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1ece4] bg-white">
              {volunteers.map((v, index) => {
                const rowKey =
                  v.id ?? v.user_id ?? v.email ?? `volunteer-${index}`;
                const displayName =
                  v.full_name?.trim() || v.name?.trim() || "Unnamed Volunteer";
                const normalizedPermission =
                  v.permission === "checkin" ||
                  v.permission === "snacks" ||
                  v.permission === "both" ||
                  v.permission === "admin"
                    ? v.permission
                    : "both";
                const canMutateRow = Boolean(v.id || v.email);

                return (
                  <tr key={rowKey} className="hover:bg-[#fdfbff]">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#1b053e]">{displayName}</p>
                      <p className="mt-0.5 text-[#6d627a]">
                        {v.email ?? "No email available"}
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <form
                        action={async (formData) => {
                          await updateVolunteerPermission(formData);
                          onMutated?.();
                        }}
                        className="inline-flex items-center gap-2"
                      >
                        {v.id && (
                          <input type="hidden" name="id" value={v.id} />
                        )}
                        {v.email && (
                          <input type="hidden" name="email" value={v.email} />
                        )}
                        <select
                          name="permission"
                          defaultValue={normalizedPermission}
                          disabled={!canMutateRow}
                          className="rounded-lg border border-[#eadff5] bg-[#faf7ff] px-2.5 py-1.5 text-xs font-semibold text-[#1b053e] outline-none focus:border-[#6828a2] disabled:opacity-50"
                        >
                          <option value="both">
                            Gate Check-in &amp; Snacks
                          </option>
                          <option value="checkin">Gate Check-in Only</option>
                          <option value="snacks">
                            Snacks / Hospitality Only
                          </option>
                          {normalizedPermission === "admin" && (
                            <option value="admin">Full Admin</option>
                          )}
                        </select>
                        <button
                          type="submit"
                          disabled={!canMutateRow}
                          className="rounded-lg border border-[#dfcdf5] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5f2295] hover:bg-[#faf7ff] disabled:opacity-50"
                        >
                          Update
                        </button>
                      </form>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold ${
                          v.is_active
                            ? "bg-[#eefaf1] text-[#1b7a37]"
                            : "bg-[#f3f0f6] text-[#7a6d8c]"
                        }`}
                      >
                        {v.is_active ? "ACTIVE" : "SUSPENDED"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <form
                        action={async (formData) => {
                          await toggleVolunteerStatus(formData);
                          onMutated?.();
                        }}
                        className="inline"
                      >
                        {v.id && (
                          <input type="hidden" name="id" value={v.id} />
                        )}
                        {v.email && (
                          <input type="hidden" name="email" value={v.email} />
                        )}
                        <input
                          type="hidden"
                          name="is_active"
                          value={v.is_active ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          disabled={!canMutateRow}
                          className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                            v.is_active
                              ? "border-[#f5c2c7] bg-[#fff8f8] text-[#be123c] hover:bg-[#fff1f2]"
                              : "border-[#bfe6c9] bg-[#eefaf1] text-[#1b7a37] hover:bg-[#e1f6e7]"
                          }`}
                        >
                          {v.is_active ? "Revoke Access" : "Re-activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {volunteers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-[#76678a]"
                  >
                    No volunteer accounts created yet. Add your first floor
                    volunteer above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}