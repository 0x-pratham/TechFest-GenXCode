"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function confirmHack2SkillRegistration(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth?next=/dashboard");
  }

  const confirmed = formData.get("hack2skill_confirmed") === "on";
  if (!confirmed) {
    redirect("/dashboard?h2s_error=confirm");
  }

  const { data: rpcOk, error: rpcError } = await supabase.rpc(
    "confirm_hack2skill_registration"
  );

  if (rpcError || !rpcOk) {
    const { data: candidateRegs } = await supabase
      .from("registrations")
      .select("id,status")
      .or(
        user.email
          ? `created_by.eq.${user.id},email.eq.${user.email}`
          : `created_by.eq.${user.id}`
      )
      .order("created_at", { ascending: false });

    const rows = candidateRegs ?? [];
    const registration =
      rows.find((r) => String(r.status ?? "").toLowerCase() !== "cancelled") ??
      rows[0] ??
      null;

    if (!registration?.id) {
      redirect("/signup");
    }

    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        hack2skill_registered: true,
        hack2skill_confirmed_at: new Date().toISOString(),
      })
      .eq("id", registration.id);

    if (updateError) {
      console.error("[confirmHack2SkillRegistration] Update failed:", updateError);
      redirect("/dashboard?h2s_error=save");
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pass");
  revalidatePath("/dashboard/submission");
  redirect("/dashboard");
}