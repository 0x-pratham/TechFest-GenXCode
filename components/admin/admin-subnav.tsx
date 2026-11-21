import Link from "next/link";
import { CalendarCog, FolderGit2, SlidersHorizontal } from "lucide-react";

type AdminSectionKey = "setup" | "operations" | "submissions";

interface AdminSubnavProps {
  active: AdminSectionKey;
}

const ADMIN_ROUTES: Array<{
  key: AdminSectionKey;
  href: string;
  label: string;
  icon: typeof CalendarCog;
}> = [
  {
    key: "setup",
    href: "/admin",
    label: "Event setup",
    icon: CalendarCog,
  },
  {
    key: "operations",
    href: "/admin/operations",
    label: "Operations & check-in",
    icon: SlidersHorizontal,
  },
  {
    key: "submissions",
    href: "/admin/submissions",
    label: "Submissions",
    icon: FolderGit2,
  },
];

export function AdminSubnav({ active }: AdminSubnavProps) {
  return (
    <nav
      aria-label="Admin workspace sections"
      className="mt-6 inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#eadff5] bg-white p-1.5 shadow-[0_6px_24px_rgba(34,4,75,0.03)]"
    >
      {ADMIN_ROUTES.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-[#5f2295] text-white shadow-xs"
                : "text-[#57436d] hover:bg-[#faf7ff] hover:text-[#220749]"
            }`}
          >
            <Icon size={14} className={isActive ? "text-white" : "text-[#5f2295]"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}