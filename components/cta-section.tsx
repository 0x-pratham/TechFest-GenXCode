interface CtaSectionProps {
  ctaHref: string;
  ctaLabel: string;
}

export function CtaSection({ ctaHref, ctaLabel }: CtaSectionProps) {
  return (
    <section id="about" suppressHydrationWarning className="hero-shell py-5 sm:py-8">
      <div suppressHydrationWarning className="cta-panel card-hover reveal-on-scroll grid items-center gap-6 px-5 py-7 sm:gap-7 sm:px-10 sm:py-10 lg:grid-cols-[1fr_auto] lg:px-12 lg:py-11">
        <div className="relative z-10">
          <p className="cta-label eyebrow mb-3">YOUR MOVE</p>
          <h2 className="editorial max-w-[1120px] text-[clamp(2.2rem,7vw,4rem)] leading-[1.02] text-[#220749]">
            The next big thing <span className="text-purple-gradient italic">could start with you.</span>
          </h2>
          <p className="cta-muted mt-4 max-w-[600px] text-sm leading-6 sm:text-base">
            Bring a question. Leave with a prototype, a new perspective or a team that keeps building.
          </p>
        </div>
        <a href={ctaHref} className="cta-button relative z-10 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-[#5f2295] shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}