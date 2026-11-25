import { describe, expect, it } from "vitest";
import { getFailedQuestionIds, type Progress } from "@/lib/progress-store";

describe("getFailedQuestionIds", () => {
  it("lists questions last answered wrong, most recent first", () => {
    const progress: Progress = {
      version: 1,
      exams: {},
      questions: {
        1: { outcome: "incorrect", topicName: "Seguridad", at: 100 },
        2: { outcome: "correct", topicName: "Seguridad", at: 300 },
        3: { outcome: "incorrect", topicName: "Balizamiento", at: 200 },
      },
    };

    expect(getFailedQuestionIds(progress)).toEqual([3, 1]);
  });
});
