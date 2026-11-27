"use client";

import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizSummary } from "@/lib/quiz";

type QuizResultsProps = {
  summary: QuizSummary;
  timedOut: boolean;
  onlyFailed: boolean;
  onToggleOnlyFailed: () => void;
  onRestart: () => void;
  onNewTest?: () => void;
  isLoadingNewTest?: boolean;
  ref?: Ref<HTMLElement>;
};

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const QuizResults = ({
  summary,
  timedOut,
  onlyFailed,
  onToggleOnlyFailed,
  onRestart,
  onNewTest,
  isLoadingNewTest,
  ref,
}: QuizResultsProps) => {
  const { evaluation } = summary;
  const scored = summary.total - summary.neutral;

  const limitRows = evaluation?.limits ?? [];

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="quiz-results-title"
      className="scroll-mt-24 space-y-4 rounded-xl border p-4 outline-none sm:p-6"
    >
      <div className="space-y-1">
        <h2 id="quiz-results-title" className="text-sm text-muted-foreground">
          {timedOut ? "Tiempo agotado · Resultado" : "Resultado"}
        </h2>
        {evaluation ? (
          <p
            className={cn(
              "text-3xl font-semibold",
              evaluation.passed
                ? "text-success"
                : "text-destructive",
            )}
          >
            {evaluation.passed ? "APTO" : "NO APTO"}
          </p>
        ) : (
          <p className="text-3xl font-semibold">
            {summary.correct} de {scored}{" "}
            {scored === 1 ? "acierto" : "aciertos"}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {[
            countLabel(summary.correct, "acierto", "aciertos"),
            countLabel(summary.incorrect, "fallo", "fallos"),
            summary.unanswered > 0 && `${summary.unanswered} en blanco`,
            summary.neutral > 0 &&
              countLabel(summary.neutral, "anulada", "anuladas"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {evaluation && (
        <div className="space-y-2">
          <table className="w-full text-sm">
            <caption className="sr-only">Fallos por bloque y máximo permitido</caption>
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Bloque</th>
                <th className="py-1 text-right font-normal">Fallos / máximo</th>
              </tr>
            </thead>
            <tbody>
              {limitRows.map((row) => {
                const { exceeded } = row;
                return (
                  <tr key={row.key} className="border-t">
                    <td className="py-1.5">{row.label}</td>
                    <td
                      className={cn(
                        "py-1.5 text-right tabular-nums",
                        exceeded && "font-medium text-destructive",
                      )}
                    >
                      {row.errors} / {row.maxErrors}
                      {exceeded && " · superado"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {summary.unanswered > 0 && (
            <p className="text-xs text-muted-foreground">
              Las preguntas en blanco cuentan como fallos.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {summary.errors > 0 && (
          <Button
            variant={onlyFailed ? "default" : "outline"}
            size="lg"
            aria-pressed={onlyFailed}
            onClick={onToggleOnlyFailed}
          >
            {onlyFailed ? "Ver todas las preguntas" : `Repasar falladas (${summary.errors})`}
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onRestart}>
          Repetir este test
        </Button>
        {onNewTest && (
          <Button
            variant="outline"
            size="lg"
            onClick={onNewTest}
            disabled={isLoadingNewTest}
          >
            {isLoadingNewTest ? "Cargando…" : "Otro test"}
          </Button>
        )}
      </div>
    </section>
  );
};

export default QuizResults;
