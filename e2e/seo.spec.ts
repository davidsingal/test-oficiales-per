import { expect, test } from "@playwright/test";
import { LICENCE, api, latestExam } from "./helpers";

test.describe("SEO", () => {
  test("SEO-1: pages have a branded title, description, canonical URL and Open Graph tags", async ({ page }) => {
    const py = await latestExam(page, "py");
    const paths = ["/", "/examenes-oficiales", "/test-por-tema/Balizamiento", "/patron-de-yate", py.path];

    for (const path of paths) {
      await page.goto(path);
      await expect(page, path).toHaveTitle(/ \| Test Náutico$/);
      const head = page.locator("head");
      expect(await head.locator('meta[name="description"]').getAttribute("content"), path).toBeTruthy();
      const canonical = await head.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical, path).toMatch(/^https?:\/\//);
      expect(new URL(canonical!).pathname, path).toBe(path);
      await expect(head.locator('meta[property="og:site_name"]'), path).toHaveAttribute("content", "Test Náutico");
      expect(await head.locator('meta[property="og:title"]').getAttribute("content"), path).toBeTruthy();
    }
  });

  test("SEO-2: the sitemap lists every section, exam, topic and question page of both licences", async ({
    page,
    request,
  }) => {
    const examPaths: string[] = [];
    for (const licence of ["per", "py"] as const) {
      const { basePath } = LICENCE[licence];
      await page.goto(`${basePath}/examenes-oficiales`);
      examPaths.push(
        ...(await page
          .locator(`main a[href^="${basePath}/examenes-oficiales/"]`)
          .evaluateAll((nodes) => nodes.map((a) => a.getAttribute("href")!))),
      );
    }
    const topics = (await api<{ totalDocs: number }>(request, "topics?limit=1")).totalDocs;
    const questions = (await api<{ totalDocs: number }>(request, "questions?limit=1&depth=0")).totalDocs;

    const xml = await (await request.get("/sitemap.xml")).text();
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

    // 4 section pages per licence, plus exams, topics and questions.
    expect(paths).toHaveLength(8 + examPaths.length + topics + questions);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of ["/", "/patron-de-yate", "/patron-de-yate/test-aleatorio", ...examPaths]) {
      expect(paths, path).toContain(path);
    }
    expect(paths).toContain("/patron-de-yate/test-por-tema/Navegaci%C3%B3n%20carta");
  });

  test("SEO-3: robots.txt keeps out /admin and /api, and /repaso is noindex", async ({ page, request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Allow: \/\n/);
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);

    await page.goto("/repaso");
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("SEO-4: breadcrumbs emit BreadcrumbList structured data", async ({ page }) => {
    await page.goto("/patron-de-yate/test-por-tema");
    const json = await page.locator('nav[aria-label="Ruta de navegación"] script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json!) as {
      "@type": string;
      itemListElement: { position: number; name: string; item?: string }[];
    };
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement.map((item) => [item.position, item.name])).toEqual([
      [1, "Inicio"],
      [2, "Patrón de Yate"],
      [3, "Test por tema"],
    ]);
    expect(new URL(data.itemListElement[1].item!).pathname).toBe("/patron-de-yate");
  });
});
