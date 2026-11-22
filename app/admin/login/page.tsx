import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { adminSignIn } from "@/app/admin/login/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Enter your admin email and password.",
  invalid: "Email or password is incorrect.",
  "not-admin": "This account does not have administrator access.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      redirect("/admin");
    }
  }

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#f9f6f1] px-4 py-12 text-[#1b053e]">
      <section className="mx-auto mt-10 max-w-md rounded-3xl border border-[#e3dbd0] bg-white p-7 shadow-[0_12px_36px_rgba(27,5,62,0.05)] sm:p-9">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#eadff5] bg-[#faf7ff] px-3 py-1 text-xs font-semibold text-[#5f2295]">
          <ShieldCheck size={14} />
          <span>GenXCode Admin Console</span>
        </div>

        <h1 className="editorial mt-4 text-4xl font-bold tracking-tight text-[#1b053e]">
          Admin sign in.
        </h1>
        <p className="mt-2.5 text-sm leading-6 text-[#5c4f6e]">
          Sign in directly with your administrator email and password to manage
          the event, operations, and submissions.
        </p>

        {params.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-[#f5c2c7] bg-[#fff1f2] p-3 text-xs font-semibold text-[#be123c] sm:text-sm"
          >
            {ERROR_MESSAGES[params.error] ?? "Unable to sign in."}
          </p>
        )}

        <form action={adminSignIn} className="mt-7 space-y-4">
          <label className="block text-xs font-semibold text-[#57436d]">
            Admin Email
            <input
              required
              name="email"
              type="email"
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-[#eadff5] bg-white px-4 py-3 text-sm text-[#1b053e] outline-none transition focus:border-[#5f2295] focus:ring-2 focus:ring-purple-100"
              placeholder="admin@genxcode.in"
            />
          </label>

          <label className="block text-xs font-semibold text-[#57436d]">
            Password
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-[#eadff5] bg-white px-4 py-3 text-sm text-[#1b053e] outline-none transition focus:border-[#5f2295] focus:ring-2 focus:ring-purple-100"
              placeholder="••••••••"
            />
          </label>

          <PendingSubmitButton
            pendingLabel="Signing in…"
            className="mt-2 w-full rounded-full bg-gradient-to-b from-[#6828a2] to-[#4f1982] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(95,34,149,0.22)] transition hover:from-[#7530b5] hover:to-[#5a1e94]"
          >
            Sign in to Admin Panel
          </PendingSubmitButton>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-[#f0e8f8] pt-4 text-xs font-semibold text-[#69408e]">
          <Link href="/volunteer/login" className="hover:text-[#1b053e]">
            Volunteer login
          </Link>
          <Link href="/login" className="hover:text-[#1b053e]">
            Participant login
          </Link>
        </div>
      </section>
    </main>
  );
}