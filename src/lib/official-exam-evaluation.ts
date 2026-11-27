import type { ExamRules } from "@/lib/licences";

/** One error cap of the official exam: the total, or one topic's. */
export type OfficialExamLimit = {
  /** "total", or the topic name. */
  key: string;
  label: string;
  errors: number;
  maxErrors: number;
  exceeded: boolean;
};

export type OfficialExamEvaluation = {
  passed: boolean;
  /** The total first, then each topic with its own cap, in the rules' order. */
  limits: OfficialExamLimit[];
};

/** Lowercase, no accents, trimmed: topic names are compared loosely. */
export const normalizeTopicName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Applies the official pass rules. `errorsByTopic` is keyed by normalized topic
 * name (see `normalizeTopicName`).
 */
export const evaluateOfficialExam = (
  rules: ExamRules,
  totalErrors: number,
  errorsByTopic: Record<string, number>,
): OfficialExamEvaluation => {
  const limits: OfficialExamLimit[] = [
    { key: "total", label: "Total", errors: totalErrors, maxErrors: rules.maxErrors },
    ...rules.topicLimits.map((limit) => ({
      key: limit.topic,
      label: limit.label,
      errors: errorsByTopic[normalizeTopicName(limit.topic)] ?? 0,
      maxErrors: limit.maxErrors,
    })),
  ].map((limit) => ({ ...limit, exceeded: limit.errors > limit.maxErrors }));

  return { passed: limits.every((limit) => !limit.exceeded), limits };
};
