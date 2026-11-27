import { describe, expect, it } from "vitest";
import { describeRules, PER, PY } from "@/lib/licences";
import {
  evaluateOfficialExam,
  normalizeTopicName,
} from "@/lib/official-exam-evaluation";

const exceeded = (result: ReturnType<typeof evaluateOfficialExam>) =>
  result.limits.filter((limit) => limit.exceeded).map((limit) => limit.key);

// Errors keyed the way summarizeQuiz keys them.
const errors = (byTopic: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(byTopic).map(([topic, count]) => [normalizeTopicName(topic), count]),
  );

describe("normalizeTopicName", () => {
  it("ignores case, accents and surrounding spaces", () => {
    expect(normalizeTopicName("  CARTA DE NAVEGACIÓN ")).toBe("carta de navegacion");
  });
});

describe("evaluateOfficialExam (PER)", () => {
  it("passes at exactly the limits", () => {
    const result = evaluateOfficialExam(
      PER.rules,
      13,
      errors({ "Reglamento (RIPA)": 5, Balizamiento: 2, "Carta de navegación": 2 }),
    );
    expect(result.passed).toBe(true);
    expect(exceeded(result)).toEqual([]);
  });

  it("fails when the total goes over 13", () => {
    expect(exceeded(evaluateOfficialExam(PER.rules, 14, {}))).toEqual(["total"]);
  });

  it("fails on a single block over its limit, even with few errors overall", () => {
    // Regression: RIPA is stored as "Reglamento (RIPA)", and an exact "ripa"
    // match once missed it, so RIPA errors were never counted.
    const ripa = evaluateOfficialExam(PER.rules, 6, errors({ "Reglamento (RIPA)": 6 }));
    expect(ripa.passed).toBe(false);
    expect(exceeded(ripa)).toEqual(["Reglamento (RIPA)"]);
    expect(
      exceeded(evaluateOfficialExam(PER.rules, 3, errors({ Balizamiento: 3 }))),
    ).toEqual(["Balizamiento"]);
    expect(
      exceeded(evaluateOfficialExam(PER.rules, 3, errors({ "Carta de navegación": 3 }))),
    ).toEqual(["Carta de navegación"]);
  });

  it("lists the total first, then each capped topic", () => {
    expect(evaluateOfficialExam(PER.rules, 0, {}).limits.map((l) => l.label)).toEqual([
      "Total",
      "RIPA",
      "Balizamiento",
      "Carta de navegación",
    ]);
  });
});

describe("evaluateOfficialExam (Patrón de Yate)", () => {
  it("passes with 28 right out of 40, at the topic limits", () => {
    const result = evaluateOfficialExam(
      PY.rules,
      12,
      errors({ "Teoría de navegación": 5, "Navegación carta": 3, Meteorología: 4 }),
    );
    expect(result.passed).toBe(true);
  });

  it("fails over 12 errors in total", () => {
    expect(exceeded(evaluateOfficialExam(PY.rules, 13, {}))).toEqual(["total"]);
  });

  it("fails on Teoría de navegación over 5 or Navegación carta over 3", () => {
    expect(
      exceeded(evaluateOfficialExam(PY.rules, 6, errors({ "Teoría de navegación": 6 }))),
    ).toEqual(["Teoría de navegación"]);
    expect(
      exceeded(evaluateOfficialExam(PY.rules, 4, errors({ "Navegación carta": 4 }))),
    ).toEqual(["Navegación carta"]);
  });

  it("has no own cap for Seguridad en la mar or Meteorología", () => {
    expect(
      evaluateOfficialExam(PY.rules, 10, errors({ "Seguridad en la mar": 10 })).passed,
    ).toBe(true);
  });
});

describe("describeRules", () => {
  it("states the format and pass rules of each licence", () => {
    expect(describeRules(PER)).toBe(
      "45 preguntas y 90 minutos. Apruebas con 13 fallos como máximo, sin pasar de 5 en Reglamento (RIPA), 2 en Balizamiento y 2 en Carta de navegación.",
    );
    expect(describeRules(PY)).toBe(
      "40 preguntas y 120 minutos. Apruebas con 12 fallos como máximo, sin pasar de 5 en Teoría de navegación y 3 en Navegación carta.",
    );
  });
});
