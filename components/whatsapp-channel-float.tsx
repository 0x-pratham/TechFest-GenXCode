function WhatsAppLogo({ className = "h-[22px] w-[22px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        d="M12.04 2C6.5 2 2 6.42 2 11.86c0 1.87.53 3.69 1.54 5.27L2.5 21.5l4.52-1.02a10.1 10.1 0 0 0 5.02 1.32h.01c5.54 0 10.04-4.42 10.04-9.86C22.09 6.42 17.58 2 12.04 2Zm5.86 14.02c-.25.7-1.45 1.34-2.02 1.42-.52.08-1.18.11-1.91-.12-.44-.14-1.01-.33-1.74-.64-3.06-1.3-5.06-4.35-5.21-4.55-.15-.2-1.25-1.64-1.25-3.13 0-1.49.79-2.22 1.07-2.52.28-.3.61-.38.81-.38.2 0 .41 0 .59.01.19.01.45-.07.7.53.25.61.86 2.08.94 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.45.54-.15.15-.31.32-.13.62.18.3.78 1.27 1.68 2.06 1.15 1.01 2.13 1.33 2.43 1.48.3.15.48.13.66-.08.18-.2.76-.87.96-1.17.2-.3.41-.25.69-.15.28.1 1.79.83 2.1.98.3.15.51.23.58.35.08.13.08.73-.17 1.43Z"
      />
    </svg>
  );
}

export function WhatsAppChannelFloat({ url }: { url: string | null }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join the official GenXCode WhatsApp Channel"
      title="Join the official GenXCode WhatsApp Channel"
      style={{
        bottom: "calc(1rem + env(safe-area-inset-bottom))",
        right: "calc(1rem + env(safe-area-inset-right))",
      }}
      className="group fixed z-50 inline-flex h-14 w-14 min-w-14 items-center justify-center gap-2 rounded-full bg-[#168a45] px-4 text-white shadow-lg shadow-green-900/20 transition-all duration-200 hover:bg-[#11763a] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-200 sm:h-auto sm:w-auto sm:justify-start sm:px-5 sm:py-3.5"
    >
      <WhatsAppLogo className="h-6 w-6 shrink-0" />
      <span className="hidden whitespace-nowrap text-sm font-semibold sm:inline">
        Join WhatsApp Channel
      </span>
    </a>
  );
}