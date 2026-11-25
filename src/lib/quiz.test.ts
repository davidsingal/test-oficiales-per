import { describe, expect, it } from "vitest";
import {
  examKey,
  formatSessionLabel,
  getOutcome,
  needsChart,
  summarizeQuiz,
  toQuizQuestion,
  type QuizAnswers,
  type QuizQuestion,
} from "@/lib/quiz";
import type { Question } from "@/types/payload-types";

const question = (
  id: number,
  topicName: string,
  correctAnswers: QuizQuestion["correctAnswers"],
): QuizQuestion => ({
  id,
  number: id,
  text: `Pregunta ${id}`,
  explanation: null,
  correctAnswers,
  topicName,
  sessionLabel: "Abril 2026 · Test 1",
  sourceUrl: null,
  options: [],
});

describe("getOutcome", () => {
  it("scores right, wrong and blank answers", () => {
    const q = question(1, "Seguridad", ["B"]);
    expect(getOutcome(q, "B")).toBe("correct");
    expect(getOutcome(q, "A")).toBe("incorrect");
    expect(getOutcome(q, undefined)).toBe("unanswered");
  });

  it("accepts any of several valid answers", () => {
    const q = question(1, "Seguridad", ["A", "C"]);
    expect(getOutcome(q, "A")).toBe("correct");
    expect(getOutcome(q, "C")).toBe("correct");
    expect(getOutcome(q, "B")).toBe("incorrect");
  });

  it("never scores annulled questions or ones without an answer key", () => {
    expect(getOutcome(question(1, "Seguridad", ["ANULADA"]), "A")).toBe("neutral");
    expect(getOutcome(question(2, "Seguridad", []), undefined)).toBe("neutral");
  });
});

describe("summarizeQuiz", () => {
  const questions = [
    ...[1, 2, 3, 4, 5, 6].map((id) => question(id, "Reglamento (RIPA)", ["A"])),
    question(7, "Balizamiento", ["B"]),
    question(8, "Carta de navegación", ["C"]),
    question(9, "Seguridad", ["ANULADA"]),
    question(10, "Seguridad", ["A", "B"]),
  ];
  // Six RIPA errors, a right Balizamiento answer, Carta left blank,
  // a pick on the annulled question, and a valid alternative answer.
  const answers: QuizAnswers = {
    1: "B", 2: "B", 3: "B", 4: "B", 5: "B", 6: "B",
    7: "B", 9: "D", 10: "B",
  };

  it("counts outcomes while the test is in progress", () => {
    const summary = summarizeQuiz(questions, answers, {
      finished: false,
      official: true,
    });
    expect(summary).toMatchObject({
      total: 10,
      answered: 9,
      correct: 2,
      incorrect: 6,
      unanswered: 1,
      neutral: 1,
      errors: 6,
    });
  });

  it("counts blank answers as errors once finished", () => {
    const summary = summarizeQuiz(questions, answers, {
      finished: true,
      official: true,
    });
    expect(summary.errors).toBe(7);
    expect(summary.evaluation?.counts).toEqual({
      total: 7,
      ripa: 6,
      balizamiento: 0,
      cartaDeNavegacion: 1,
    });
  });

  it("fails an official exam on the RIPA limit alone", () => {
    const { evaluation } = summarizeQuiz(questions, answers, {
      finished: true,
      official: true,
    });
    expect(evaluation).toMatchObject({ passed: false, exceededLimits: ["ripa"] });
  });

  it("skips the pass/fail check outside official exams", () => {
    expect(
      summarizeQuiz(questions, answers, { finished: true, official: false })
        .evaluation,
    ).toBeNull();
  });
});

describe("needsChart", () => {
  it("is true only for Carta de navegación", () => {
    expect(needsChart("Carta de navegación")).toBe(true);
    expect(needsChart("Balizamiento")).toBe(false);
    expect(needsChart(null)).toBe(false);
  });
});

describe("labels and keys", () => {
  it("formats sessions and exam keys", () => {
    expect(formatSessionLabel(2026, "abril", 1)).toBe("Abril 2026 · Test 1");
    expect(examKey(2026, "abril", 1)).toBe("2026/abril/1");
  });
});

describe("toQuizQuestion", () => {
  it("keeps what the UI needs and sorts the options by letter", () => {
    const doc = {
      id: 7,
      year: 2024,
      month: "noviembre",
      testNumber: 2,
      questionNumber: 12,
      topic: { id: 1, name: "Balizamiento", updatedAt: "", createdAt: "" },
      questionText: "¿Qué marca es esta?",
      explanation: "  ",
      correctAnswers: ["C"],
      sourceUrl: "https://example.org/examen.pdf#page=3",
      answers: [
        { id: 3, question: 7, answerId: "B", answerText: "Dos", updatedAt: "", createdAt: "" },
        { id: 2, question: 7, answerId: "A", answerText: "Uno", updatedAt: "", createdAt: "" },
        99, // an unpopulated relation is dropped
      ],
      updatedAt: "",
      createdAt: "",
    } satisfies Question;

    expect(toQuizQuestion(doc)).toEqual({
      id: 7,
      number: 12,
      text: "¿Qué marca es esta?",
      explanation: null, // blank explanations are treated as missing
      correctAnswers: ["C"],
      topicName: "Balizamiento",
      sessionLabel: "Noviembre 2024 · Test 2",
      sourceUrl: "https://example.org/examen.pdf#page=3",
      options: [
        { id: 2, letter: "A", text: "Uno" },
        { id: 3, letter: "B", text: "Dos" },
      ],
    });
  });
});
