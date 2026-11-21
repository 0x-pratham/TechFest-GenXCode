import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import { Navbar } from "@/components/navbar";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { EventOperationsScanner } from "@/components/event-operations-scanner";
import { EventOperationsReports } from "@/components/event-operations-reports";
import { VolunteerLiveRefresh } from "@/components/volunteer/volunteer-live-refresh";
import { formatStaffIdentifier } from "@/lib/format-staff-identifier";
import { getCachedScheduleSettings } from "@/lib/cache/event-data";

export const dynamic = "force-dynamic";

function formatScope(permission: unknown): string {
  if (typeof permission === "string") {
    const val = permission.toLowerCase();
    if (val.includes("admin") || val === "all" || val === "full") {
      return "Gate check-in & hospitality";
    }
    if (val.includes("checkin") || val.includes("gate")) {
      return "Gate check-in";
    }
    if (val.includes("snack") || val.includes("food")) {
      return "Hospitality counter";
    }
    return permission;
  }

  if (permission && typeof permission === "object") {
    const p = permission as Record<string, unknown>;
    const gate = Boolean(p.can_check_in ?? p.checkin ?? p.gate);
    const snacks = Boolean(p.can_distribute_snacks ?? p.snacks ?? p.food);
    if (gate && snacks) return "Gate check-in & hospitality";
    if (gate) return "Gate check-in";
    if (snacks) return "Hospitality counter";
  }

  return "Floor operations";
}

export default async function VolunteerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/volunteer/login");

  const [{ data: permission }, settings, { data: profile }] =
    await Promise.all([
      supabase.rpc("event_actor_permission"),
      getCachedScheduleSettings(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  if (!permission) redirect("/volunteer/login?error=not-assigned");

  const fullName =
    profile?.full_name || user.user_metadata?.full_name || "Volunteer";
  const firstName = fullName.trim().split(/\s+/)[0] || "Team";
  const staffId = formatStaffIdentifier(fullName);
  const dayCount = Math.max(1, Number(settings?.day_count ?? 1));
  const scope = formatScope(permission);

  return (
    <main className="min-h-screen bg-[#f9f6f1] text-[#1b053e]">
      <VolunteerLiveRefresh />

      <Navbar>
        <div className="flex items-center gap-2">
          <form action={signOut}>
            <PendingSubmitButton
              pendingLabel="Signing out…"
              className="group/signout !px-3 !py-1.5 !text-xs !transition-colors !duration-100 hover:!border-[#f5c2c7] hover:!from-[#fff8f8] hover:!via-[#fff1f2] hover:!to-[#ffe4e6] hover:!text-[#be123c] hover:!shadow-[0_4px_14px_rgba(225,29,72,0.12)] active:!scale-[0.98] active:!border-[#fda4af] active:!from-[#fff1f2] active:!via-[#ffe4e6] active:!to-[#fecdd3] active:!text-[#9f1239]"
            >
              <LogOut
                size={14}
                className="text-[#6828a2] transition-colors duration-100 group-hover/signout:text-[#e11d48] group-active/signout:text-[#be123c]"
              />
              <span>Sign out</span>
            </PendingSubmitButton>
          </form>
        </div>
      </Navbar>

      <div className="container-shell max-w-5xl pb-20 pt-24 sm:pt-28">
        <header className="grid grid-cols-1 gap-7 border-b border-[#e2dad0] pb-8 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="editorial text-[16px] italic font-normal text-[#6828a2] sm:text-[18px]">
                Event Operations · Volunteer Desk
              </p>

              <h1 className="editorial mt-1.5 text-3xl font-bold leading-[1.06] tracking-[-0.025em] text-[#1b053e] sm:text-[2.75rem]">
                Welcome on duty,{" "}
                <span className="italic font-normal text-[#6828a2]">
                  {firstName}.
                </span>
              </h1>

              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#5c506b] sm:text-[15px]">
                Scan a participant’s live QR pass to check them in at the gate
                or log refreshments, or look up their name in the register
                below.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6d627a]">
              <span>Signed in as</span>
              <span className="font-semibold text-[#1b053e]">{fullName}</span>
              <span className="text-[#c5bcb0]">·</span>
              <span className="break-all">{user.email}</span>
            </div>
          </div>

          <aside className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#ded5c7] bg-gradient-to-b from-[#fdfbf7] via-[#f9f4eb] to-[#f3ece0] text-[#1b053e] shadow-[0_10px_28px_rgba(38,26,12,0.05)] lg:col-span-5">
            <div
              aria-hidden="true"
              className="h-1 w-full bg-gradient-to-r from-[#6828a2] via-[#8b4bc7] to-[#6828a2]"
            />

            <div className="flex items-center justify-between px-5 pt-4 text-xs">
              <span className="editorial italic text-[#6828a2]">
                Staff accreditation
              </span>
              <span className="font-medium text-[#756a5c]">
                {dayCount > 1 ? `${dayCount}-day access` : "Event access"}
              </span>
            </div>

            <div className="px-5 py-4">
              <p className="text-xs text-[#756a5c]">Pass identifier</p>
              <p className="editorial mt-0.5 text-2xl font-bold tracking-tight text-[#1b053e] sm:text-[1.75rem]">
                {staffId}
              </p>
            </div>

            <div className="relative flex items-center">
              <span className="-ml-2.5 h-4 w-4 rounded-full border border-[#ded5c7] bg-[#f9f6f1]" />
              <div className="w-full border-t border-dashed border-[#d6ccbc]" />
              <span className="-mr-2.5 h-4 w-4 rounded-full border border-[#ded5c7] bg-[#f9f6f1]" />
            </div>

            <div className="flex items-center justify-between bg-[#efe7d9]/65 px-5 py-3 text-xs">
              <span className="text-[#6e6355]">Assigned station</span>
              <span className="font-semibold text-[#1b053e]">{scope}</span>
            </div>
          </aside>
        </header>

        <div className="mt-7 space-y-7 sm:mt-8 sm:space-y-8">
          <EventOperationsScanner
            dayCount={dayCount}
            permission={permission}
          />

          <EventOperationsReports allowExport={false} intervalMs={5000} />
        </div>
      </div>
    </main>
  );
}