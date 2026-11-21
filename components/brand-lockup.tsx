import Image from "next/image";
import Link from "next/link";

type BrandLockupProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLockup({ className = "", priority = false }: BrandLockupProps) {
  return (
    <Link
      href="/"
      aria-label="GenXCode Tech Fest at JSPM University"
      className={`brand-lockup group ${className}`}
    >
      <Image
        src="/genxcode-mark.webp"
        alt="GenXCode Logo"
        width={48}
        height={48}
        priority={priority}
        className="brand-mark transition-transform duration-300 group-hover:scale-105"
      />
      <span className="brand-type flex flex-col">
        <span className="brand-name">GenXCode</span>
        <span className="brand-subtitle mt-0.5">
          TECH FEST @ JSPM UNIVERSITY
        </span>
        <span className="text-[0.45rem] font-bold tracking-[0.25em] text-[#8638cd] uppercase mt-0.5">
          Powered by Hack2Skill
        </span>
      </span>
    </Link>
  );
}