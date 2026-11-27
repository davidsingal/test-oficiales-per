import type { Answer, Question } from "@/types/payload-types";
import { monthLabels } from "@/lib/utils";
import { LICENCES, type ExamRules, type LicenceId } from "@/lib/licences";
import {
  evaluateOfficialExam,
  normalizeTopicName,
  type OfficialExamEvaluation,
} from "@/lib/official-exam-evaluation";

export type AnswerLetter = Answer["answerId"];

export type QuizMode = "practica" | "simulacro";

/** The slice of a question the quiz UI needs, small enough to send to the client. */
export type QuizQuestion = {
  id: number;
  licence: LicenceId;
  number: number;
  text: string;
  explanation: string | null;
  correctAnswers: NonNullable<Question["correctAnswers"]>;
  topicName: string | null;
  sessionLabel: string;
  sourceUrl: string | null;
  options: { id: number; letter: AnswerLetter; text: string }[];
};

export type QuestionOutcome = "correct" | "incorrect" | "neutral" | "unanswered";

export type QuizAnswers = Record<number, AnswerLetter>;

export const formatSessionLabel = (
  year: number,
  month: Question["month"],
  testNumber: number,
) => `${monthLabels[month]} ${year} · Test ${testNumber}`;

/**
 * Identifies an official test, e.g. "2026/abril/1" (PER) or "py/2026/abril/1".
 * Used as the progress key. PER keys have no prefix, so progress saved before
 * Patrón de Yate existed still matches.
 */
export const examKey = (
  licence: LicenceId,
  year: number,
  month: string,
  testNumber: number,
) => `${licence === "per" ? "" : `${licence}/`}${year}/${month}/${testNumber}`;

/** Reads back an `examKey()`. Null for a key in an unknown format. */
export const parseExamKey = (key: string) => {
  const parts = key.split("/");
  const licence = (parts.length === 4 ? parts.shift() : "per") as LicenceId;
  const [year, month, testNumber] = parts;
  if (!(licence in LICENCES) || !(month in monthLabels)) return null;
  return {
    licence,
    year: Number(year),
    month: month as Question["month"],
    testNumber: Number(testNumber),
  };
};

/** Page of an official test, e.g. "/patron-de-yate/examenes-oficiales/2026/abril/1". */
export const examPath = (
  licence: LicenceId,
  year: number,
  month: string,
  testNumber: number,
) => `${LICENCES[licence].basePath}/examenes-oficiales/${year}/${month}/${testNumber}`;

/** Page of a topic test. */
export const topicPath = (licence: LicenceId, topicName: string) =>
  `${LICENCES[licence].basePath}/test-por-tema/${encodeURIComponent(topicName)}`;

export const toQuizQuestion = (question: Question): QuizQuestion => ({
  id: question.id,
  licence: question.licence,
  number: question.questionNumber,
  text: question.questionText,
  explanation: question.explanation?.trim() || null,
  correctAnswers: question.correctAnswers ?? [],
  topicName:
    typeof question.topic === "object" && question.topic !== null
      ? question.topic.name
      : null,
  // Tests that mix licences (the review of failed questions) need to tell them apart.
  sessionLabel: `${question.licence === "per" ? "" : `${LICENCES[question.licence].shortName} · `}${formatSessionLabel(
    question.year,
    question.month,
    question.testNumber,
  )}`,
  sourceUrl: question.sourceUrl ?? null,
  options: (question.answers ?? [])
    .filter((answer): answer is Answer => typeof answer === "object")
    .sort((a, b) => a.answerId.localeCompare(b.answerId))
    .map((answer) => ({
      id: answer.id,
      letter: answer.answerId,
      text: answer.answerText,
    })),
});

const CHART_TOPICS = new Set(
  Object.values(LICENCES).map((licence) => normalizeTopicName(licence.chartTopic)),
);

/** Chart questions (Carta de navegación, Navegación carta) need the printed chart and the original PDF. */
export const needsChart = (topicName: string | null) =>
  topicName !== null && CHART_TOPICS.has(normalizeTopicName(topicName));

/** True when the question can't be scored: annulled, or without an answer key. */
export const isUnscored = (question: QuizQuestion) =>
  question.correctAnswers.length === 0 ||
  question.correctAnswers.includes("ANULADA");

export const getOutcome = (
  question: QuizQuestion,
  selected: AnswerLetter | undefined,
): QuestionOutcome => {
  if (isUnscored(question)) return "neutral";
  if (!selected) return "unanswered";
  return question.correctAnswers.includes(selected) ? "correct" : "incorrect";
};

export type QuizSummary = {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  neutral: number;
  /** Incorrect answers, plus unanswered questions once the test is finished. */
  errors: number;
  evaluation: OfficialExamEvaluation | null;
};

/**
 * Scores a quiz. Once `finished`, unanswered questions count as errors, as they
 * do in the real exam. `rules` adds the official pass/fail check with its
 * per-topic limits.
 */
export const summarizeQuiz = (
  questions: QuizQuestion[],
  answers: QuizAnswers,
  { finished, rules }: { finished: boolean; rules?: ExamRules | null },
): QuizSummary => {
  const summary: QuizSummary = {
    total: questions.length,
    answered: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    neutral: 0,
    errors: 0,
    evaluation: null,
  };
  const errorsByTopic: Record<string, number> = {};

  for (const question of questions) {
    const selected = answers[question.id];
    if (selected) summary.answered += 1;

    const outcome = getOutcome(question, selected);
    summary[outcome] += 1;

    const isError =
      outcome === "incorrect" || (finished && outcome === "unanswered");
    if (!isError) continue;

    summary.errors += 1;
    if (question.topicName) {
      const topic = normalizeTopicName(question.topicName);
      errorsByTopic[topic] = (errorsByTopic[topic] ?? 0) + 1;
    }
  }

  if (rules) {
    summary.evaluation = evaluateOfficialExam(rules, summary.errors, errorsByTopic);
  }

  return summary;
};
