import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AnniversaryShowcase } from "@/components/anniversary-showcase";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedDestination } from "@/lib/auth/get-authenticated-destination";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { ArrowUpRight, Check } from "lucide-react";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const requested = params.next ?? "/signup";
  const nextPath =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/signup";

  const supabase = await createClient();
  const destination = await getAuthenticatedDestination(supabase, nextPath);
  if (destination) redirect(destination);

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-x-clip bg-white text-[#220749] lg:h-[100dvh] lg:overflow-hidden">
      <Navbar ctaHref="#signin" ctaLabel="Get your Pass" />

      {/* Centered Two-Column Stage Aligned with Navbar */}
      <div className="mx-auto grid w-full max-w-[1140px] flex-1 grid-cols-1 items-stretch px-5 pb-6 pt-24 sm:px-8 sm:pb-7 sm:pt-28 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pb-8 lg:pt-28 xl:gap-14">
        {/* LEFT PANEL: Compact Interactive One-Year Column */}
        <AnniversaryShowcase />

        {/* RIGHT PANEL: Sign-In & Pass Details Column */}
        <section
          id="signin"
          className="flex h-full flex-col justify-between py-2 lg:col-span-7 lg:py-7 xl:py-8"
        >
          {/* Main Editorial Content */}
          <div className="my-auto w-full">
            <p className="editorial text-[17px] italic font-normal tracking-[-0.01em] text-[#5f2295] sm:text-[19px]">
              First Anniversary Edition
            </p>

            <h1 className="editorial mt-1.5 text-[2.35rem] font-bold leading-[1.03] tracking-[-0.035em] text-[#220749] sm:text-[3.1rem] xl:text-[3.5rem]">
              Claim your{" "}
              <span className="italic font-normal text-[#8638cd]">free</span>{" "}
              event pass.
            </h1>

            <p className="mt-3 max-w-[540px] text-[14.5px] leading-[1.6] text-[#76678a] sm:mt-3.5 sm:text-[15.5px]">
              To celebrate one year of GenXCode, every pass for the Tech Fest
              &amp; Hackathon is completely free. Sign in with Google to
              register your spot and unlock your digital entry badge.
            </p>

            {/* Primary Sign-In Action */}
            <div className="mt-5 w-full max-w-[380px] sm:mt-6">
              <GoogleAuthButton nextPath={nextPath} />
            </div>

            {/* Two-Column Editorial Spec Grid */}
            <div className="mt-6 grid grid-cols-1 gap-5 border-t border-[#eadff5] pt-5 sm:mt-7 sm:grid-cols-12 sm:gap-6 sm:pt-5">
              {/* Column 1: Pass Inclusions */}
              <div className="sm:col-span-7">
                <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#220749] sm:text-[14px]">
                  Included with your pass
                </p>
                <ul className="mt-2.5 space-y-2 text-[13.5px] text-[#220749] sm:text-[14px]">
                  <li className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#5f2295]"
                      strokeWidth={2.2}
                    />
                    <span>3 different workshops across dedicated sessions</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#5f2295]"
                      strokeWidth={2.2}
                    />
                    <span>PromptWars &amp; pitching arenas</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#5f2295]"
                      strokeWidth={2.2}
                    />
                    <span>Instant digital QR entry pass</span>
                  </li>
                </ul>
              </div>

              {/* Column 2: Registration Details */}
              <div className="border-t border-[#eadff5] pt-4 sm:col-span-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#220749] sm:text-[14px]">
                  Pass details
                </p>
                <dl className="mt-2.5 grid grid-cols-2 gap-3 text-[13.5px] sm:grid-cols-1 sm:space-y-2.5 sm:text-[14px]">
                  <div>
                    <dt className="text-[#76678a]">Admission</dt>
                    <dd className="mt-0.5 font-semibold text-[#5f2295]">
                      Complimentary (1st Anniversary)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#76678a]">Check-in</dt>
                    <dd className="mt-0.5 font-medium text-[#220749]">
                      Issued after registration
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Footer Bar Matching Left Column Baseline */}
          <footer className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-[#eadff5] pt-3.5 text-[12.5px] text-[#76678a]">
            <a
              href="https://genxcode.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[#5f2295] transition-colors hover:text-[#220749]"
            >
              GenXCode Community
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/#schedule"
              className="transition-colors hover:text-[#5f2295]"
            >
              View event schedule
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}