import { expect, test, type Page } from "@playwright/test";

const nav = (page: Page) => page.getByRole("navigation", { name: "Navegación principal" });

test.describe("NAV · navbar", () => {
  test("NAV-1: brand, licence switch and sections follow the licence being browsed", async ({ page }) => {
    await page.goto("/patron-de-yate/test-por-tema");
    await expect(nav(page).getByRole("link", { name: "Test Náutico" })).toHaveAttribute("href", "/");

    const switcher = nav(page).getByRole("list", { name: "Titulación" });
    await expect(switcher.getByRole("link", { name: "PY" })).toHaveAttribute("aria-current", "true");
    await expect(switcher.getByRole("link", { name: "PER" })).not.toHaveAttribute("aria-current", "true");

    for (const [name, href] of [
      ["Exámenes oficiales", "/patron-de-yate/examenes-oficiales"],
      ["Test por tema", "/patron-de-yate/test-por-tema"],
      ["Test aleatorio", "/patron-de-yate/test-aleatorio"],
    ]) {
      await expect(nav(page).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    await expect(nav(page).getByRole("link", { name: "Test por tema" })).toHaveAttribute("aria-current", "page");

    // Switching licence moves the sections back to the root.
    await switcher.getByRole("link", { name: "PER" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(nav(page).getByRole("link", { name: "Test por tema" })).toHaveAttribute("href", "/test-por-tema");
  });

  for (const width of [360, 390]) {
    test(`NAV-1 / NAV-2: at ${width}px the navbar shows the anchor without the name and doesn't scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/", "/patron-de-yate/examenes-oficiales"]) {
        await page.goto(path);
        const brand = nav(page).getByRole("link", { name: "Test Náutico" });
        await expect(brand.locator("svg")).toBeVisible();
        await expect(brand.getByText("Test Náutico")).toBeHidden();
        const overflow = await nav(page).evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});
