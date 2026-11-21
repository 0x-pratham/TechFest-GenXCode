import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/dashboard/actions";
import { Navbar } from "@/components/navbar";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { RegistrationWorkflow } from "@/components/registration-workflow";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth?next=/signup");
  }

  const [{ data: profile }, { data: candidateRegs }, { data: staffPermission }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name,phone,college,branch,study_year,city,github_url,linkedin_url,role"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("registrations")
        .select("id,application_number,status")
        .or(
          user.email
            ? `created_by.eq.${user.id},email.eq.${user.email}`
            : `created_by.eq.${user.id}`
        )
        .order("created_at", { ascending: false }),
      supabase.rpc("event_actor_permission"),
    ]);

  if (profile?.role === "admin") redirect("/admin");
  if (profile?.role === "volunteer" || Boolean(staffPermission)) {
    redirect("/volunteer/dashboard");
  }

  const activeRegistration =
    (candidateRegs ?? []).find(
      (r) => String(r.status ?? "").toLowerCase() !== "cancelled"
    ) ?? null;

  if (activeRegistration) {
    redirect("/dashboard");
  }

  const initialProfile = {
    full_name:
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : ""),
    phone: profile?.phone ?? "",
    college: profile?.college ?? "",
    branch: profile?.branch ?? "",
    study_year: profile?.study_year ?? "",
    city: profile?.city ?? "",
    github_url: profile?.github_url ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
  };

  return (
    <main className="min-h-screen bg-[#fcfaff] text-[#220749]">
      <Navbar>
        <form action={signOut}>
          <PendingSubmitButton
            pendingLabel="Signing out…"
            className="group/signout !transition-colors !duration-100 hover:!border-[#f5c2c7] hover:!from-[#fff8f8] hover:!via-[#fff1f2] hover:!to-[#ffe4e6] hover:!text-[#be123c] hover:!shadow-[0_4px_14px_rgba(225,29,72,0.12)] active:!scale-[0.98] active:!border-[#fda4af] active:!from-[#fff1f2] active:!via-[#ffe4e6] active:!to-[#fecdd3] active:!text-[#9f1239]"
          >
            <LogOut
              size={14}
              className="text-[#5f2295] transition-colors duration-100 group-hover/signout:text-[#e11d48] group-active/signout:text-[#be123c]"
            />
            <span>Sign out</span>
          </PendingSubmitButton>
        </form>
      </Navbar>

      <section className="container-shell max-w-3xl pb-20 pt-28 sm:pt-32">
        <header className="mb-8">
          <p className="editorial text-[16px] italic text-[#5f2295] sm:text-[18px]">
            Take Off With GenXCode · Free Pass Registration
          </p>
          <h1 className="editorial mt-1.5 text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[#220749] sm:text-5xl">
            Complete your builder profile.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#76678a] sm:text-[15px]">
            Signed in as{" "}
            <span className="font-semibold text-[#220749]">{user.email}</span>.
            Fill in your academic details below to generate your complimentary
            First Anniversary pass.
          </p>
        </header>

        <RegistrationWorkflow initialProfile={initialProfile} existing={null} />
      </section>
    </main>
  );
}