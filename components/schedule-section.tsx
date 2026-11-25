"use client";

import { motion, type Variants } from "framer-motion";
import { CalendarDays, Code2, GraduationCap, Trophy } from "lucide-react";

const days = [
  {
    day: "Day One",
    date: "5th Dec",
    label: "Learn",
    title: "AI Workshop.",
    description:
      "Take off with GenXCode! An AI-focused workshop to learn the tools and ideas that will power your build.",
    icon: GraduationCap,
  },
  {
    day: "Day Two",
    date: "6th Dec",
    label: "Build",
    title: "Hackathon PromptWars.",
    description:
      "An intense Hack2Skill powered hackathon. Experiment, build, and ship something that matters.",
    icon: Code2,
  },
  {
    day: "Day Three",
    date: "7th Dec",
    label: "Pitch",
    title: "Make your work count.",
    description:
      "The top 60 shortlisted students take the stage for the pitching round, judging and prizes.",
    icon: Trophy,
  },
];

export function ScheduleSection() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
  };

  return (
    <section
      id="schedule"
      className="relative isolate overflow-hidden bg-[#fcfaff] py-20 sm:py-28 lg:py-36"
    >
      {/* Soft Ambient Background Glow for the Glassmorphism to pop against */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[800px] w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(199,166,243,0.15),transparent_60%)] blur-3xl"
      />

      <div className="container-shell">
        {/* Sleek, Minimal Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end lg:mb-20"
        >
          <div>
            <p className="eyebrow mb-4 text-[#8638cd]">
              The Journey · 5th – 7th Dec
            </p>
            <h2 className="editorial text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.05] tracking-tight text-[#220749]">
              Three days.
              <br />
              <span className="text-purple-gradient italic">Three chapters.</span>
            </h2>
          </div>

          <p className="max-w-[360px] text-[15.5px] leading-relaxed text-[#76678a]">
            A structured progression designed to take you from a raw concept to
            a fully functional prototype. No shortcuts, just pure building.
          </p>
        </motion.div>

        {/* Glassy, Minimal Card Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-3 lg:gap-8"
        >
          {days.map((item) => {
            const Icon = item.icon;

            return (
              <motion.article
                variants={cardVariants}
                key={item.day}
                className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[2rem] border border-[#eadff5] bg-white/60 p-8 shadow-[0_8px_30px_rgba(34,4,75,0.02)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#d8c5ee] hover:bg-white/80 hover:shadow-[0_20px_40px_rgba(95,34,149,0.06)]"
              >
                {/* Top Section: Icon & Day + Date Highlight */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#f4effc] text-[#5f2295] ring-1 ring-[#eadff5]/50 transition-colors duration-300 group-hover:bg-[#5f2295] group-hover:text-white group-hover:ring-[#5f2295]">
                    <Icon strokeWidth={1.5} className="size-6" />
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2 rounded-full border border-[#eadff5] bg-white/70 px-3.5 py-1 shadow-sm transition-colors duration-300 group-hover:border-[#d8c5ee]">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8638cd]">
                        {item.day}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#5f2295] to-[#8638cd] px-3 py-1 text-white shadow-[0_6px_16px_rgba(95,34,149,0.22)]">
                      <CalendarDays strokeWidth={2} className="size-3 shrink-0" />
                      <span className="text-[11px] font-bold tracking-wide">
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Typography */}
                <div className="mt-12">
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[#8d7ba3]">
                    {item.label}
                  </p>
                  <h3 className="editorial mb-3 text-[1.6rem] leading-tight text-[#220749] transition-colors duration-300 group-hover:text-[#5f2295] sm:text-[1.8rem]">
                    {item.title}
                  </h3>
                  <p className="text-[14.5px] leading-relaxed text-[#76678a]">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}