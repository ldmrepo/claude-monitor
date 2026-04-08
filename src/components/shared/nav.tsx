"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/tools", label: "Tools" },
  { href: "/tasks", label: "Tasks" },
  { href: "/alerts", label: "Alerts" },
  { href: "/events", label: "Events" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex h-12 items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight">
          Claude Monitor
        </Link>
        <nav className="flex gap-1" aria-label="Main navigation">
          {LINKS.map(({ href, label }) => {
            const isActive = href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
