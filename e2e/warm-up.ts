import type { FullConfig } from "@playwright/test";

/** Routes to compile before the tests start, so the first test doesn't time out. */
const ROUTES = [
  "/",
  "/examenes-oficiales",
  "/test-por-tema",
  "/test-por-tema/Balizamiento",
  "/test-aleatorio",
  "/repaso",
  "/patron-de-yate",
  "/patron-de-yate/examenes-oficiales",
  "/patron-de-yate/test-por-tema",
  "/patron-de-yate/test-aleatorio",
  "/sitemap.xml",
  "/robots.txt",
  "/api/questions?limit=1",
];

export default async function warmUp(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";
  for (const route of ROUTES) {
    const response = await fetch(`${baseURL}${route}`, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) {
      throw new Error(`Warm-up: ${route} returned ${response.status}. Is the app running (docker compose up)?`);
    }
  }
}
