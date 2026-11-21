"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HackathonTeamIllustration } from "@/components/hackathon-team-illustration";

interface HeroSectionProps {
  ctaHref: string;
  ctaLabel: string;
}

export function HeroSection({ ctaHref, ctaLabel }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-[#fcfaff] pt-[120px] pb-12 sm:pt-[140px] sm:pb-16 lg:pt-[160px] lg:pb-24">
      
      {/* Engineered Ambient GPU-Accelerated Glows */}
      <div className="pointer-events-none absolute -left-36 top-8 size-[440px] rounded-full bg-gradient-to-tr from-[#c7a6f3]/30 to-[#8638cd]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-28 bottom-0 size-[420px] rounded-full bg-[#8638cd]/15 blur-[120px]" />

      <div className="container-shell relative z-10 grid w-full min-w-0 items-center gap-12 sm:gap-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-8">
        
        {/* LEFT COLUMN: Humanized Typography & Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-start"
        >
          {/* Fluid Typography using Clamp for perfect scaling */}
          <h1 className="editorial text-[clamp(3rem,9vw,4.5rem)] leading-[0.95] text-[#220749] sm:text-[clamp(4rem,7vw,6.5rem)]">
            Take off<br />
            <span className="pr-2 italic text-transparent bg-clip-text bg-gradient-to-r from-[#5f2295] to-[#8638cd]">with</span><br />
            GenXCode<span className="text-[#8638cd]">.</span>
          </h1>
          
          <p className="mt-7 max-w-[540px] text-[15.5px] leading-relaxed text-[#76678a] sm:text-[17px] sm:leading-8">
            Three days to learn, build and pitch. Bring your curiosity, meet fellow builders and turn a bold idea into something real.
          </p>
          
          <div className="mt-10 flex flex-wrap items-center gap-4" id="register">
            {/* Primary Action */}
            <motion.a 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={ctaHref} 
              className="btn-primary group relative overflow-hidden px-8 py-4 text-[14px]"
            >
              <span className="relative z-10 flex items-center gap-2">
                {ctaLabel}
                <ArrowRight size={16} className="transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </span>
              {/* CSS-only sweeping shine */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-full" />
            </motion.a>
            
            {/* Secondary Action */}
            <motion.a 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="#schedule" 
              className="purple-hover flex items-center gap-2 rounded-full px-6 py-4 text-[14px] font-bold text-[#76678a] transition-colors hover:bg-[#f4effc] hover:text-[#5f2295]"
            >
              Explore the event
            </motion.a>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Engineered Art Wrapper */}
        <motion.div 
          initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hero-art-wrap relative mx-auto flex w-full max-w-[640px] items-center justify-center lg:h-[600px]"
        >
          {/* Retained your global CSS orbits & sparkles */}
          <span className="hero-art-glow" aria-hidden="true" />
          <span className="hero-art-orbit hero-art-orbit-one" aria-hidden="true" />
          <span className="hero-art-orbit hero-art-orbit-two" aria-hidden="true" />
          <span className="hero-art-sparkle hero-art-sparkle-one" aria-hidden="true">✦</span>
          <span className="hero-art-sparkle hero-art-sparkle-two" aria-hidden="true">✦</span>
          
          {/* Gentle anti-gravity floating effect for the illustration */}
          <motion.div 
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 h-auto w-full max-w-[590px]"
          >
            <HackathonTeamIllustration className="h-full w-full object-contain" />
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}