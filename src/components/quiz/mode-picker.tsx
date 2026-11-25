"use client";

import { ClipboardCheckIcon, TimerIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizMode } from "@/lib/quiz";

type ModePickerProps = {
  recommended: QuizMode;
  /** Minutes allowed in simulacro mode, when the test is timed. */
  timeLimitMinutes?: number;
  onPick: (mode: QuizMode) => void;
};

const ModePicker = ({ recommended, timeLimitMinutes, onPick }: ModePickerProps) => {
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
        "Ves si aciertas nada más responder cada pregunta, con la respuesta correcta.",
      Icon: ClipboardCheckIcon,
    },
    {
      mode: "simulacro",
      title: "Simulacro",
      description: timeLimitMinutes
        ? `Como el examen real: ${timeLimitMinutes} minutos, puedes cambiar respuestas y ves el resultado al entregar.`
        : "Como el examen real: puedes cambiar respuestas y ves el resultado al entregar.",
      Icon: TimerIcon,
    },
  ];

  return (
    <section aria-labelledby="mode-picker-title" className="space-y-3">
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
                  Recomendado
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
