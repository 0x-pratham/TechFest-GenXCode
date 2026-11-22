
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type VolunteerActionState = {
  ok: boolean;
  message: string;
} | null;

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Session expired. Please sign in again.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error("Only event admins can manage volunteer accounts.");
  }

  return { supabase, adminUserId: user.id };
}

export async function createOrAssignVolunteer(
  _prevState: VolunteerActionState,
  formData: FormData
): Promise<VolunteerActionState> {
  try {
    const { adminUserId } = await requireAdmin();

    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const permission = String(formData.get("permission") ?? "both");

    if (!fullName || !email) {
      return { ok: false, message: "Full name and email are required." };
    }

    if (!["checkin", "snacks", "both"].includes(permission)) {
      return { ok: false, message: "Select a valid station permission." };
    }

    const supabaseAdmin = createAdminClient();

    // Check if an auth user already exists for this email.
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id,role")
      .ilike("email", email)
      .maybeSingle();

    let targetUserId = existingProfile?.id ?? null;

    if (!targetUserId) {
      if (password.length < 8) {
        return {
          ok: false,
          message: "Password must be at least 8 characters for a new volunteer.",
        };
      }

      const { data: created, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role: "volunteer" },
        });

      if (createError || !created.user) {
        return {
          ok: false,
          message:
            createError?.message || "Could not create volunteer auth account.",
        };
      }

      targetUserId = created.user.id;
    } else if (password.length > 0) {
      if (password.length < 8) {
        return {
          ok: false,
          message: "New password must be at least 8 characters.",
        };
      }

      const { error: updateAuthErr } =
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password,
          user_metadata: { full_name: fullName },
        });

      if (updateAuthErr) {
        return {
          ok: false,
          message: updateAuthErr.message || "Could not update password.",
        };
      }
    }

    // Ensure profiles row exists and reflects volunteer role
    // without downgrading an existing admin.
    await supabaseAdmin.from("profiles").upsert(
      {
        id: targetUserId,
        email,
        full_name: fullName,
        role: existingProfile?.role === "admin" ? "admin" : "volunteer",
      },
      { onConflict: "id" }
    );

    // Upsert into event_volunteers.
    const { data: existingVol } = await supabaseAdmin
      .from("event_volunteers")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    const payload = {
      user_id: targetUserId,
      email,
      full_name: fullName,
      permission,
      is_active: true,
      assigned_by: adminUserId,
    };

    const { error: volError } = existingVol?.id
      ? await supabaseAdmin
          .from("event_volunteers")
          .update(payload)
          .eq("id", existingVol.id)
      : await supabaseAdmin.from("event_volunteers").insert(payload);

    if (volError) {
      return {
        ok: false,
        message: volError.message || "Could not save volunteer permissions.",
      };
    }

    revalidatePath("/admin/operations");

    return {
      ok: true,
      message: `Volunteer ${fullName} (${email}) is active and ready to sign in at /volunteer/login.`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Failed to save volunteer.",
    };
  }
}

export async function toggleVolunteerStatus(formData: FormData) {
  const { adminUserId } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("is_active") === "true";

  if (!id) return;

  const supabaseAdmin = createAdminClient();

  await supabaseAdmin
    .from("event_volunteers")
    .update({ is_active: nextActive, assigned_by: adminUserId })
    .eq("id", id);

  revalidatePath("/admin/operations");
}

export async function updateVolunteerPermission(formData: FormData) {
  const { adminUserId } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const permission = String(formData.get("permission") ?? "");

  if (!id || !["checkin", "snacks", "both"].includes(permission)) return;

  const supabaseAdmin = createAdminClient();

  await supabaseAdmin
    .from("event_volunteers")
    .update({ permission, assigned_by: adminUserId })
    .eq("id", id);

  revalidatePath("/admin/operations");
}

export async function saveSnackPolicy(formData: FormData) {
  const { supabase } = await requireAdmin();

  const rawPolicy = String(formData.get("snack_policy") ?? "event")
    .trim()
    .toLowerCase();

  const policy = rawPolicy === "daily" ? "daily" : "event";

  const { error } = await supabase
    .from("event_schedule_settings")
    .upsert(
      {
        id: 1,
        snack_policy: policy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(error.message || "Failed to save snack policy.");
  }

  revalidatePath("/admin/operations");
}
