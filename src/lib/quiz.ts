import type { Answer, Question } from "@/types/payload-types";
import { monthLabels } from "@/lib/utils";
import {
  evaluateOfficialExam,
  getTrackedOfficialExamTopic,
  type OfficialExamEvaluation,
} from "@/lib/official-exam-evaluation";

export type AnswerLetter = Answer["answerId"];

export type QuizMode = "practica" | "simulacro";

/** The slice of a question the quiz UI needs, small enough to send to the client. */
export type QuizQuestion = {
  id: number;
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

/** Identifies an official test, e.g. "2026/abril/1". Used as the progress key. */
export const examKey = (year: number, month: string, testNumber: number) =>
  `${year}/${month}/${testNumber}`;

export const toQuizQuestion = (question: Question): QuizQuestion => ({
  id: question.id,
  number: question.questionNumber,
  text: question.questionText,
  explanation: question.explanation?.trim() || null,
  correctAnswers: question.correctAnswers ?? [],
  topicName:
    typeof question.topic === "object" && question.topic !== null
      ? question.topic.name
      : null,
  sessionLabel: formatSessionLabel(
    question.year,
    question.month,
    question.testNumber,
  ),
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

/** Carta de navegación questions need the printed chart and the original PDF. */
export const needsChart = (topicName: string | null) =>
  topicName !== null &&
  getTrackedOfficialExamTopic(topicName) === "cartaDeNavegacion";

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
 * do in the real exam. `official` adds the pass/fail check with per-topic limits.
 */
export const summarizeQuiz = (
  questions: QuizQuestion[],
  answers: QuizAnswers,
  { finished, official }: { finished: boolean; official: boolean },
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
  const errorsByTopic = { ripa: 0, balizamiento: 0, cartaDeNavegacion: 0 };

  for (const question of questions) {
    const selected = answers[question.id];
    if (selected) summary.answered += 1;

    const outcome = getOutcome(question, selected);
    summary[outcome] += 1;

    const isError =
      outcome === "incorrect" || (finished && outcome === "unanswered");
    if (!isError) continue;

    summary.errors += 1;
    const trackedTopic = question.topicName
      ? getTrackedOfficialExamTopic(question.topicName)
      : null;
    if (trackedTopic) errorsByTopic[trackedTopic] += 1;
  }

  if (official) {
    summary.evaluation = evaluateOfficialExam({
      total: summary.errors,
      ...errorsByTopic,
    });
  }

  return summary;
};
