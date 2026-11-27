import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  LICENCE,
  api,
  countQuestions,
  latestExam,
  shownQuestionIds,
  topicName,
  type ApiQuestion,
  type LicenceId,
} from "./helpers";

const questionsById = async (request: APIRequestContext, ids: number[]) =>
  (await api<{ docs: ApiQuestion[] }>(request, `questions?where[id][in]=${ids.join(",")}&depth=1&limit=${ids.length}`))
    .docs;

const topicsOf = async (request: APIRequestContext, licence: LicenceId) =>
  (
    await api<{ docs: { id: number; name: string }[] }>(
      request,
      `topics?where[licence][equals]=${licence}&limit=100&depth=0`,
    )
  ).docs;

const expectStatus = async (page: Page, path: string, status: number) => {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(status);
};

test.describe("LIC · licences", () => {
  test("LIC-2: PER keeps its root URLs and PY lives under /patron-de-yate", async ({ page }) => {
    for (const path of ["/", "/examenes-oficiales", "/test-por-tema", "/test-aleatorio", "/repaso"]) {
      await expectStatus(page, path, 200);
    }
    for (const path of ["", "/examenes-oficiales", "/test-por-tema", "/test-aleatorio"]) {
      await expectStatus(page, `/patron-de-yate${path}`, 200);
    }
  });

  for (const licence of ["per", "py"] as const) {
    test(`LIC-3 / EXAM-4: a ${licence.toUpperCase()} exam lists only its ${LICENCE[licence].questionCount} questions`, async ({
      page,
      request,
    }) => {
      const exam = await latestExam(page, licence);
      await page.goto(exam.path);
      const links = page.locator('details a[href^="/pregunta/"]');
      await expect(links).toHaveCount(LICENCE[licence].questionCount);

      const ids = (await links.evaluateAll((nodes) => nodes.map((a) => a.getAttribute("href")!))).map((href) =>
        Number(href.split("/").pop()),
      );
      const docs = await questionsById(request, ids);
      expect(new Set(docs.map((q) => q.licence))).toEqual(new Set([licence]));
    });
  }
});

test.describe("EXAM · official exams", () => {
  for (const licence of ["per", "py"] as const) {
    test(`EXAM-1: ${licence.toUpperCase()} exams are grouped by year, newest first, all under the licence`, async ({
      page,
    }) => {
      const { basePath } = LICENCE[licence];
      await page.goto(`${basePath}/examenes-oficiales`);

      const years = (await page.locator("main h2").allTextContents()).map(Number);
      expect(years.length).toBeGreaterThan(0);
      expect(years).toEqual([...years].sort((a, b) => b - a));

      const hrefs = await page
        .locator('main a[href*="/examenes-oficiales/"]')
        .evaluateAll((nodes) => nodes.map((a) => a.getAttribute("href")!));
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href).toMatch(new RegExp(`^${basePath}/examenes-oficiales/\\d{4}/[a-z]+/\\d+$`));
      }
    });
  }

  test("EXAM-3: tests that don't exist for the licence return 404", async ({ page }) => {
    const py = await latestExam(page, "py");
    await expectStatus(page, py.path, 200);
    // PY has no June sessions; PER does.
    await expectStatus(page, `/patron-de-yate/examenes-oficiales/${py.year}/junio/1`, 404);
    await expectStatus(page, `/examenes-oficiales/${py.year}/${py.month}/99`, 404);
    await expectStatus(page, "/examenes-oficiales/2026/nomes/1", 404);
    await expectStatus(page, "/patron-de-yate/no-existe", 404);
  });
});

test.describe("TOPIC · test por tema", () => {
  for (const licence of ["per", "py"] as const) {
    test(`TOPIC-1: the ${licence.toUpperCase()} topic list shows its own topics and question counts`, async ({
      page,
      request,
    }) => {
      const { basePath } = LICENCE[licence];
      const topics = await topicsOf(request, licence);
      await page.goto(`${basePath}/test-por-tema`);

      const cards = page.locator(`main a[href^="${basePath}/test-por-tema/"]`);
      await expect(cards).toHaveCount(topics.length);
      for (const topic of topics) {
        const total = await countQuestions(request, `where[topic][equals]=${topic.id}`);
        const card = cards.filter({ has: page.getByText(topic.name, { exact: true }) });
        await expect(card).toContainText(`${total} preguntas`);
      }
    });
  }

  test("TOPIC-2: a topic test draws 10 questions of that topic and licence; other licences' topics 404", async ({
    page,
    request,
  }) => {
    const [meteo] = (await topicsOf(request, "py")).filter((t) => t.name === "Meteorología");
    await page.goto("/patron-de-yate/test-por-tema/Meteorolog%C3%ADa");
    await expect(page.locator('[id^="question-"] h2').first()).toBeVisible();

    const ids = await shownQuestionIds(page);
    expect(ids).toHaveLength(10);
    const docs = await questionsById(request, ids);
    for (const question of docs) {
      expect(question.licence).toBe("py");
      expect(typeof question.topic === "object" ? question.topic.id : question.topic).toBe(meteo.id);
    }

    await expectStatus(page, "/patron-de-yate/test-por-tema/Balizamiento", 404);
    await expectStatus(page, "/test-por-tema/Navegaci%C3%B3n%20carta", 404);
  });

  test("TOPIC-3: chart topics say the printed chart is needed", async ({ page }) => {
    for (const licence of ["per", "py"] as const) {
      const { basePath, chartTopic } = LICENCE[licence];
      await page.goto(`${basePath}/test-por-tema`);
      const card = page.locator(`main a[href^="${basePath}/test-por-tema/"]`).filter({ hasText: chartTopic });
      await expect(card).toContainText("Necesitas la carta náutica impresa");

      await page.goto(`${basePath}/test-por-tema/${encodeURIComponent(chartTopic)}`);
      await expect(page.locator("main section p").first()).toContainText("Necesitas la carta náutica impresa");
    }
  });
});

