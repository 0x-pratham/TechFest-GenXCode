import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { SponsorStrip } from "@/components/sponsor-strip";
import { ScheduleSection } from "@/components/schedule-section";
import { ExperienceSection } from "@/components/experience-section";
import { CtaSection } from "@/components/cta-section";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedDestination } from "@/lib/auth/get-authenticated-destination";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://takeoff.genxcode.in";

export const metadata: Metadata = {
  title: "Take Off With GenXCode | Build What Matters",
  description:
    "Three days of AI workshops, PromptWars hackathon, and live pitching. Celebrate one year of GenXCode by Cosmolix.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: "Take Off With GenXCode | Build What Matters",
    description:
      "Three days of AI workshops, PromptWars hackathon, and live pitching. Celebrate one year of GenXCode by Cosmolix.",
    images: [
      {
        url: "/genxcode-hackathon-team.png",
        width: 1200,
        height: 630,
        alt: "Take Off With GenXCode — AI Workshop, PromptWars & Pitching",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Take Off With GenXCode | Build What Matters",
    description:
      "Three days of AI workshops, PromptWars hackathon, and live pitching. Celebrate one year of GenXCode by Cosmolix.",
    images: ["/genxcode-hackathon-team.png"],
  },
};

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "GenXCode by Cosmolix",
      url: SITE_URL,
      logo: `${SITE_URL}/genxcode-mark.webp`,
      parentOrganization: {
        "@type": "Organization",
        name: "Cosmolix Private Limited",
        url: "https://cosmolix.co.in",
      },
    },
    {
      "@type": "Event",
      "@id": `${SITE_URL}/#event`,
      name: "Take Off With GenXCode",
      description:
        "Three days of AI workshops, PromptWars hackathon, and live pitching. Celebrate one year of GenXCode by Cosmolix.",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      url: SITE_URL,
      image: [`${SITE_URL}/genxcode-hackathon-team.png`],
      organizer: {
        "@id": `${SITE_URL}/#organization`,
      },
      sponsor: [
        {
          "@type": "Organization",
          name: "Cosmolix Pvt Ltd",
          url: "https://cosmolix.co.in",
        },
        {
          "@type": "Organization",
          name: "Athena Powertech LLP",
        },
        {
          "@type": "Organization",
          name: "BackLog Chai Wala",
        },
        {
          "@type": "Organization",
          name: "City Samosa",
          url: "https://citysamosa.com",
        },
        {
          "@type": "Organization",
          name: "Hack2Skill",
        },
        {
          "@type": "Organization",
          name: "Google for Developers",
        },
      ],
      offers: {
        "@type": "Offer",
        name: "Complimentary Event Pass",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/auth`,
      },
    },
  ],
};

export default async function Home() {
  // 1. Fetch data & auth state
  const supabase = await createClient();
  const destination = await getAuthenticatedDestination(supabase);

  // 2. Compute dynamic props
  const ctaHref = destination ?? "/auth";
  const ctaLabel =
    destination === "/admin"
      ? "Admin Dashboard"
      : destination === "/volunteer/dashboard"
        ? "Volunteer Dashboard"
        : destination === "/dashboard"
          ? "Go to Dashboard"
          : destination === "/signup"
            ? "Complete Registration"
            : "Get your Pass";

  // 3. Render clean layout using components
  return (
    <main className="overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
      />
      <Navbar ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <HeroSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <SponsorStrip />
      <ScheduleSection />
      <ExperienceSection />
      <CtaSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <SiteFooter />
    </main>
  );
}