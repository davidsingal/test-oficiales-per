import { expect, test, type Page } from "@playwright/test";
import {
  LICENCE,
  answer,
  checkedLetter,
  examKey,
  examQuestions,
  isScored,
  latestExam,
  progressBar,
  questionCard,
  rightLetter,
  shownQuestionIds,
  startExam,
  storedProgress,
  topicName,
  wrongLetter,
  type ApiQuestion,
} from "./helpers";

const results = (page: Page) => page.getByRole("region", { name: /Resultado/ });

/** Hands in a running exam, confirming the blank-answers warning if it shows. */
const handIn = async (page: Page, mode: "simulacro" | "practica") => {
  await page.getByRole("button", { name: mode === "simulacro" ? "Entregar examen" : "Terminar" }).click();
  const confirm = page.getByRole("button", { name: /igualmente$/ });
  if (await confirm.isVisible()) await confirm.click();
  await expect(results(page)).toBeVisible();
};

test.describe("QUIZ · taking a test", () => {
  test("QUIZ-3: official exams offer both modes with the licence's duration", async ({ page }) => {
    for (const licence of ["per", "py"] as const) {
      const exam = await latestExam(page, licence);
      await page.goto(exam.path);
      const simulacion = page.getByRole("button", { name: /^Simulación/ });
      await expect(page.getByRole("button", { name: /^Práctica/ })).toBeVisible();
      await expect(simulacion).toContainText("Recomendada");
      await expect(simulacion).toContainText(`${LICENCE[licence].minutes} minutos`);
    }

    // Topic tests go straight to the questions, in práctica.
    await page.goto("/test-por-tema/Balizamiento");
    await expect(page.getByRole("heading", { name: "¿Cómo quieres hacer el test?" })).toHaveCount(0);
    await expect(page.locator('[id^="question-"] h2').first()).toBeVisible();
  });

  test("QUIZ-1 / QUIZ-7: práctica corrects each answer at once, locks it, and ends with the last one", async ({
    page,
    request,
  }) => {
    await page.goto("/test-por-tema/Balizamiento");
    await expect(page.locator('[id^="question-"] h2').first()).toBeVisible();
    const ids = await shownQuestionIds(page);
    const { docs } = await request
      .get(`/api/questions?where[id][in]=${ids.join(",")}&depth=0&limit=10`)
      .then((r) => r.json() as Promise<{ docs: ApiQuestion[] }>);
    const byId = new Map(docs.map((q) => [q.id, q]));

    const first = byId.get(ids[0])!;
    await answer(page, first.id, wrongLetter(first));
    const card = questionCard(page, first.id);
    if (isScored(first)) {
      await expect(card).toContainText("Incorrecto.");
      // QUIZ-7: the right answer is named.
      await expect(card).toContainText(new RegExp(`la ${rightLetter(first)}`));
    }
    // Locked: another click doesn't change the answer.
    await answer(page, first.id, rightLetter(first) ?? "A");
    expect(await checkedLetter(page, first.id)).toBe(wrongLetter(first));
    await expect(results(page)).toHaveCount(0);

    for (const id of ids.slice(1)) {
      await answer(page, id, rightLetter(byId.get(id)!) ?? "A");
    }
    // QUIZ-5 (non-official): hits out of scored questions.
    await expect(results(page)).toBeVisible();
    await expect(results(page)).toContainText(/\d+ de \d+ aciertos?/);
    await expect(results(page)).not.toContainText("APTO");
  });

  test("QUIZ-4: on an official exam in práctica, the bar counts errors per limit and warns NO APTO", async ({
    page,
    request,
  }) => {
    const exam = await latestExam(page, "py");
    const questions = await examQuestions(request, exam);
    const chart = questions.filter((q) => topicName(q) === "Navegación carta" && isScored(q)).slice(0, 4);
    expect(chart).toHaveLength(4);

    await startExam(page, exam, "Práctica");
    for (const [index, question] of chart.entries()) {
      await answer(page, question.id, wrongLetter(question));
      if (index === 2) {
        await expect(progressBar(page)).toContainText("Navegación carta 3/3");
        await expect(progressBar(page)).not.toContainText("ya sería NO APTO");
      }
    }
    await expect(progressBar(page)).toContainText("Fallos: 4/12");
    await expect(progressBar(page)).toContainText("Teoría de navegación 0/5");
    await expect(progressBar(page)).toContainText("Navegación carta 4/3");
    await expect(progressBar(page)).toContainText("ya sería NO APTO");
  });

  test("QUIZ-2 / QUIZ-5 / QUIZ-6: simulación hides the correction until handed in, then shows APTO / NO APTO", async ({
    page,
    request,
  }) => {
    const exam = await latestExam(page, "py");
    const questions = await examQuestions(request, exam);
    const [q1] = questions;

    await startExam(page, exam, "Simulación");
    await expect(page.getByRole("timer")).toBeVisible();

    // Answers can change, and nothing is corrected yet.
    await answer(page, q1.id, "A");
    await answer(page, q1.id, "B");
    expect(await checkedLetter(page, q1.id)).toBe("B");
    await expect(questionCard(page, q1.id)).not.toContainText(/Correcto|Incorrecto/);

    // Handing in with blanks asks first.
    await page.getByRole("button", { name: "Entregar examen" }).click();
    // (Next's route announcer is also an alert, hence the filter.)
    await expect(page.getByRole("alert").filter({ hasText: "en blanco" })).toContainText(
      `quedan ${questions.length - 1} preguntas en blanco`,
    );
    await page.getByRole("button", { name: "Entregar igualmente" }).click();

    // 39 blanks are errors: NO APTO, total over its limit.
    await expect(results(page)).toContainText("NO APTO");
    const totalRow = results(page).getByRole("row", { name: /^Total/ });
    await expect(totalRow).toContainText("/ 12");
    await expect(totalRow).toContainText("superado");
    for (const label of ["Teoría de navegación", "Navegación carta"]) {
      await expect(results(page).getByRole("row", { name: new RegExp(`^${label}`) })).toBeVisible();
    }

    // QUIZ-6: review only the failed ones, then repeat.
    const failed = page.getByRole("button", { name: /^Repasar falladas \((\d+)\)$/ });
    const count = Number((await failed.textContent())!.match(/\((\d+)\)/)![1]);
    await failed.click();
    expect(await shownQuestionIds(page)).toHaveLength(count);
    await page.getByRole("button", { name: "Ver todas las preguntas" }).click();
    expect(await shownQuestionIds(page)).toHaveLength(questions.length);
    await page.getByRole("button", { name: "Repetir este test" }).click();
    await expect(page.getByRole("heading", { name: "¿Cómo quieres hacer el test?" })).toBeVisible();
  });

  test("QUIZ-5: answering every question right is APTO", async ({ page, request }) => {
    const exam = await latestExam(page, "per");
    const questions = await examQuestions(request, exam);
    await startExam(page, exam, "Simulación");
    for (const question of questions) {
      // Annulled questions don't count: any answer will do.
      await answer(page, question.id, isScored(question) ? rightLetter(question) : "A");
    }
    await handIn(page, "simulacro");
    await expect(results(page).locator("p").first()).toHaveText("APTO");
    await expect(results(page).getByRole("row", { name: /^Total/ })).toContainText("0 / 13");
  });

  test("QUIZ-2: simulación hands in by itself when the countdown reaches zero", async ({ page }) => {
    await page.clock.install();
    const exam = await latestExam(page, "py");
    await startExam(page, exam, "Simulación");
    await expect(page.getByRole("timer")).toContainText(/^\s*(120:00|119:5\d)/);

    await page.clock.fastForward("02:00:02");
    await expect(results(page)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tiempo agotado · Resultado" })).toBeVisible();
  });

  test("QUIZ-6: a topic test can draw another test", async ({ page }) => {
    await page.goto("/patron-de-yate/test-por-tema/Meteorolog%C3%ADa");
    await expect(page.locator('[id^="question-"] h2').first()).toBeVisible();
    const before = await shownQuestionIds(page);
    for (const id of before) await answer(page, id, "A");

    await page.getByRole("button", { name: "Otro test" }).click();
    await expect.poll(async () => (await shownQuestionIds(page)).join()).not.toBe(before.join());
  });
});

test.describe("PROG · progress", () => {
  test("PROG-1 / PROG-2: answers are kept in localStorage with their licence and topic", async ({
    page,
    request,
  }) => {
    const exam = await latestExam(page, "py");
    const [q1, q2] = (await examQuestions(request, exam)).filter(isScored);

    await startExam(page, exam, "Práctica");
    await answer(page, q1.id, rightLetter(q1));
    await answer(page, q2.id, wrongLetter(q2));

    const progress = await storedProgress(page);
    expect(progress?.version).toBe(1);
    expect(progress?.questions[q1.id]).toMatchObject({ outcome: "correct", licence: "py", topicName: topicName(q1) });
    expect(progress?.questions[q2.id]).toMatchObject({ outcome: "incorrect", licence: "py", topicName: topicName(q2) });
  });

  test("PROG-3: an unfinished exam can be resumed, and its status and result are kept", async ({
    page,
    request,
  }) => {
    const exam = await latestExam(page, "py");
    const [q1, q2] = await examQuestions(request, exam);

    await startExam(page, exam, "Simulación");
    await answer(page, q1.id, "A");
    await answer(page, q2.id, "C");

    // The exams list marks it unfinished.
    await page.goto("/patron-de-yate/examenes-oficiales");
    await expect(page.locator(`a[href="${exam.path}"]`)).toContainText("a medias");

    await page.goto(exam.path);
    await expect(page.locator("main")).toContainText("2 de 40 respondidas");
    await expect(page.locator("main")).toContainText(/quedan 1[12]\d min/);
    await page.getByRole("button", { name: "Continuar" }).click();
    expect(await checkedLetter(page, q1.id)).toBe("A");
    expect(await checkedLetter(page, q2.id)).toBe("C");
    await expect(page.getByRole("timer")).toBeVisible();

    await handIn(page, "simulacro");
    const progress = await storedProgress(page);
    expect(progress?.exams[examKey(exam)]).toMatchObject({ last: { passed: false } });
    expect(progress?.exams[examKey(exam)]?.inProgress).toBeUndefined();

    await page.goto("/patron-de-yate/examenes-oficiales");
    await expect(page.locator(`a[href="${exam.path}"]`)).toContainText("NO APTO");
    // The mode picker remembers the last result.
    await page.goto(exam.path);
    await expect(page.locator("main")).toContainText(/La última vez .*simulación.*NO APTO/);
  });

  test("PROG-5: /repaso tests the questions last answered wrong, across licences, until they're right", async ({
    page,
    request,
  }) => {
    const py = await latestExam(page, "py");
    const per = await latestExam(page, "per");
    const [pyWrong] = (await examQuestions(request, py)).filter(isScored);
    const [perWrong] = (await examQuestions(request, per)).filter(isScored);

    await startExam(page, py, "Práctica");
    await answer(page, pyWrong.id, wrongLetter(pyWrong));
    await startExam(page, per, "Práctica");
    await answer(page, perWrong.id, wrongLetter(perWrong));

    await page.goto("/repaso");
    await expect(page.locator('[id^="question-"] h2').first()).toBeVisible();
    // Most recent first.
    expect(await shownQuestionIds(page)).toEqual([perWrong.id, pyWrong.id]);
    await expect(questionCard(page, pyWrong.id)).toContainText("PY · ");
    await expect(questionCard(page, perWrong.id)).not.toContainText("PY · ");

    await answer(page, pyWrong.id, rightLetter(pyWrong));
    await page.goto("/repaso");
    await expect(page.locator('[id^="question-"] h2').first()).toBeVisible();
    expect(await shownQuestionIds(page)).toEqual([perWrong.id]);
  });

  test("PROG-6: the home page summarises progress and can erase it", async ({ page, request }) => {
    const exam = await latestExam(page, "py");
    const [q1] = (await examQuestions(request, exam)).filter(isScored);
    await startExam(page, exam, "Simulación");
    await answer(page, q1.id, wrongLetter(q1));
    await page.goto(exam.path);
    // Hand in nothing else; leave a second exam unfinished in práctica.
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.getByRole("button", { name: /^Práctica/ }).click();
    await answer(page, q1.id, wrongLetter(q1));

    await page.goto("/");
    const section = page.getByRole("region", { name: "Tu progreso" });
    await expect(section).toContainText("1 pregunta practicada · 0% de aciertos");
    await expect(section.getByRole("link", { name: /^Continuar el examen PY de/ })).toHaveAttribute("href", exam.path);
    await expect(section.getByRole("link", { name: "Repasar mis fallos (1)" })).toBeVisible();

    await section.getByRole("button", { name: "Borrar progreso" }).click();
    await page.getByRole("button", { name: "Borrar", exact: true }).click();
    await expect(section).toHaveCount(0);
    expect(await storedProgress(page)).toMatchObject({ questions: {}, exams: {} });
  });

  test("TOPIC-1: topic stats only count answers of the same licence", async ({ page, request }) => {
    const exam = await latestExam(page, "py");
    const meteo = (await examQuestions(request, exam)).find((q) => topicName(q) === "Meteorología" && isScored(q))!;
    await startExam(page, exam, "Práctica");
    await answer(page, meteo.id, rightLetter(meteo));

    await page.goto("/patron-de-yate/test-por-tema");
    const pyCard = page.locator("main a").filter({ hasText: /^Meteorología/ });
    await expect(pyCard).toContainText("1 practicadas · 100% de aciertos");

    await page.goto("/test-por-tema");
    const perCard = page.locator("main a").filter({ hasText: /^Meteorología/ });
    await expect(perCard).toBeVisible();
    await expect(perCard).not.toContainText("practicadas");
  });
});
