"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB (2,621,440 bytes)
const ALLOWED_EXTENSIONS = [".ppt", ".pptx"];

export async function saveProjectSubmission(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth?next=/dashboard/submission");
  }

  const [{ data: candidateRegs }, { data: windowSettings }] = await Promise.all([
    supabase
      .from("registrations")
      .select("*")
      .or(
        user.email
          ? `created_by.eq.${user.id},email.eq.${user.email}`
          : `created_by.eq.${user.id}`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("project_submission_settings")
      .select("is_open,closes_at")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const rows = (candidateRegs ?? []) as Record<string, unknown>[];
  const registration =
    rows.find(
      (r) =>
        r.status === undefined ||
        r.status === null ||
        String(r.status).toLowerCase() === "confirmed" ||
        r.is_confirmed === true
    ) ??
    rows[0] ??
    null;

  if (!registration?.id) {
    redirect("/dashboard/submission?error=registration");
  }

  const registrationId = String(registration.id);

  const closesAtMs = windowSettings?.closes_at
    ? new Date(windowSettings.closes_at).getTime()
    : null;
  const isOpen = Boolean(
    windowSettings?.is_open &&
      (!closesAtMs || Number.isNaN(closesAtMs) || closesAtMs > Date.now())
  );

  if (!isOpen) {
    redirect("/dashboard/submission?error=closed");
  }

  const [{ data: existingSubmission }, { data: problemSelection }] =
    await Promise.all([
      supabase
        .from("project_submissions")
        .select("id,presentation_path,problem_statement_id")
        .eq("registration_id", registrationId)
        .maybeSingle(),
      supabase
        .from("registration_problem_statements")
        .select("problem_statement_id")
        .eq("registration_id", registrationId)
        .maybeSingle(),
    ]);

  const projectTitle = String(formData.get("project_title") ?? "").trim();
  const problemStatementId =
    problemSelection?.problem_statement_id ||
    (typeof registration.problem_statement_id === "string"
      ? registration.problem_statement_id
      : "") ||
    String(formData.get("problem_statement_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const solutionFeatures = String(
    formData.get("solution_features") ?? ""
  ).trim();
  const githubUrl = String(formData.get("github_url") ?? "").trim();
  const productionUrl = String(formData.get("production_url") ?? "").trim();
  const declaration = formData.get("declaration") === "on";

  if (
    !declaration ||
    projectTitle.length < 3 ||
    !problemStatementId ||
    description.length < 20 ||
    solutionFeatures.length < 10 ||
    !githubUrl.startsWith("https://") ||
    !productionUrl.startsWith("https://")
  ) {
    redirect("/dashboard/submission?error=validation");
  }

  let presentationPath = existingSubmission?.presentation_path ?? null;
  const fileEntry = formData.get("presentation");

  if (fileEntry instanceof File && fileEntry.size > 0) {
    const lowerName = fileEntry.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      lowerName.endsWith(ext)
    );

    if (!hasValidExt || fileEntry.size > MAX_FILE_BYTES) {
      redirect("/dashboard/submission?error=file");
    }

    const ext = lowerName.endsWith(".pptx") ? "pptx" : "ppt";
    const storagePath = `${registrationId}/presentation-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("project-presentations")
      .upload(storagePath, fileEntry, {
        upsert: true,
        contentType: fileEntry.type || undefined,
      });

    if (uploadError) {
      console.error("[saveProjectSubmission] Upload error:", uploadError);
      redirect("/dashboard/submission?error=upload");
    }

    presentationPath = storagePath;
  }

  if (!presentationPath) {
    redirect("/dashboard/submission?error=file");
  }

  const nowIso = new Date().toISOString();

  const { error: saveError } = await supabase
    .from("project_submissions")
    .upsert(
      {
        registration_id: registrationId,
        problem_statement_id: problemStatementId,
        project_title: projectTitle,
        description,
        solution_features: solutionFeatures,
        github_url: githubUrl,
        production_url: productionUrl,
        presentation_path: presentationPath,
        submitted_at: nowIso,
      },
      { onConflict: "registration_id" }
    );

  if (saveError) {
    console.error("[saveProjectSubmission] Database error:", saveError);
    redirect("/dashboard/submission?error=save");
  }

  revalidatePath("/dashboard/submission");
  revalidatePath("/dashboard");
  revalidatePath("/admin/submissions");
  redirect("/dashboard/submission?saved=1");
}