test.describe("RAND · test aleatorio", () => {
  for (const licence of ["per", "py"] as const) {
    test(`RAND-1: ${licence.toUpperCase()} random tests draw 10 questions of the licence, never from the chart topic`, async ({
      page,
      request,
    }) => {
      const { basePath, chartTopic } = LICENCE[licence];
      // A few draws, since they are random.
      for (let draw = 0; draw < 3; draw += 1) {
        await page.goto(`${basePath}/test-aleatorio`);
        // The random test lets you pick the mode (QUIZ-3).
        await page.getByRole("button", { name: /^Práctica/ }).click();
        await expect(page.locator('[id^="question-"] h2').first()).toBeVisible();
        const ids = await shownQuestionIds(page);
        expect(ids).toHaveLength(10);
        for (const question of await questionsById(request, ids)) {
          expect(question.licence).toBe(licence);
          expect(topicName(question)).not.toBe(chartTopic);
        }
      }
    });
  }
});

test.describe("Q · question page", () => {
  test("Q-1 / Q-2: a PY question page links within its test and uses the PY licence", async ({ page, request }) => {
    const exam = await latestExam(page, "py");
    const { docs } = await api<{ docs: ApiQuestion[] }>(
      request,
      `questions?where[licence][equals]=py&where[year][equals]=${exam.year}&where[month][equals]=${exam.month}&where[testNumber][equals]=${exam.testNumber}&where[questionNumber][equals]=2&depth=1`,
    );
    const question = docs[0];
    await page.goto(`/pregunta/${question.id}`);

    await expect(page).toHaveTitle(new RegExp(`\\(PY ${exam.month} ${exam.year}\\)`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pregunta 2");
    await expect(page.locator("main")).toContainText("Del examen oficial de Patrón de Yate");

    const crumbs = page.getByRole("navigation", { name: "Ruta de navegación" });
    await expect(crumbs.getByRole("link", { name: "Patrón de Yate" })).toHaveAttribute("href", "/patron-de-yate");

    await expect(page.getByRole("link", { name: "← Pregunta 1" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pregunta 3 →" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hacer el examen completo" })).toHaveAttribute("href", exam.path);
    await expect(page.getByRole("link", { name: `Practicar ${topicName(question)}` })).toHaveAttribute(
      "href",
      `/patron-de-yate/test-por-tema/${encodeURIComponent(topicName(question)!)}`,
    );

    // Answering shows the correction right away.
    await page.locator(`#question-${question.id}`).getByRole("radio").first().click();
    await expect(page.locator(`#question-${question.id}`)).toContainText(/¡Correcto!|Incorrecto|anulada|no tiene respuesta/);
  });
});

test.describe("NAV · home pages", () => {
  test("NAV-3: each licence's home links its latest exam, its three sections and the other licence", async ({
    page,
  }) => {
    for (const licence of ["per", "py"] as const) {
      const { basePath } = LICENCE[licence];
      const exam = await latestExam(page, licence);
      await page.goto(basePath || "/");

      await expect(page.getByRole("link", { name: /^Hacer el último examen/ })).toHaveAttribute("href", exam.path);
      for (const section of ["examenes-oficiales", "test-por-tema", "test-aleatorio"]) {
        await expect(page.locator(`main a[href="${basePath}/${section}"]`)).toHaveCount(1);
      }
      const other = licence === "per" ? "/patron-de-yate" : "/";
      await expect(page.locator(`main a[href="${other}"]`)).toHaveCount(1);
    }
  });

  test("NAV-4: PY breadcrumbs include the licence level", async ({ page }) => {
    await page.goto("/patron-de-yate/test-por-tema");
    const crumbs = page.getByRole("navigation", { name: "Ruta de navegación" }).locator("ol");
    await expect(crumbs).toHaveText(/Inicio\s*Patrón de Yate\s*Test por tema/);

    await page.goto("/test-por-tema");
    const perCrumbs = page.getByRole("navigation", { name: "Ruta de navegación" }).locator("ol");
    await expect(perCrumbs).toHaveText(/^Inicio\s*Test por tema$/);
  });
});
