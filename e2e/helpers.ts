import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";

export type LicenceId = "per" | "py";

export const LICENCE = {
  per: { basePath: "", shortName: "PER", questionCount: 45, chartTopic: "Carta de navegación", minutes: 90 },
  py: { basePath: "/patron-de-yate", shortName: "PY", questionCount: 40, chartTopic: "Navegación carta", minutes: 120 },
} as const;

export type ApiQuestion = {
  id: number;
  licence: LicenceId;
  year: number;
  month: string;
  testNumber: number;
  questionNumber: number;
  topic: number | { id: number; name: string; licence: LicenceId };
  correctAnswers: string[];
};

export type Exam = { licence: LicenceId; year: number; month: string; testNumber: number; path: string };

const LETTERS = ["A", "B", "C", "D"] as const;

/** GET from Payload's public REST API (`where` as Payload's bracket query string). */
export const api = async <T>(request: APIRequestContext, path: string): Promise<T> => {
  const response = await request.get(`/api/${path}`);
  expect(response.ok(), `GET /api/${path}`).toBeTruthy();
  return (await response.json()) as T;
};

export const countQuestions = async (request: APIRequestContext, where: string) =>
  (await api<{ totalDocs: number }>(request, `questions?limit=1&depth=0&${where}`)).totalDocs;

/** The newest test of a licence, as linked from its exams list. */
export const latestExam = async (page: Page, licence: LicenceId): Promise<Exam> => {
  const { basePath } = LICENCE[licence];
  await page.goto(`${basePath}/examenes-oficiales`);
  const href = await page
    .locator(`main a[href^="${basePath}/examenes-oficiales/"]`)
    .first()
    .getAttribute("href");
  const match = href?.match(/\/examenes-oficiales\/(\d+)\/([a-z]+)\/(\d+)$/);
  if (!href || !match) throw new Error(`No exam link on ${basePath}/examenes-oficiales`);
  return {
    licence,
    year: Number(match[1]),
    month: match[2],
    testNumber: Number(match[3]),
    path: href,
  };
};

/** The questions of one exam, in order, with their answer key. */
export const examQuestions = async (request: APIRequestContext, exam: Exam) => {
  const where = [
    `where[licence][equals]=${exam.licence}`,
    `where[year][equals]=${exam.year}`,
    `where[month][equals]=${exam.month}`,
    `where[testNumber][equals]=${exam.testNumber}`,
  ].join("&");
  const { docs } = await api<{ docs: ApiQuestion[] }>(
    request,
    `questions?${where}&depth=1&limit=100&sort=questionNumber`,
  );
  return docs;
};

export const topicName = (question: ApiQuestion) =>
  typeof question.topic === "object" ? question.topic.name : null;

/** Scored questions only: not annulled and with an answer key. */
export const isScored = (question: ApiQuestion) =>
  question.correctAnswers.length > 0 && !question.correctAnswers.includes("ANULADA");

export const rightLetter = (question: ApiQuestion) => question.correctAnswers[0];
export const wrongLetter = (question: ApiQuestion) =>
  LETTERS.find((letter) => !question.correctAnswers.includes(letter))!;

export const questionCard = (page: Page, questionId: number): Locator =>
  page.locator(`#question-${questionId}`);

/** Picks an option of a question card (options are rendered A to D). */
export const answer = async (page: Page, questionId: number, letter: string) => {
  const radio = questionCard(page, questionId).getByRole("radio").nth(LETTERS.indexOf(letter as never));
  await radio.click();
};

export const checkedLetter = async (page: Page, questionId: number) => {
  const radios = questionCard(page, questionId).getByRole("radio");
  for (let i = 0; i < LETTERS.length; i += 1) {
    if ((await radios.nth(i).getAttribute("aria-checked")) === "true") return LETTERS[i];
  }
  return null;
};

/** The ids of the question cards currently shown, in order. */
export const shownQuestionIds = async (page: Page) =>
  // Cards are `question-<id>`; their headings (`question-<id>-text`) are filtered out.
  (await page.locator('[id^="question-"]').evaluateAll((nodes) =>
    nodes
      .map((node) => node.id.match(/^question-(\d+)$/)?.[1])
      .filter((id): id is string => Boolean(id))
      .map(Number),
  )) as number[];

export type StoredProgress = {
  version: number;
  questions: Record<string, { outcome: "correct" | "incorrect"; licence?: LicenceId; topicName: string | null; at: number }>;
  exams: Record<string, { inProgress?: { answers: Record<string, string> }; last?: { passed: boolean; errors: number } }>;
};

export const storedProgress = (page: Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("per-progress");
    return raw ? (JSON.parse(raw) as unknown) : null;
  }) as Promise<StoredProgress | null>;

export const examKey = (exam: Exam) =>
  `${exam.licence === "per" ? "" : `${exam.licence}/`}${exam.year}/${exam.month}/${exam.testNumber}`;

/** Starts an official exam in the given mode from its page. */
export const startExam = async (page: Page, exam: Exam, mode: "Práctica" | "Simulación") => {
  await page.goto(exam.path);
  await page.getByRole("button", { name: new RegExp(`^${mode}`) }).click();
};

/** The sticky progress bar of a running quiz. */
export const progressBar = (page: Page) => page.locator("div.sticky").first();
