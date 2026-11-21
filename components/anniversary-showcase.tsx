"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const TRACKS = [
  {
    id: "workshops",
    name: "Three Workshops",
    summary: "Dedicated sessions across three separate topics.",
  },
  {
    id: "promptwars",
    name: "PromptWars",
    summary: "Live rounds testing speed, clarity, and problem-solving.",
  },
  {
    id: "pitching",
    name: "Pitching Arena",
    summary: "Present what you built directly to peers and mentors.",
  },
];

export function AnniversaryShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <aside className="relative hidden h-full flex-col justify-between rounded-3xl bg-gradient-to-b from-[#f8f3ff] via-[#fcfaff] to-white p-7 lg:col-span-5 lg:flex xl:p-8">
      {/* Top Editorial Note */}
      <div>
        <p className="editorial text-[17px] italic text-[#5f2295]">
          One Year of GenXCode
        </p>
        <p className="mt-0.5 text-[13px] text-[#76678a]">
          Tech Fest &amp; Hackathon
        </p>
      </div>

      {/* Centerpiece: Typographic Statement + Interactive Track List */}
      <div className="my-auto py-4">
        <div className="flex items-baseline gap-3.5">
          <span className="editorial text-[4.75rem] font-bold leading-none tracking-[-0.05em] text-[#220749] xl:text-[5.5rem]">
            1
          </span>
          <p className="editorial text-[1.45rem] font-bold leading-[1.12] text-[#220749] xl:text-[1.6rem]">
            Year of building
            <br />
            <span className="italic font-normal text-[#8638cd]">
              together.
            </span>
          </p>
        </div>

        <p className="mt-3.5 text-[13.5px] leading-relaxed text-[#76678a]">
          Twelve months of late-night commits, community meetups, and shipping
          ideas—celebrated with free passes for everyone.
        </p>

        {/* Minimal Typographic Track List */}
        <div className="mt-6 border-t border-[#eadff5]">
          {TRACKS.map((track, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className="group relative flex w-full flex-col border-b border-[#eadff5] py-3 text-left transition-colors"
              >
                {isActive && (
                  <motion.span
                    layoutId="active-track-bar"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute -left-3 bottom-2.5 top-2.5 w-[2px] bg-[#5f2295]"
                  />
                )}

                <span
                  className={`text-[13.5px] font-semibold transition-colors ${
                    isActive
                      ? "text-[#220749]"
                      : "text-[#76678a] group-hover:text-[#220749]"
                  }`}
                >
                  {track.name}
                </span>

                {isActive && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    className="mt-1 text-[12.5px] leading-snug text-[#76678a]"
                  >
                    {track.summary}
                  </motion.p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Line Aligned with Right Footer */}
      <div className="border-t border-[#eadff5] pt-3.5 text-[12.5px] text-[#76678a]">
        Free entry for all registered builders.
      </div>
    </aside>
  );
}