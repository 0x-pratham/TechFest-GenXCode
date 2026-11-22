"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

export interface SponsorItem {
  id: string;
  name: string;
  logoSrc?: string;
  href?: string;
  bgClass?: string;
  paddingClass?: string;
  renderFallbackTile?: () => ReactNode;
}

function H2sFallbackTile() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white px-6">
      <span className="editorial text-2xl font-normal tracking-tight text-[#1b053e] sm:text-3xl">
        H2S · Hack2Skill
      </span>
    </div>
  );
}

function GoogleDevelopersFallbackTile() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white px-6">
      <span className="font-sans text-xl font-medium tracking-tight text-[#1b053e] sm:text-2xl">
        Google for Developers
      </span>
    </div>
  );
}

const SPONSORS: SponsorItem[] = [
  {
    id: "cosmolix",
    name: "Cosmolix Pvt Ltd",
    logoSrc: "https://i.ibb.co/G37pBN3P/Cosmo-Picto-Icon.png",
    href: "https://cosmolix.co.in",
    bgClass: "bg-white",
    paddingClass: "p-3.5 sm:p-5",
  },
  {
    id: "athena-powertech",
    name: "Athena Powertech LLP",
    logoSrc: "https://i.ibb.co/Q7F5SmfW/DOC-20261122-WA0127page-0001.jpg",
    bgClass: "bg-white",
    paddingClass: "p-3.5 sm:p-5",
  },
  {
    id: "backlog-chai-wala",
    name: "BackLog Chai Wala",
    logoSrc: "https://i.ibb.co/C38BHXBG/IMG-1409.jpg",
    bgClass: "bg-[#111011]",
    paddingClass: "p-2.5 sm:p-3",
  },
  {
    id: "city-samosa",
    name: "City Samosa",
    logoSrc: "https://i.ibb.co/21g5TdJ8/City-Samosa.png",
    href: "https://citysamosa.com",
    bgClass: "bg-white",
    paddingClass: "p-3 sm:p-4",
  },
  {
    id: "hack2skill",
    name: "Hack2Skill",
    logoSrc: "https://i.ibb.co/Q7kw560X/H2-S-Gradient-Logo-no-bg.png",
    bgClass: "bg-white",
    paddingClass: "p-3 sm:p-4",
    renderFallbackTile: () => <H2sFallbackTile />,
  },
  {
    id: "google-for-developers",
    name: "Google for Developers",
    logoSrc: "https://i.ibb.co/DmmyBZ6/google-developers.png",
    bgClass: "bg-white",
    paddingClass: "p-3 sm:p-4",
    renderFallbackTile: () => <GoogleDevelopersFallbackTile />,
  },
];

