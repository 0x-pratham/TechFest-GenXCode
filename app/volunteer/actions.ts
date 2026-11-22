"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function volunteerSignIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/volunteer/login?error=missing");
  }

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    redirect("/volunteer/login?error=invalid");
  }

  const { data: permission, error: permError } = await supabase.rpc(
    "event_actor_permission"
  );

  if (permError || !permission) {
    await supabase.auth.signOut();
    redirect("/volunteer/login?error=not-assigned");
  }

  revalidatePath("/volunteer/dashboard");
  redirect("/volunteer/dashboard");
}