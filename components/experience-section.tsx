"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Cpu, Trophy, Users } from "lucide-react";

const highlights = [
  { icon: Cpu, title: "Build with AI", text: "Explore real-world problem statements and emerging technologies." },
  { icon: Users, title: "Find your people", text: "Meet builders, mentors and students who love solving problems." },
  { icon: Trophy, title: "Show what you can do", text: "Present your work, get feedback and compete for recognition." },
];

export function ExperienceSection() {
  // Framer Motion variants for organic, humanized animation
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20, filter: "blur(4px)" },
    show: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 250, damping: 24 },
    },
  };

  return (
    <section
      id="experience"
      className="relative isolate overflow-hidden bg-[#fcfaff] py-20 sm:py-28 lg:py-36"
    >
      {/* Soft, organic ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_50%,rgba(199,166,243,0.2),transparent_60%)]"
      />

      <div className="container-shell grid items-start gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
        {/* LEFT COLUMN: Sticky Header & Floating Art */}
        <div className="relative top-0 flex flex-col pt-4 lg:sticky lg:top-32 lg:pt-0">
          <div className="mb-12">
            <p className="eyebrow mb-4 text-[#8638cd]">Why be here</p>
            <h2 className="editorial max-w-[600px] text-5xl leading-[1.05] text-[#220749] sm:text-6xl">
              More than an event.
              <br />
              <span className="text-purple-gradient italic">A place to begin.</span>
            </h2>
          </div>

          {/* Continuous "breathing" animation for a humanized feel */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            /* Reduced max-width here to shrink the image footprint */
            className="relative mx-auto flex w-full max-w-[350px] items-center justify-center lg:mx-0 lg:max-w-[420px]"
          >
            {/* Ambient glow behind image instead of a hard border */}
            <div className="absolute inset-10 z-0 rounded-full bg-gradient-to-tr from-[#c7a6f3]/40 to-transparent blur-3xl" />

            <Image
              src="/build-with-ai-illustration.png"
              alt="A student thinking through ideas while working at a laptop"
              width={500}
              height={500}
              loading="lazy"
              sizes="(min-width: 1024px) 40vw, 80vw"
              className="relative z-10 block h-auto w-full object-contain mix-blend-multiply drop-shadow-xl"
            />
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Fluid Narrative List (No Cards) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="relative py-4 pl-4 sm:pl-0 lg:py-16"
        >
          {/* Subtle timeline track connecting the items */}
          <div className="absolute left-[39px] top-10 bottom-10 hidden w-[2px] bg-gradient-to-b from-transparent via-[#d8c5ee]/60 to-transparent sm:block" />

          <div className="flex flex-col gap-12 sm:gap-16">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  variants={itemVariants}
                  key={item.title}
                  className="group relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8"
                >
                  {/* Organic Icon Bubble */}
                  <div className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-white shadow-sm ring-1 ring-[#d8c5ee]/60 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-md group-hover:shadow-[#c7a6f3]/30 group-hover:ring-[#c7a6f3] sm:size-[80px] sm:rounded-[1.75rem]">
                    <Icon
                      className="size-6 text-[#5f2295] transition-transform duration-500 group-hover:scale-110 sm:size-8"
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* Typography-focused content block */}
                  <div className="min-w-0 flex-1 pt-1 sm:pt-3">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="eyebrow text-[#8d7ba3]">0{index + 1}</span>
                      <div className="h-px w-8 bg-[#d8c5ee]/50 transition-all duration-500 group-hover:w-16 group-hover:bg-[#8638cd]/40" />
                    </div>
                    <h3 className="editorial text-2xl leading-tight text-[#220749] transition-colors duration-300 group-hover:text-[#5f2295] sm:text-[1.85rem]">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#5f5271] sm:text-[15.5px]">
                      {item.text}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}