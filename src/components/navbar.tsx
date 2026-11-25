"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnchorIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/examenes-oficiales", label: "Exámenes oficiales", shortLabel: "Exámenes" },
  { href: "/test-por-tema", label: "Test por tema", shortLabel: "Por tema" },
  { href: "/test-aleatorio", label: "Test aleatorio", shortLabel: "Aleatorio" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <nav
        className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2"
        aria-label="Navegación principal"
      >
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 py-1.5 text-sm font-semibold"
        >
          <AnchorIcon className="size-4" />
          PER
        </Link>

        <ul className="flex items-center gap-1">
          {links.map((link) => {
            // A section stays highlighted on its subpages (an exam, a topic).
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-muted",
                    isActive && "bg-muted font-medium",
                  )}
                >
                  <span className="sm:hidden">{link.shortLabel}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
