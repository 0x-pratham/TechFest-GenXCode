"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function invalidateProblemStatementsCache() {
  revalidateTag("problem-statements", "max");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/submission");
}