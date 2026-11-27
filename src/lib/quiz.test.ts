import { describe, expect, it } from "vitest";
import { PER, PY } from "@/lib/licences";
import {
  examKey,
  examPath,
  formatSessionLabel,
  parseExamKey,
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
  licence: "per",
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
      rules: PER.rules,
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
      rules: PER.rules,
    });
    expect(summary.errors).toBe(7);
    expect(
      summary.evaluation?.limits.map(({ key, errors }) => [key, errors]),
    ).toEqual([
      ["total", 7],
      ["Reglamento (RIPA)", 6],
      ["Balizamiento", 0],
      ["Carta de navegación", 1],
    ]);
  });

  it("fails an official exam on the RIPA limit alone", () => {
    const { evaluation } = summarizeQuiz(questions, answers, {
      finished: true,
      rules: PER.rules,
    });
    expect(evaluation?.passed).toBe(false);
    expect(
      evaluation?.limits.filter((limit) => limit.exceeded).map((limit) => limit.key),
    ).toEqual(["Reglamento (RIPA)"]);
  });

  it("skips the pass/fail check outside official exams", () => {
    expect(
      summarizeQuiz(questions, answers, { finished: true })
        .evaluation,
    ).toBeNull();
  });
});

describe("needsChart", () => {
  it("is true only for the chart topics", () => {
    expect(needsChart("Carta de navegación")).toBe(true);
    expect(needsChart("Navegación carta")).toBe(true);
    expect(needsChart("Teoría de navegación")).toBe(false);
    expect(needsChart("Balizamiento")).toBe(false);
    expect(needsChart(null)).toBe(false);
  });
});

describe("labels and keys", () => {
  it("formats sessions and exam keys", () => {
    expect(formatSessionLabel(2026, "abril", 1)).toBe("Abril 2026 · Test 1");
    // PER keys keep the format they had before Patrón de Yate, so saved progress still matches.
    expect(examKey("per", 2026, "abril", 1)).toBe("2026/abril/1");
    expect(examKey("py", 2026, "abril", 1)).toBe("py/2026/abril/1");
  });

  it("reads exam keys back", () => {
    expect(parseExamKey("2026/abril/1")).toEqual({
      licence: "per",
      year: 2026,
      month: "abril",
      testNumber: 1,
    });
    expect(parseExamKey("py/2025/noviembre/2")).toEqual({
      licence: "py",
      year: 2025,
      month: "noviembre",
      testNumber: 2,
    });
    expect(parseExamKey("2026/abrill/1")).toBeNull();
    expect(parseExamKey("cy/2026/abril/1")).toBeNull();
  });

  it("builds exam paths under each licence", () => {
    expect(examPath(PER.id, 2026, "abril", 1)).toBe("/examenes-oficiales/2026/abril/1");
    expect(examPath(PY.id, 2026, "abril", 1)).toBe(
      "/patron-de-yate/examenes-oficiales/2026/abril/1",
    );
  });
});

describe("toQuizQuestion", () => {
  it("keeps what the UI needs and sorts the options by letter", () => {
    const doc = {
      id: 7,
      licence: "per",
      year: 2024,
      month: "noviembre",
      testNumber: 2,
      questionNumber: 12,
      topic: { id: 1, licence: "per", name: "Balizamiento", updatedAt: "", createdAt: "" },
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
      licence: "per",
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

describe("summarizeQuiz (Patrón de Yate)", () => {
  it("applies the PY limits to its topics", () => {
    const questions = [1, 2, 3, 4].map((id): QuizQuestion => ({
      ...question(id, "Navegación carta", ["A"]),
      licence: "py",
    }));
    const { evaluation } = summarizeQuiz(questions, {}, {
      finished: true,
      rules: PY.rules,
    });
    // Four blank chart answers: over the cap of 3, well under the total of 12.
    expect(
      evaluation?.limits.filter((limit) => limit.exceeded).map((limit) => limit.key),
    ).toEqual(["Navegación carta"]);
  });

  it("labels PY sessions so mixed reviews tell the licences apart", () => {
    const doc = {
      id: 1,
      licence: "py",
      year: 2026,
      month: "abril",
      testNumber: 1,
      questionNumber: 1,
      topic: 4,
      questionText: "¿?",
      updatedAt: "",
      createdAt: "",
    } satisfies Question;
    expect(toQuizQuestion(doc).sessionLabel).toBe("PY · Abril 2026 · Test 1");
  });
});
