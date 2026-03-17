"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/simular-examen", label: "Simular examen" },
  { href: "/test-por-tema", label: "Test por tema" },
  { href: "/test-aleatorio", label: "Test aleatorio" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(216,213,206,0.85)] bg-[rgba(248,245,239,0.85)] backdrop-blur-sm">
      <nav
        className="mx-auto flex min-h-[68px] w-[min(1120px,92vw)] flex-col justify-center gap-4 py-3 md:flex-row md:items-center md:justify-between md:py-0"
        aria-label="Navegacion principal"
      >
        <Link href="/" className="text-[1.08rem] font-extrabold text-[var(--ink)] no-underline">
          Simulador
        </Link>
        <div className="flex flex-wrap gap-[0.55rem]">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.8)] px-3 py-[0.45rem] text-[var(--ink)] no-underline transition-colors hover:border-[var(--accent)]" +
                  (isActive
                    ? " border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
