import { redirect } from "next/navigation";

export default async function LegacyHack2SkillRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ h2s?: string }>;
}) {
  const params = await searchParams;
  redirect(params.h2s === "done" ? "/dashboard?h2s=done" : "/dashboard");
}