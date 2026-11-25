"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getOutcome,
  summarizeQuiz,
  type AnswerLetter,
  type QuizAnswers,
  type QuizMode,
  type QuizQuestion,
  type QuizSummary,
} from "@/lib/quiz";
import { OFFICIAL_EXAM_ERROR_LIMITS } from "@/lib/official-exam-evaluation";
import ModePicker from "./mode-picker";
import QuestionCard from "./question-card";
import QuizResults from "./quiz-results";

type QuizSessionProps = {
  questions: QuizQuestion[];
  recommendedMode: QuizMode;
  /** Apply the official pass/fail rules (total and per-topic error limits). */
  official?: boolean;
  /** Countdown for simulacro mode, in minutes. */
  timeLimitMinutes?: number;
  showTopic?: boolean;
  showSession?: boolean;
  showSourceLink?: boolean;
  /** Offer "Nuevo test", which re-renders the page to draw new questions. */
  allowNewTest?: boolean;
  /** Let the user choose simulacro. Without it the test starts in práctica. */
  allowSimulacro?: boolean;
};

type Phase = "picking" | "running" | "finished";

const formatRemaining = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const ProgressBar = ({
  mode,
  phase,
  summary,
  official,
  remainingMs,
  onFinish,
  onShowResults,
}: {
  mode: QuizMode;
  phase: Phase;
  summary: QuizSummary;
  official: boolean;
  remainingMs: number | null;
  onFinish: () => void;
  onShowResults: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const pending = summary.total - summary.answered;
  const percent = summary.total ? (summary.answered / summary.total) * 100 : 0;
  const finished = phase === "finished";

  const requestFinish = () => {
    if (pending > 0) setConfirming(true);
    else onFinish();
  };

  let status: string;
  if (finished) {
    status = summary.evaluation
      ? `Corregido · ${summary.evaluation.passed ? "APTO" : "NO APTO"}`
      : `Corregido · ${summary.correct} correctas`;
  } else if (mode === "practica") {
    status = `✓ ${summary.correct} · ✗ ${summary.incorrect}`;
    if (official) {
      status += ` · Fallos ${summary.errors}/${OFFICIAL_EXAM_ERROR_LIMITS.total}`;
    }
  } else {
    status = pending > 0 ? `${pending} sin responder` : "Todas respondidas";
  }

  // Only práctica shows correctness while answering; simulacro waits for the hand-in.
  const isOverLimit =
    !finished && mode === "practica" && summary.evaluation?.passed === false;

  return (
    <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <p className="tabular-nums">
          <span className="font-medium">
            {summary.answered}/{summary.total}
          </span>{" "}
          <span
            className={cn(
              "text-muted-foreground",
              isOverLimit && "text-red-700 dark:text-red-400",
            )}
          >
            · {status}
            {isOverLimit && " · límite superado"}
          </span>
        </p>

        <div className="flex items-center gap-3">
          {remainingMs !== null && !finished && (
            <span
              role="timer"
              aria-label="Tiempo restante"
              className={cn(
                "inline-flex items-center gap-1 font-medium tabular-nums",
                remainingMs < 10 * 60_000 && "text-amber-700 dark:text-amber-400",
                remainingMs < 5 * 60_000 && "text-red-700 dark:text-red-400",
              )}
            >
              <TimerIcon className="size-4" />
              {formatRemaining(remainingMs)}
            </span>
          )}
          {finished ? (
            <Button size="sm" variant="outline" onClick={onShowResults}>
              Ver resultado
            </Button>
          ) : (
            !confirming && (
              <Button
                size="sm"
                variant={mode === "simulacro" ? "default" : "outline"}
                onClick={requestFinish}
              >
                {mode === "simulacro" ? "Entregar examen" : "Terminar"}
              </Button>
            )
          )}
        </div>
      </div>

      {confirming && !finished && (
        <div
          role="alert"
          className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2 text-sm"
        >
          <span className="mr-auto">
            Te {pending === 1 ? "queda 1 pregunta" : `quedan ${pending} preguntas`} sin
            responder; contarán como fallos.
          </span>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
            Seguir respondiendo
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setConfirming(false);
              onFinish();
            }}
          >
            {mode === "simulacro" ? "Entregar igualmente" : "Terminar igualmente"}
          </Button>
        </div>
      )}

      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Preguntas respondidas"
        aria-valuemin={0}
        aria-valuemax={summary.total}
        aria-valuenow={summary.answered}
      >
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const QuizSession = ({
  questions,
  recommendedMode,
  official = false,
  timeLimitMinutes,
  showTopic = false,
  showSession = false,
  showSourceLink = false,
  allowNewTest = false,
  allowSimulacro = true,
}: QuizSessionProps) => {
  const router = useRouter();
  const [isLoadingNewTest, startNewTest] = useTransition();
  const sessionRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const [phase, setPhase] = useState<Phase>(
    allowSimulacro ? "picking" : "running",
  );
  const [mode, setMode] = useState<QuizMode>(
    allowSimulacro ? recommendedMode : "practica",
  );
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [onlyFailed, setOnlyFailed] = useState(false);

  const finished = phase === "finished";
  const summary = useMemo(
    () => summarizeQuiz(questions, answers, { finished, official }),
    [questions, answers, finished, official],
  );

  const finish = (byTimeout = false) => {
    setTimedOut(byTimeout);
    setPhase("finished");
  };

  // Simulacro countdown: tick every second and hand in the exam at zero.
  useEffect(() => {
    if (phase !== "running" || deadline === null) return;

    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        setTimedOut(true);
        setPhase("finished");
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, deadline]);

  // Bring the result into view when the test is corrected.
  useEffect(() => {
    if (!finished) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    resultsRef.current?.focus({ preventScroll: true });
  }, [finished]);

  const start = (pickedMode: QuizMode) => {
    const startedAt = Date.now();
    setMode(pickedMode);
    setAnswers({});
    setTimedOut(false);
    setOnlyFailed(false);
    setNow(startedAt);
    setDeadline(
      pickedMode === "simulacro" && timeLimitMinutes
        ? startedAt + timeLimitMinutes * 60_000
        : null,
    );
    setPhase("running");
  };

  const restart = () => {
    if (allowSimulacro) {
      setPhase("picking");
      setAnswers({});
      setOnlyFailed(false);
    } else {
      start("practica");
    }
    sessionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const select = (questionId: number, letter: AnswerLetter) => {
    const next = { ...answers, [questionId]: letter };
    setAnswers(next);

    // In práctica every answer is final, so the test ends with the last one.
    if (
      mode === "practica" &&
      questions.every((question) => next[question.id])
    ) {
      finish();
    }
  };

  if (questions.length === 0) {
    return (
      <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        No hay preguntas disponibles para este test.
      </p>
    );
  }

  if (phase === "picking") {
    return (
      <div ref={sessionRef} className="scroll-mt-4">
        <ModePicker
          recommended={recommendedMode}
          timeLimitMinutes={timeLimitMinutes}
          onPick={start}
        />
      </div>
    );
  }

  const visibleQuestions =
    finished && onlyFailed
      ? questions.filter((question) => {
          const outcome = getOutcome(question, answers[question.id]);
          return outcome === "incorrect" || outcome === "unanswered";
        })
      : questions;

  return (
    <div ref={sessionRef} className="scroll-mt-4 space-y-6">
      <ProgressBar
        mode={mode}
        phase={phase}
        summary={summary}
        official={official}
        remainingMs={deadline === null ? null : deadline - now}
        onFinish={() => finish()}
        onShowResults={() =>
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {finished && (
        <QuizResults
          ref={resultsRef}
          summary={summary}
          timedOut={timedOut}
          onlyFailed={onlyFailed}
          onToggleOnlyFailed={() => setOnlyFailed((value) => !value)}
          onRestart={restart}
          onNewTest={
            allowNewTest ? () => startNewTest(() => router.refresh()) : undefined
          }
          isLoadingNewTest={isLoadingNewTest}
        />
      )}

      <div className="space-y-6">
        {visibleQuestions.map((question) => {
          const selected = answers[question.id];
          const revealed = finished || (mode === "practica" && Boolean(selected));

          return (
            <QuestionCard
              key={question.id}
              question={question}
              selected={selected}
              onSelect={(letter) => select(question.id, letter)}
              revealed={revealed}
              locked={revealed}
              showTopic={showTopic}
              showSession={showSession}
              showSourceLink={showSourceLink}
            />
          );
        })}
      </div>

      {!finished && (
        <p className="text-center text-sm text-muted-foreground">
          {mode === "simulacro"
            ? "Cuando acabes, pulsa «Entregar examen» arriba."
            : "Responde todas las preguntas para ver el resultado."}
        </p>
      )}
    </div>
  );
};

export default QuizSession;
