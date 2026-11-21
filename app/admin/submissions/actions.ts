"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth?next=/admin/submissions");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return { supabase, user };
}

export async function updateSubmissionWindow(formData: FormData) {
  const { supabase } = await requireAdmin();

  const isOpen = formData.get("is_open") === "on";
  const rawClosesAt = String(formData.get("closes_at") ?? "").trim();

  let closesAtIso: string | null = null;

  if (rawClosesAt) {
    // Parse datetime-local input as Asia/Kolkata (+05:30)
    const normalized =
      rawClosesAt.length === 16 ? `${rawClosesAt}:00+05:30` : `${rawClosesAt}+05:30`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      redirect("/admin/submissions?error=window");
    }
    closesAtIso = parsed.toISOString();
  }

  const { error: upsertError } = await supabase
    .from("project_submission_settings")
    .upsert(
      {
        id: 1,
        is_open: isOpen,
        closes_at: closesAtIso,
      },
      { onConflict: "id" }
    );

  if (upsertError) {
    console.error("[updateSubmissionWindow] Supabase error:", upsertError);
    redirect("/admin/submissions?error=window");
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/dashboard/submission");
  revalidatePath("/dashboard");
  redirect("/admin/submissions?saved=window");
}

export async function reviewSubmission(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "pending").trim();
  const rawScore = String(formData.get("score") ?? "").trim();
  const judgeRemarks = String(formData.get("judge_remarks") ?? "").trim();

  if (!id) {
    redirect("/admin/submissions?error=review");
  }

  let score: number | null = null;
  if (rawScore !== "") {
    const parsedScore = Number(rawScore);
    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      redirect("/admin/submissions?error=review");
    }
    score = parsedScore;
  }

  const { error: updateError } = await supabase
    .from("project_submissions")
    .update({
      status,
      score,
      judge_remarks: judgeRemarks || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[reviewSubmission] Supabase error:", updateError);
    redirect("/admin/submissions?error=review");
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/dashboard/submission");
  revalidatePath("/dashboard");
  redirect("/admin/submissions?saved=review");
}