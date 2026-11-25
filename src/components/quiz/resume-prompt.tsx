"use client";

import { Button } from "@/components/ui/button";
import type { ExamInProgress } from "@/lib/progress-store";

type ResumePromptProps = {
  saved: ExamInProgress;
  total: number;
  /** Time limit in simulacro, to show the time left. */
  limitMs: number | null;
  onResume: () => void;
  onDiscard: () => void;
};

const ResumePrompt = ({
  saved,
  total,
  limitMs,
  onResume,
  onDiscard,
}: ResumePromptProps) => {
  const answered = Object.keys(saved.answers).length;
  const details = [
    saved.mode === "simulacro" ? "Simulación" : "Práctica",
    `${answered} de ${total} ${answered === 1 ? "respondida" : "respondidas"}`,
  ];
  if (saved.mode === "simulacro" && limitMs !== null) {
    const minutesLeft = Math.max(0, Math.ceil((limitMs - saved.elapsedMs) / 60_000));
    details.push(`quedan ${minutesLeft} min`);
  }

  return (
    <section
      aria-labelledby="resume-title"
      className="space-y-3 rounded-xl border border-primary p-4"
    >
      <div className="space-y-1">
        <h2 id="resume-title" className="text-lg font-medium">
          Tienes este examen a medias
        </h2>
        <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={onResume}>
          Continuar
        </Button>
        <Button size="lg" variant="outline" onClick={onDiscard}>
          Empezar de nuevo
        </Button>
      </div>
    </section>
  );
};

export default ResumePrompt;
