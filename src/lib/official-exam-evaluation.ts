export const OFFICIAL_EXAM_ERROR_LIMITS = {
  total: 13,
  ripa: 5,
  balizamiento: 2,
  cartaDeNavegacion: 2,
} as const;

export type OfficialExamTrackedTopic =
  | "ripa"
  | "balizamiento"
  | "cartaDeNavegacion";

export type OfficialExamErrorCounts = {
  total: number;
  ripa: number;
  balizamiento: number;
  cartaDeNavegacion: number;
};

export type OfficialExamEvaluation = {
  passed: boolean;
  exceededLimits: Array<OfficialExamTrackedTopic | "total">;
  counts: OfficialExamErrorCounts;
};

const normalizeTopicName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const getTrackedOfficialExamTopic = (
  topicName: string,
): OfficialExamTrackedTopic | null => {
  const normalizedTopic = normalizeTopicName(topicName);

  if (normalizedTopic === "ripa") return "ripa";
  if (normalizedTopic === "balizamiento") return "balizamiento";
  if (normalizedTopic === "carta de navegacion") return "cartaDeNavegacion";

  return null;
};

export const evaluateOfficialExam = (
  counts: OfficialExamErrorCounts,
): OfficialExamEvaluation => {
  const exceededLimits: Array<OfficialExamTrackedTopic | "total"> = [];

  if (counts.total > OFFICIAL_EXAM_ERROR_LIMITS.total) {
    exceededLimits.push("total");
  }

  if (counts.ripa > OFFICIAL_EXAM_ERROR_LIMITS.ripa) {
    exceededLimits.push("ripa");
  }

  if (counts.balizamiento > OFFICIAL_EXAM_ERROR_LIMITS.balizamiento) {
    exceededLimits.push("balizamiento");
  }

  if (
    counts.cartaDeNavegacion > OFFICIAL_EXAM_ERROR_LIMITS.cartaDeNavegacion
  ) {
    exceededLimits.push("cartaDeNavegacion");
  }

  return {
    passed: exceededLimits.length === 0,
    exceededLimits,
    counts,
  };
};
