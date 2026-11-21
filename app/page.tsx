import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { ScheduleSection } from "@/components/schedule-section";
import { ExperienceSection } from "@/components/experience-section";
import { CtaSection } from "@/components/cta-section";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedDestination } from "@/lib/auth/get-authenticated-destination";

export default async function Home() {
  // 1. Fetch data & auth state
  const supabase = await createClient();
  const destination = await getAuthenticatedDestination(supabase);
  
  // 2. Compute dynamic props
  const ctaHref = destination ?? "/auth";
  const ctaLabel = destination === "/admin"
    ? "Admin Dashboard"
    : destination === "/volunteer/dashboard"
      ? "Volunteer Dashboard"
      : destination === "/dashboard"
        ? "Go to Dashboard"
        : destination === "/register"
          ? "Complete Registration"
          : "Get your Pass";

  // 3. Render clean layout using components
  return (
    <main className="overflow-hidden">
      <Navbar ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <HeroSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <ScheduleSection />
      <ExperienceSection />
      <CtaSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <SiteFooter />
    </main>
  );
}