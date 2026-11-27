"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnchorIcon } from "lucide-react";
import { LICENCES, licenceForPath } from "@/lib/licences";
import { SITE_NAME } from "@/lib/seo";
import { cn } from "@/lib/utils";

const sections = [
  { path: "/examenes-oficiales", label: "Exámenes oficiales", shortLabel: "Exámenes" },
  { path: "/test-por-tema", label: "Test por tema", shortLabel: "Temas" },
  { path: "/test-aleatorio", label: "Test aleatorio", shortLabel: "Aleatorio" },
];

export function Navbar() {
  const pathname = usePathname();
  // The sections link to the licence being browsed. Shared pages (a question,
  // the review of failed questions) fall back to PER.
  const current = licenceForPath(pathname);

  return (
    <header className="border-b bg-background/60">
      <nav
        className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:gap-3"
        aria-label="Navegación principal"
      >
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Small screens only fit the anchor: the name shows from sm up. */}
          <Link
            href="/"
            aria-label={SITE_NAME}
            className="inline-flex items-center gap-2 py-1 text-sm font-semibold"
          >
            <span className="inline-flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-7">
              <AnchorIcon className="size-4" />
            </span>
            <span className="hidden sm:inline">{SITE_NAME}</span>
          </Link>
          <ul aria-label="Titulación" className="flex items-center rounded-lg bg-muted p-0.5 text-sm font-semibold">
            {Object.values(LICENCES).map((licence) => (
              <li key={licence.id}>
                <Link
                  href={licence.basePath || "/"}
                  title={licence.name}
                  aria-current={licence.id === current.id ? "true" : undefined}
                  className={cn(
                    "block rounded-md px-1.5 py-1 text-muted-foreground sm:px-2 transition-colors hover:text-foreground",
                    licence.id === current.id && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {licence.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <ul className="flex items-center sm:gap-1">
          {sections.map((section) => {
            const href = `${current.basePath}${section.path}`;
            // A section stays highlighted on its subpages (an exam, a topic).
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={section.path}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm whitespace-nowrap sm:px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <span className="sm:hidden">{section.shortLabel}</span>
                  <span className="hidden sm:inline">{section.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
