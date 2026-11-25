"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getFailedQuestionIds,
  resetProgress,
  useProgress,
} from "@/lib/progress-store";
import { formatSessionLabel } from "@/lib/quiz";
import { monthLabels } from "@/lib/utils";
import type { Question } from "@/types/payload-types";

const isMonth = (value: string): value is Question["month"] => value in monthLabels;

const labelForExamKey = (key: string) => {
  const [year, month, test] = key.split("/");
  return isMonth(month)
    ? formatSessionLabel(Number(year), month, Number(test))
    : key;
};

/** The learner's saved progress on the home page, with a way to reset it. */
const ProgressOverview = () => {
  const progress = useProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const records = Object.values(progress.questions);
  const exams = Object.entries(progress.exams);
  if (records.length === 0 && exams.length === 0) return null;

  const correct = records.filter((record) => record.outcome === "correct").length;
  const accuracy = records.length ? Math.round((correct / records.length) * 100) : 0;
  const failedCount = getFailedQuestionIds(progress).length;
  const finishedExams = exams.filter(([, record]) => record.last);
  const passedExams = finishedExams.filter(([, record]) => record.last?.passed);
  const inProgress = exams
    .filter(([, record]) => record.inProgress)
    .sort(([, a], [, b]) => (b.inProgress?.updatedAt ?? 0) - (a.inProgress?.updatedAt ?? 0));

  return (
    <section aria-labelledby="progress-title" className="space-y-4 rounded-xl border p-4">
      <div className="space-y-1">
        <h2 id="progress-title" className="text-lg font-medium">
          Tu progreso
        </h2>
        <p className="text-sm text-muted-foreground">
          {records.length > 0 &&
            `${records.length} ${records.length === 1 ? "pregunta practicada" : "preguntas practicadas"} · ${accuracy}% de aciertos`}
          {records.length > 0 && finishedExams.length > 0 && " · "}
          {finishedExams.length > 0 &&
            `${passedExams.length} de ${finishedExams.length} ${finishedExams.length === 1 ? "examen aprobado" : "exámenes aprobados"}`}
        </p>
      </div>

      {inProgress.length > 0 && (
        <ul className="space-y-1 text-sm">
          {inProgress.map(([key]) => (
            <li key={key}>
              <Link
                href={`/examenes-oficiales/${key}`}
                className="underline underline-offset-4"
              >
                Continuar el examen de {labelForExamKey(key)}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {failedCount > 0 && (
          <Link href="/repaso" className={buttonVariants({ size: "lg" })}>
            Repasar mis fallos ({failedCount})
          </Link>
        )}
        {confirmingReset ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2 text-sm"
          >
            <span>Se borrará todo lo que tienes guardado en este navegador.</span>
            <Button size="sm" variant="outline" onClick={() => setConfirmingReset(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                resetProgress();
                setConfirmingReset(false);
              }}
            >
              Borrar
            </Button>
          </div>
        ) : (
          <Button size="lg" variant="ghost" onClick={() => setConfirmingReset(true)}>
            Borrar progreso
          </Button>
        )}
      </div>
    </section>
  );
};

export default ProgressOverview;
