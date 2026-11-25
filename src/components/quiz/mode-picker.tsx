"use client";

import { ClipboardCheckIcon, TimerIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizMode } from "@/lib/quiz";
import type { ExamResult } from "@/lib/progress-store";

type ModePickerProps = {
  recommended: QuizMode;
  /** Minutes allowed in simulacro mode, when the test is timed. */
  timeLimitMinutes?: number;
  /** The previous attempt at this test, if any. */
  lastResult?: ExamResult;
  onPick: (mode: QuizMode) => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
});

const ModePicker = ({
  recommended,
  timeLimitMinutes,
  lastResult,
  onPick,
}: ModePickerProps) => {
  const modes: {
    mode: QuizMode;
    title: string;
    description: string;
    Icon: typeof TimerIcon;
  }[] = [
    {
      mode: "practica",
      title: "Práctica",
      description:
        "Sabes al momento si has acertado y cuál es la respuesta correcta.",
      Icon: ClipboardCheckIcon,
    },
    {
      mode: "simulacro",
      title: "Simulación",
      description: timeLimitMinutes
        ? `Como el día del examen: ${timeLimitMinutes} minutos, puedes cambiar las respuestas y no ves la corrección hasta que entregas.`
        : "Como el día del examen: puedes cambiar las respuestas y no ves la corrección hasta que entregas.",
      Icon: TimerIcon,
    },
  ];

  return (
    <section aria-labelledby="mode-picker-title" className="space-y-3">
      {lastResult && (
        <p className="text-sm text-muted-foreground">
          La última vez ({dateFormatter.format(lastResult.at)},{" "}
          {lastResult.mode === "simulacro" ? "simulación" : "práctica"}):{" "}
          <span
            className={cn(
              "font-medium",
              lastResult.passed
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400",
            )}
          >
            {lastResult.passed ? "APTO" : "NO APTO"}
          </span>
          , con {lastResult.errors} {lastResult.errors === 1 ? "fallo" : "fallos"}.
        </p>
      )}
      <h2 id="mode-picker-title" className="text-lg font-medium">
        ¿Cómo quieres hacer el test?
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {modes.map(({ mode, title, description, Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onPick(mode)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              mode === recommended && "border-primary",
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <Icon className="size-4" />
              {title}
              {mode === recommended && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Recomendada
                </span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">{description}</span>
            <span className="mt-auto pt-1 text-sm font-medium underline underline-offset-4">
              Empezar
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ModePicker;
