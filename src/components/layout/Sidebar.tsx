"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    ),
  },
  {
    href: "/assistant",
    label: "Daily Assistant",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // A path is active if it matches exactly (for "/") or starts with the href
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-sidebar fixed inset-y-0 left-0 flex flex-col bg-teal z-20">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {/* TDN monogram */}
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="font-heading text-xs font-bold text-white/80 tracking-tight leading-none">
              TDN
            </span>
          </div>
          <div>
            <p className="font-heading text-sm font-semibold text-white/90 leading-tight tracking-wide">
              Marketing Engine
            </p>
            <p className="text-2xs text-white/35 tracking-wider mt-0.5">
              The Design Nature
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="section-label text-white/20 px-2 mb-3">Operations</p>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              isActive(item.href)
                ? "bg-white/12 text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
          >
            <span
              className={cn(
                "flex-shrink-0 transition-colors",
                isActive(item.href) ? "text-white/80" : "text-white/40"
              )}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="section-label text-white/20 px-2 mb-3">Clients</p>
          {[
            { id: "powershift", name: "Powershift" },
            { id: "kkcs", name: "KKCS" },
            { id: "caloundra-city-auto", name: "Caloundra City Auto" },
            { id: "caloundra-mazda", name: "Caloundra Mazda" },
            { id: "foundation-home", name: "Foundation Home Mods" },
            { id: "sell-a-car", name: "Sell a Car" },
            { id: "study-hub", name: "Study Hub" },
          ].map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                pathname === `/clients/${client.id}`
                  ? "bg-white/12 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <span className="w-1 h-1 rounded-full bg-current flex-shrink-0 opacity-60" />
              {client.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-2xs text-white/20 leading-relaxed">
          AI outputs are mock data.
          <br />
          Connect OpenClaw to go live.
        </p>
      </div>
    </aside>
  );
}
