import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface NavbarProps {
  ctaHref?: string;
  ctaLabel?: string;
  children?: ReactNode;
}

const UNIFIED_NAV_BTN =
  "group relative inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-xl border border-[#dfcdf5] bg-gradient-to-b from-white via-[#faf6ff] to-[#f1e6fd] px-3.5 py-2 sm:px-4 text-[12px] sm:text-[12.5px] font-semibold tracking-tight text-[#3d1173] shadow-[0_2px_10px_rgba(95,34,149,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c7a6f3] hover:from-[#fcfaff] hover:via-[#f5ecff] hover:to-[#ebdcfa] hover:text-[#220749] hover:shadow-[0_6px_18px_rgba(95,34,149,0.12)] active:translate-y-0";

export function Navbar({ ctaHref, ctaLabel, children }: NavbarProps) {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <header className="flex w-full max-w-[960px] flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#eadff5]/80 bg-white/85 px-3 py-2 shadow-[0_8px_32px_rgba(34,4,75,0.06)] backdrop-blur-xl sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-2.5">
        {/* Brand Logo & Text */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3 pl-1 transition-all sm:pl-2"
        >
          <div className="transition-transform duration-200 group-hover:rotate-6 group-hover:scale-105">
            <Image
              src="/genxcode-mark.webp"
              alt="GenXCode Logo"
              width={36}
              height={36}
              className="h-8 w-8 object-contain sm:h-9 sm:w-9"
              priority
            />
          </div>

          <span className="flex flex-col items-start justify-center pt-0.5">
            <span className="editorial text-[1.1rem] font-bold leading-none text-[#220749] transition-colors group-hover:text-[#5f2295] sm:text-[1.2rem]">
              GenXCode
            </span>
            <span className="mt-1 text-[0.55rem] font-extrabold uppercase tracking-[0.22em] text-[#8638cd] sm:text-[0.6rem]">
              Tech Fest
            </span>
          </span>
        </Link>

        {/* Right Side: Unified Light-Gradient Buttons Across All Pages */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 [&_a]:inline-flex [&_a]:min-h-9 sm:[&_a]:min-h-10 [&_a]:items-center [&_a]:gap-1.5 [&_a]:rounded-xl [&_a]:border [&_a]:border-[#dfcdf5] [&_a]:bg-gradient-to-b [&_a]:from-white [&_a]:via-[#faf6ff] [&_a]:to-[#f1e6fd] [&_a]:px-3.5 [&_a]:py-2 sm:[&_a]:px-4 [&_a]:text-[12px] sm:[&_a]:text-[12.5px] [&_a]:font-semibold [&_a]:text-[#3d1173] [&_a]:shadow-[0_2px_10px_rgba(95,34,149,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] [&_a]:transition-all [&_a]:duration-200 hover:[&_a]:-translate-y-0.5 hover:[&_a]:border-[#c7a6f3] hover:[&_a]:from-[#fcfaff] hover:[&_a]:via-[#f5ecff] hover:[&_a]:to-[#ebdcfa] hover:[&_a]:text-[#220749] hover:[&_a]:shadow-[0_6px_18px_rgba(95,34,149,0.12)] [&_button]:inline-flex [&_button]:min-h-9 sm:[&_button]:min-h-10 [&_button]:items-center [&_button]:gap-1.5 [&_button]:rounded-xl [&_button]:border [&_button]:border-[#dfcdf5] [&_button]:bg-gradient-to-b [&_button]:from-white [&_button]:via-[#faf6ff] [&_button]:to-[#f1e6fd] [&_button]:px-3.5 [&_button]:py-2 sm:[&_button]:px-4 [&_button]:text-[12px] sm:[&_button]:text-[12.5px] [&_button]:font-semibold [&_button]:text-[#3d1173] [&_button]:shadow-[0_2px_10px_rgba(95,34,149,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] [&_button]:transition-all [&_button]:duration-200 hover:[&_button]:-translate-y-0.5 hover:[&_button]:border-[#c7a6f3] hover:[&_button]:from-[#fcfaff] hover:[&_button]:via-[#f5ecff] hover:[&_button]:to-[#ebdcfa] hover:[&_button]:text-[#220749] hover:[&_button]:shadow-[0_6px_18px_rgba(95,34,149,0.12)]">
          {children ? (
            children
          ) : ctaHref && ctaLabel ? (
            <Link href={ctaHref} className={UNIFIED_NAV_BTN}>
              <span className="relative z-10 flex items-center gap-1.5">
                {ctaLabel}
                <ChevronRight
                  size={14}
                  className="text-[#6828a2] transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                />
              </span>
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-full" />
            </Link>
          ) : null}
        </div>
      </header>
    </div>
  );
}