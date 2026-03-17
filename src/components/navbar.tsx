"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

const links = [
  { href: "/examenes-oficiales", label: "Exámenes oficiales" },
  { href: "/test-por-tema", label: "Test por tema" },
  { href: "/test-aleatorio", label: "Test aleatorio" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <nav
        className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
        aria-label="Navegacion principal"
      >
        <Link href="/" className="text-sm font-semibold">
          Simulador
        </Link>

        <NavigationMenu className="max-w-full flex-none justify-start">
          <NavigationMenuList className="flex flex-wrap gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NavigationMenuItem key={link.href}>
                  <Link
                    href={link.href}
                    className={
                      "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted" +
                      (isActive ? " bg-muted" : "")
                    }
                  >
                    {link.label}
                  </Link>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </nav>
    </header>
  );
}
