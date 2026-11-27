import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Licence } from "@/lib/licences";
import { absoluteUrl } from "@/lib/seo";

export type Crumb = { label: string; href?: string };

/**
 * Where the page sits in the site, with real links up the tree. On small
 * screens only the parent is shown, as a back link. Pages of a licence other
 * than PER (which lives at the root) get its home as the second level.
 */
const Breadcrumbs = ({ items, licence }: { items: Crumb[]; licence?: Licence }) => {
  const trail: Crumb[] = [
    { label: "Inicio", href: "/" },
    ...(licence?.basePath ? [{ label: licence.name, href: licence.basePath }] : []),
    ...items,
  ];
  const parent = [...trail].reverse().find((crumb, index) => index > 0 && crumb.href);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href && { item: absoluteUrl(crumb.href) }),
    })),
  };

  return (
    <nav aria-label="Ruta de navegación" className="text-sm text-muted-foreground">
      <script
        type="application/ld+json"
        // "<" is escaped so a label cannot close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {parent?.href && (
        <Link
          href={parent.href}
          className="inline-flex items-center gap-1 hover:text-foreground sm:hidden"
        >
          <ChevronLeftIcon className="size-4" />
          {parent.label}
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-1 sm:flex">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="hover:text-foreground hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-foreground">
                  {crumb.label}
                </span>
              )}
              {!isLast && <ChevronRightIcon aria-hidden className="size-3.5" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
