import type { Metadata } from "next";

/** Brand in page titles and Open Graph tags. Neutral, since it covers PER and Patrón de Yate. */
export const SITE_NAME = "Test Náutico";

/**
 * Public address of the site, for canonical URLs, the sitemap and robots.txt.
 * Set NEXT_PUBLIC_SITE_URL once there is a domain; until then Vercel's
 * production address is used, or localhost in development.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

/** Cuts text at a word boundary, with an ellipsis, to fit titles and snippets. */
export const truncate = (text: string, maxLength: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).replace(/[\s,;:.]+$/, "")}…`;
};

/** Title, description, canonical URL and Open Graph tags for one page. */
export const pageMetadata = ({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata => ({
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    title,
    description,
    url: path,
    siteName: SITE_NAME,
    locale: "es_ES",
    type: "website",
  },
});
