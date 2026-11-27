import Link from "next/link";
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
  process.env.NEXT_PUBLIC_SITE_URL || "https://techfest.genxcode.in";

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
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "GenXCode",
      alternateName: ["Take Off With GenXCode", "GenXCode Tech Fest"],
      url: SITE_URL,
      inLanguage: "en-IN",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
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
      startDate: "2026-12-05T09:00:00+05:30",
      endDate: "2026-12-07T18:00:00+05:30",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      url: SITE_URL,
      image: [`${SITE_URL}/genxcode-hackathon-team.png`],
      location: {
        "@type": "Place",
        name: "JSPM University Campus",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Wagholi",
          addressLocality: "Pune",
          addressRegion: "Maharashtra",
          postalCode: "412207",
          addressCountry: "IN",
        },
      },
      performer: {
        "@id": `${SITE_URL}/#organization`,
      },
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
        validFrom: "2026-11-01T00:00:00+05:30",
        url: `${SITE_URL}/auth`,
      },
    },
  ],
};

const QUICK_FACTS = [
  {
    label: "Dates & Mode",
    value: "5th – 7th Dec · Offline",
    detail: "Three days across workshops, hackathon & pitching.",
  },
  {
    label: "Venue",
    value: "JSPM University, Pune",
    detail: "Wagholi campus — bring laptop, charger & college ID.",
  },
  {
    label: "Entry & Passes",
    value: "₹0 · Free Passes",
    detail: "Complimentary first-anniversary passes; open eligibility.",
  },
  {
    label: "Prize Pool",
    value: "₹50,000 Pool",
    detail: "Top 60 pitch finalists compete for prizes & recognition.",
  },
];

const COMMON_QUESTIONS = [
  {
    q: "Is there any registration fee?",
    a: "No. Passes are completely free (₹0) to celebrate one year of GenXCode. Get your pass on this portal and complete registration on Hack2Skill too.",
  },
  {
    q: "Who can participate?",
    a: "Students across colleges and branches are welcome. You pick your problem statement and submit your work inside your dashboard once registered.",
  },
  {
    q: "What happens across the three days?",
    a: "5th Dec covers AI workshops, 6th Dec is the PromptWars hackathon with breakfast & refreshments, and 7th Dec is live pitching for the top 60 with prize distribution.",
  },
  {
    q: "How do I enter the campus and get food/refreshments?",
    a: "Open your live QR pass in My Pass on your phone at check-in and hospitality counters—avoid screenshots since the code refreshes.",
  },
];

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

      {/* Event Essentials & Quick Answers for Students */}
      <section
        id="details"
        aria-labelledby="event-details-heading"
        className="border-t border-[#eadff5] bg-[#fcfaff] py-16 sm:py-24"
      >
        <div className="container-shell">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-3 text-[#8638cd]">Event Essentials</p>
              <h2
                id="event-details-heading"
                className="editorial text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[#220749] sm:text-4xl lg:text-5xl"
              >
                Everything you need{" "}
                <span className="italic font-normal text-[#5f2295]">
                  before day one.
                </span>
              </h2>
            </div>

            <Link
              href={ctaHref}
              className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#5f2295] underline decoration-[#c7a6f3] underline-offset-4 hover:text-[#220749]"
            >
              <span>{ctaLabel}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* 4-Card Snapshot */}
          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_FACTS.map((fact) => (
              <div
                key={fact.label}
                className="rounded-2xl border border-[#eadff5] bg-white p-5 shadow-[0_8px_24px_rgba(34,4,75,0.03)]"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8638cd]">
                  {fact.label}
                </p>
                <p className="editorial mt-1.5 text-xl font-bold text-[#220749] sm:text-2xl">
                  {fact.value}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#76678a] sm:text-[13px]">
                  {fact.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Straight Answers to Frequent Questions */}
          <div className="mt-8 rounded-[1.5rem] border border-[#eadff5] bg-white p-6 shadow-[0_12px_36px_rgba(34,4,75,0.03)] sm:p-8">
            <h3 className="editorial text-2xl font-bold text-[#220749]">
              Quick answers
            </h3>

            <dl className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {COMMON_QUESTIONS.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-[#f0e8f8] bg-[#fcfaff] p-5"
                >
                  <dt className="text-sm font-semibold text-[#220749] sm:text-[15px]">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-xs leading-relaxed text-[#76678a] sm:text-[13.5px]">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <CtaSection ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <SiteFooter />
    </main>
  );
}