function SponsorTile({
  sponsor,
  onCardHoverChange,
}: {
  sponsor: SponsorItem;
  onCardHoverChange: (hovered: boolean) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hasUrl = Boolean(sponsor.href && sponsor.href.trim().length > 0);
  const showImageLogo = Boolean(sponsor.logoSrc) && !imgFailed;
  const isDarkTile = sponsor.bgClass === "bg-[#111011]";

  const handleEnter = () => {
    setIsHovered(true);
    onCardHoverChange(true);
  };

  const handleLeave = () => {
    setIsHovered(false);
    onCardHoverChange(false);
  };

  const card = (
    <div className="flex flex-col items-center">
      <motion.div
        onHoverStart={handleEnter}
        onHoverEnd={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        animate={{
          y: isHovered ? -2 : 0,
        }}
        transition={{
          duration: 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`group relative aspect-[16/10] w-64 shrink-0 overflow-hidden rounded-2xl border border-[#e6e1d8] shadow-[0_1px_2px_rgba(24,20,32,0.04)] transition-[border-color,box-shadow] duration-300 ease-out hover:border-[#cfc8bc] hover:shadow-[0_10px_24px_-8px_rgba(24,20,32,0.10)] sm:w-80 ${
          sponsor.bgClass ?? "bg-white"
        }`}
      >
        {/* Subtle inner hairline rim for glass/ceramic polish */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-20 rounded-2xl ring-1 ring-inset ${
            isDarkTile ? "ring-white/10" : "ring-black/[0.02]"
          }`}
        />

        {/* Natural, slow specular shine sweep */}
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{
            x: isHovered ? "280%" : "-150%",
            opacity: isHovered ? 0.85 : 0,
          }}
          transition={{
            x: isHovered
              ? { duration: 1.65, ease: [0.25, 0.1, 0.25, 1] }
              : { duration: 0 },
            opacity: { duration: 0.4, ease: "easeOut" },
          }}
          className={`pointer-events-none absolute inset-y-0 left-0 z-20 w-2/3 -skew-x-12 bg-gradient-to-r from-transparent ${
            isDarkTile ? "via-white/12" : "via-white/60"
          } to-transparent`}
        />

        {showImageLogo ? (
          <div
            className={`flex h-full w-full items-center justify-center ${
              sponsor.paddingClass ?? "p-3.5 sm:p-5"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sponsor.logoSrc}
              alt={sponsor.name}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-contain object-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
            />
          </div>
        ) : sponsor.renderFallbackTile ? (
          <div className="h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]">
            {sponsor.renderFallbackTile()}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#faf9f6] px-5 text-center">
            <span className="editorial text-2xl font-normal tracking-[-0.01em] text-[#1d1a18] sm:text-3xl">
              {sponsor.name}
            </span>
          </div>
        )}
      </motion.div>

      {/* Minimal non-bold name revealed below the card on hover */}
      <motion.div
        initial={false}
        animate={{
          opacity: isHovered ? 1 : 0,
          y: isHovered ? 0 : -3,
        }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none mt-2.5 text-center"
      >
        <span className="block whitespace-nowrap text-xs font-normal tracking-[0.02em] text-[#6b6475] sm:text-[13px]">
          {sponsor.name}
        </span>
      </motion.div>
    </div>
  );

  if (hasUrl) {
    return (
      <a
        href={sponsor.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={sponsor.name}
        className="inline-flex shrink-0 items-start pt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1a18]/30 focus-visible:ring-offset-2"
      >
        {card}
      </a>
    );
  }

  return <div className="inline-flex shrink-0 items-start pt-1">{card}</div>;
}

export function SponsorStrip() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <section
      aria-label="Our Sponsors and Partners"
      className="relative w-full overflow-hidden border-y border-[#ebe6de] bg-white py-12 sm:py-16"
    >
      <div className="container-shell mb-8 text-center sm:mb-11">
        <h2 className="editorial text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-[#1b053e] sm:text-4xl">
          Our Sponsors{" "}
          <span className="italic font-normal text-[#6828a2]">&amp;</span>{" "}
          Partners
        </h2>
      </div>

      {/* Pure white edge fade masks */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent sm:w-24"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent sm:w-24"
      />

      {/* Seamless continuous marquee — pauses only when cursor is on a logo card */}
      <div className="flex w-max overflow-visible py-1">
        <div
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
          className="animate-sponsor-marquee flex shrink-0 items-start gap-6 pr-6 sm:gap-8 sm:pr-8"
        >
          {SPONSORS.map((sponsor) => (
            <SponsorTile
              key={`track-a-${sponsor.id}`}
              sponsor={sponsor}
              onCardHoverChange={setIsPaused}
            />
          ))}
        </div>

        <div
          aria-hidden="true"
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
          className="animate-sponsor-marquee flex shrink-0 items-start gap-6 pr-6 sm:gap-8 sm:pr-8"
        >
          {SPONSORS.map((sponsor) => (
            <SponsorTile
              key={`track-b-${sponsor.id}`}
              sponsor={sponsor}
              onCardHoverChange={setIsPaused}
            />
          ))}
        </div>
      </div>
    </section>
  );
}