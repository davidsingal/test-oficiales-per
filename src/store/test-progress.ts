import { atom } from "jotai";

export type QuestionOutcome = "correct" | "incorrect" | "neutral";

type ProgressByQuestion = Record<number, QuestionOutcome>;
type ProgressByPath = Record<string, ProgressByQuestion>;

export const testProgressAtom = atom<ProgressByPath>({});

export const setQuestionOutcomeAtom = atom(
  null,
  (
    get,
    set,
    payload: { path: string; questionId: number; outcome: QuestionOutcome },
  ) => {
    const current = get(testProgressAtom);
    const currentPathState = current[payload.path] ?? {};

    set(testProgressAtom, {
      ...current,
      [payload.path]: {
        ...currentPathState,
        [payload.questionId]: payload.outcome,
      },
    });
  },
);

export const resetPathProgressAtom = atom(null, (get, set, path: string) => {
  const current = get(testProgressAtom);
  set(testProgressAtom, {
    ...current,
    [path]: {},
  });
});
