"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "Your priorities, client status, and actions in one place",
  },
  "/tasks": {
    title: "Tasks",
    subtitle: "Everything you need to do, ordered by what matters most",
  },
  "/assistant": {
    title: "Daily Assistant",
    subtitle: "What changed, what matters today, and what you should do next",
  },
};

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/clients/")) {
    return { title: "Client Detail", subtitle: "Performance data and insights" };
  }
  return PAGE_TITLES[pathname] ?? { title: "Marketing Engine", subtitle: "" };
}

export function TopBar() {
  const pathname = usePathname();
  const { title, subtitle } = getPageMeta(pathname);

  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="h-16 border-b border-sand/60 bg-white/70 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="font-heading text-lg font-semibold text-teal tracking-wide leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-teal/40 mt-0.5 leading-none">{subtitle}</p>
        )}
      </div>
      <p className="text-xs text-teal/35 font-medium">{today}</p>
    </header>
  );
}
