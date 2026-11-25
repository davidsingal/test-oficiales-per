import { useSyncExternalStore } from "react";
import type { QuizAnswers, QuizMode } from "@/lib/quiz";

/**
 * The learner's progress, kept in localStorage under a single versioned key.
 * Bump STORAGE_VERSION (and migrate or drop old data in `parse`) whenever the
 * shape changes.
 */
const STORAGE_KEY = "per-progress";
const STORAGE_VERSION = 1;

export type QuestionRecord = {
  outcome: "correct" | "incorrect";
  topicName: string | null;
  /** Epoch ms of the latest answer. */
  at: number;
};

/** An official exam that was started and not handed in yet. */
export type ExamInProgress = {
  mode: QuizMode;
  answers: QuizAnswers;
  /** Time spent on a timed simulacro, so the clock pauses while away. */
  elapsedMs: number;
  updatedAt: number;
};

export type ExamResult = {
  mode: QuizMode;
  passed: boolean;
  correct: number;
  errors: number;
  total: number;
  at: number;
};

export type ExamRecord = {
  inProgress?: ExamInProgress;
  last?: ExamResult;
};

export type Progress = {
  version: typeof STORAGE_VERSION;
  /** Latest outcome per question id. */
  questions: Record<number, QuestionRecord>;
  /** Keyed by `examKey()` from `@/lib/quiz`. */
  exams: Record<string, ExamRecord>;
};

const EMPTY: Progress = { version: STORAGE_VERSION, questions: {}, exams: {} };

const parse = (raw: string | null): Progress => {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<Progress>;
    if (data.version !== STORAGE_VERSION) return EMPTY;
    return {
      version: STORAGE_VERSION,
      questions: data.questions ?? {},
      exams: data.exams ?? {},
    };
  } catch {
    return EMPTY;
  }
};

let cache: Progress | null = null;
const listeners = new Set<() => void>();

const read = (): Progress => {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) {
    try {
      cache = parse(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage can be unavailable (private mode, blocked cookies).
      cache = EMPTY;
    }
  }
  return cache;
};

const write = (next: Progress) => {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep working in memory when storage is full or unavailable.
  }
  listeners.forEach((listener) => listener());
};

const update = (change: (current: Progress) => Progress) => write(change(read()));

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  // Keep several open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** Current progress, for code outside React rendering (event handlers, fetchers). */
export const getProgress = read;

/** Progress as React state. The server render (and hydration) sees no progress. */
export const useProgress = () =>
  useSyncExternalStore(subscribe, read, () => EMPTY);

export const recordOutcomes = (
  entries: { questionId: number; topicName: string | null; outcome: QuestionRecord["outcome"] }[],
) => {
  if (entries.length === 0) return;
  const at = Date.now();
  update((current) => {
    const questions = { ...current.questions };
    for (const entry of entries) {
      questions[entry.questionId] = {
        outcome: entry.outcome,
        topicName: entry.topicName,
        at,
      };
    }
    return { ...current, questions };
  });
};

const updateExam = (key: string, change: (record: ExamRecord) => ExamRecord) =>
  update((current) => ({
    ...current,
    exams: { ...current.exams, [key]: change(current.exams[key] ?? {}) },
  }));

export const saveExamInProgress = (
  key: string,
  inProgress: Omit<ExamInProgress, "updatedAt">,
) =>
  updateExam(key, (record) => ({
    ...record,
    inProgress: { ...inProgress, updatedAt: Date.now() },
  }));

export const clearExamInProgress = (key: string) =>
  updateExam(key, ({ last }) => (last ? { last } : {}));

export const saveExamResult = (key: string, result: Omit<ExamResult, "at">) =>
  updateExam(key, () => ({ last: { ...result, at: Date.now() } }));

export const resetProgress = () => write(EMPTY);

/** Ids of questions whose latest answer was wrong, most recent first. */
export const getFailedQuestionIds = (progress: Progress) =>
  Object.entries(progress.questions)
    .filter(([, record]) => record.outcome === "incorrect")
    .sort(([, a], [, b]) => b.at - a.at)
    .map(([id]) => Number(id));
