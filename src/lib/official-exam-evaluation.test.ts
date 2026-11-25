import { describe, expect, it } from "vitest";
import {
  evaluateOfficialExam,
  getTrackedOfficialExamTopic,
} from "@/lib/official-exam-evaluation";

describe("getTrackedOfficialExamTopic", () => {
  it("matches the topic names stored in the database", () => {
    // Regression: RIPA is stored as "Reglamento (RIPA)", which an exact
    // "ripa" match missed, so RIPA errors were never counted.
    expect(getTrackedOfficialExamTopic("Reglamento (RIPA)")).toBe("ripa");
    expect(getTrackedOfficialExamTopic("Balizamiento")).toBe("balizamiento");
    expect(getTrackedOfficialExamTopic("Carta de navegación")).toBe(
      "cartaDeNavegacion",
    );
  });

  it("ignores case, accents and surrounding spaces", () => {
    expect(getTrackedOfficialExamTopic("  CARTA DE NAVEGACION ")).toBe(
      "cartaDeNavegacion",
    );
    expect(getTrackedOfficialExamTopic("ripa")).toBe("ripa");
  });

  it("returns null for topics without their own limit", () => {
    expect(getTrackedOfficialExamTopic("Seguridad")).toBeNull();
    expect(getTrackedOfficialExamTopic("Meteorología")).toBeNull();
    // "ripa" only as a whole word.
    expect(getTrackedOfficialExamTopic("Tripulación")).toBeNull();
  });
});

describe("evaluateOfficialExam", () => {
  const counts = { total: 0, ripa: 0, balizamiento: 0, cartaDeNavegacion: 0 };

  it("passes at exactly the limits", () => {
    const result = evaluateOfficialExam({
      total: 13,
      ripa: 5,
      balizamiento: 2,
      cartaDeNavegacion: 2,
    });
    expect(result.passed).toBe(true);
    expect(result.exceededLimits).toEqual([]);
  });

  it("fails when the total goes over 13", () => {
    expect(evaluateOfficialExam({ ...counts, total: 14 }).exceededLimits).toEqual([
      "total",
    ]);
  });

  it("fails on a single block over its limit, even with few errors overall", () => {
    expect(evaluateOfficialExam({ ...counts, total: 6, ripa: 6 })).toMatchObject({
      passed: false,
      exceededLimits: ["ripa"],
    });
    expect(
      evaluateOfficialExam({ ...counts, total: 3, balizamiento: 3 }).exceededLimits,
    ).toEqual(["balizamiento"]);
    expect(
      evaluateOfficialExam({ ...counts, total: 3, cartaDeNavegacion: 3 })
        .exceededLimits,
    ).toEqual(["cartaDeNavegacion"]);
  });
});
