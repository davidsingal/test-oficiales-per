import type { Question } from "@/types/payload-types";

export type LicenceId = Question["licence"];

/** A topic with its own cap on errors in the official exam. */
export type TopicLimit = {
  /** Topic name as stored in the database. */
  topic: string;
  /** Short name for the results table and the error counter. */
  label: string;
  maxErrors: number;
};

/** Official exam format and pass rules (RD 875/2014, anexo II). */
export type ExamRules = {
  questionCount: number;
  durationMinutes: number;
  /** Most errors allowed in total (blank answers count as errors). */
  maxErrors: number;
  topicLimits: TopicLimit[];
};

export type Licence = {
  id: LicenceId;
  shortName: string;
  name: string;
  /** For "examen …": "del PER", "de Patrón de Yate". */
  of: string;
  /** Prefix of the licence's pages. PER keeps the root URLs it always had. */
  basePath: string;
  /** The topic answered on the printed chart. It's left out of random tests. */
  chartTopic: string;
  /** Topics named as examples in descriptions, e.g. "como el RIPA o el balizamiento". */
  exampleTopics: string;
  rules: ExamRules;
};

export const PER: Licence = {
  id: "per",
  shortName: "PER",
  name: "Patrón de Embarcaciones de Recreo",
  of: "del PER",
  basePath: "",
  chartTopic: "Carta de navegación",
  exampleTopics: "como el RIPA o el balizamiento",
  rules: {
    questionCount: 45,
    durationMinutes: 90,
    maxErrors: 13,
    topicLimits: [
      { topic: "Reglamento (RIPA)", label: "RIPA", maxErrors: 5 },
      { topic: "Balizamiento", label: "Balizamiento", maxErrors: 2 },
      { topic: "Carta de navegación", label: "Carta de navegación", maxErrors: 2 },
    ],
  },
};

/**
 * Patrón de Yate. The decree also lets candidates pass by modules (genérico and
 * navegación, kept for two sittings); the app applies the global criterion,
 * which is how a full exam is passed in one sitting.
 */
export const PY: Licence = {
  id: "py",
  shortName: "PY",
  name: "Patrón de Yate",
  of: "de Patrón de Yate",
  basePath: "/patron-de-yate",
  chartTopic: "Navegación carta",
  exampleTopics: "como meteorología o teoría de navegación",
  rules: {
    questionCount: 40,
    durationMinutes: 120,
    maxErrors: 12,
    topicLimits: [
      { topic: "Teoría de navegación", label: "Teoría de navegación", maxErrors: 5 },
      { topic: "Navegación carta", label: "Navegación carta", maxErrors: 3 },
    ],
  },
};

export const LICENCES: Record<LicenceId, Licence> = { per: PER, py: PY };

/** The licence whose pages contain this path (PER for everything else). */
export const licenceForPath = (pathname: string): Licence =>
  pathname === PY.basePath || pathname.startsWith(`${PY.basePath}/`) ? PY : PER;

/**
 * The official pass rules as a sentence, for the exam page: "45 preguntas y 90
 * minutos. Apruebas con 13 fallos como máximo, sin pasar de 5 en …, 2 en … y 2 en …."
 */
export const describeRules = ({ rules }: Licence) => {
  const limits = rules.topicLimits.map((limit) => `${limit.maxErrors} en ${limit.topic}`);
  const last = limits.pop();
  const topics = limits.length ? `${limits.join(", ")} y ${last}` : last;
  return `${rules.questionCount} preguntas y ${rules.durationMinutes} minutos. Apruebas con ${rules.maxErrors} fallos como máximo, sin pasar de ${topics}.`;
};
