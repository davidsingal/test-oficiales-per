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
import {
  clearExamInProgress,
  recordOutcomes,
  saveExamInProgress,
  saveExamResult,
  useProgress,
} from "@/lib/progress-store";
import ModePicker from "./mode-picker";
import ResumePrompt from "./resume-prompt";
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
  /** Offer "Otro test", which re-renders the page to draw new questions. */
  allowNewTest?: boolean;
  /** Let the user choose simulacro. Without it the test starts in práctica. */
  allowSimulacro?: boolean;
  /** Saves the unfinished attempt and the last result under this key. */
  examKey?: string;
  /** Custom "Otro test" for client-rendered sessions (takes precedence). */
  onNewTest?: () => void;
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
      : `Corregido · ${summary.correct} ${summary.correct === 1 ? "acierto" : "aciertos"}`;
  } else if (mode === "practica") {
    status = `✓ ${summary.correct} · ✗ ${summary.incorrect}`;
  } else {
    status = pending > 0 ? `${pending} en blanco` : "Todas respondidas";
  }

  // Only práctica shows correctness while answering; simulacro waits for the hand-in.
  const showErrors = official && !finished && mode === "practica";
  const isOverLimit = showErrors && summary.evaluation?.passed === false;
  const errorCounts = summary.evaluation?.counts;
  const errorItems = errorCounts
    ? [
        { key: "total", label: null, errors: errorCounts.total, limit: OFFICIAL_EXAM_ERROR_LIMITS.total },
        { key: "ripa", label: "RIPA", errors: errorCounts.ripa, limit: OFFICIAL_EXAM_ERROR_LIMITS.ripa },
        { key: "balizamiento", label: "Balizamiento", errors: errorCounts.balizamiento, limit: OFFICIAL_EXAM_ERROR_LIMITS.balizamiento },
        { key: "carta", label: "Carta de navegación", errors: errorCounts.cartaDeNavegacion, limit: OFFICIAL_EXAM_ERROR_LIMITS.cartaDeNavegacion },
      ]
    : [];

  return (
    <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <div className="space-y-0.5 tabular-nums">
          <p>
            <span className="font-medium">
              {summary.answered}/{summary.total}
            </span>{" "}
            <span className="text-muted-foreground">· {status}</span>
            {isOverLimit && (
              <span className="font-medium text-destructive">
                {" "}
                · ya sería NO APTO
              </span>
            )}
          </p>
          {showErrors && (
            <p className="text-xs text-muted-foreground">
              Fallos:{" "}
              {errorItems.map((item, index) => (
                <span key={item.key}>
                  {index > 0 && " · "}
                  <span
                    className={cn(
                      item.errors > item.limit &&
                        "font-medium text-destructive",
                    )}
                  >
                    {item.label && `${item.label} `}
                    {item.errors}/{item.limit}
                  </span>
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {remainingMs !== null && !finished && (
            <span
              role="timer"
              aria-label="Tiempo restante"
              className={cn(
                "inline-flex items-center gap-1 font-medium tabular-nums",
                remainingMs < 10 * 60_000 && "text-warning",
                remainingMs < 5 * 60_000 && "text-destructive",
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
            Te {pending === 1 ? "queda 1 pregunta" : `quedan ${pending} preguntas`} en
            blanco y {pending === 1 ? "contará" : "contarán"} como{" "}
            {pending === 1 ? "fallo" : "fallos"}.
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
  examKey,
  onNewTest,
}: QuizSessionProps) => {
  const router = useRouter();
  const progress = useProgress();
  const examRecord = examKey ? progress.exams[examKey] : undefined;
  const limitMs = timeLimitMinutes ? timeLimitMinutes * 60_000 : null;
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
  // Latest answers for callbacks that outlive a render (the countdown).
  const answersRef = useRef<QuizAnswers>({});

  const finished = phase === "finished";
  const summary = useMemo(
    () => summarizeQuiz(questions, answers, { finished, official }),
    [questions, answers, finished, official],
  );

  const elapsedAt = (time: number) =>
    deadline !== null && limitMs !== null ? limitMs - (deadline - time) : 0;

  const persistInProgress = (
    nextAnswers: QuizAnswers,
    nextMode: QuizMode,
    elapsedMs: number,
  ) => {
    if (!examKey) return;
    saveExamInProgress(examKey, {
      mode: nextMode,
      answers: nextAnswers,
      elapsedMs,
    });
  };

  // Hand in: save outcomes and, for official exams, the result.
  const completeRef = useRef<(byTimeout: boolean) => void>(() => {});
  const complete = (byTimeout: boolean) => {
    const finalAnswers = answersRef.current;
    const finalSummary = summarizeQuiz(questions, finalAnswers, {
      finished: true,
      official,
    });

    if (mode === "simulacro") {
      // Práctica already saved each answer as it was given.
      recordOutcomes(
        questions.flatMap((question) => {
          const outcome = getOutcome(question, finalAnswers[question.id]);
          return outcome === "correct" || outcome === "incorrect"
            ? [{ questionId: question.id, topicName: question.topicName, outcome }]
            : [];
        }),
      );
    }

    if (examKey) {
      saveExamResult(examKey, {
        mode,
        passed: finalSummary.evaluation?.passed ?? finalSummary.errors === 0,
        correct: finalSummary.correct,
        errors: finalSummary.errors,
        total: finalSummary.total,
      });
    }

    setTimedOut(byTimeout);
    setPhase("finished");
  };
  useEffect(() => {
    completeRef.current = complete;
  });

  // Simulacro countdown: tick every second, save the time spent so the clock
  // pauses while away, and hand in the exam at zero.
  useEffect(() => {
    if (phase !== "running" || deadline === null || limitMs === null) return;

    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        completeRef.current(true);
      } else if (examKey) {
        saveExamInProgress(examKey, {
          mode: "simulacro",
          answers: answersRef.current,
          elapsedMs: limitMs - (deadline - current),
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, deadline, limitMs, examKey]);

  // Bring the result into view when the test is corrected.
  useEffect(() => {
    if (!finished) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    resultsRef.current?.focus({ preventScroll: true });
  }, [finished]);

  const run = (
    pickedMode: QuizMode,
    initialAnswers: QuizAnswers = {},
    elapsedMs = 0,
  ) => {
    const startedAt = Date.now();
    answersRef.current = initialAnswers;
    setMode(pickedMode);
    setAnswers(initialAnswers);
    setTimedOut(false);
    setOnlyFailed(false);
    setNow(startedAt);
    setDeadline(
      pickedMode === "simulacro" && limitMs !== null
        ? startedAt + limitMs - elapsedMs
        : null,
    );
    setPhase("running");
    persistInProgress(initialAnswers, pickedMode, elapsedMs);
  };

  const start = (pickedMode: QuizMode) => run(pickedMode);

  const restart = () => {
    if (allowSimulacro) {
      answersRef.current = {};
      setPhase("picking");
      setAnswers({});
      setOnlyFailed(false);
    } else {
      start("practica");
    }
    sessionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const select = (questionId: number, letter: AnswerLetter) => {
    const next = { ...answersRef.current, [questionId]: letter };
    answersRef.current = next;
    setAnswers(next);

    if (mode === "practica") {
      const question = questions.find(({ id }) => id === questionId);
      const outcome = question ? getOutcome(question, letter) : "neutral";
      if (question && (outcome === "correct" || outcome === "incorrect")) {
        recordOutcomes([
          { questionId, topicName: question.topicName, outcome },
        ]);
      }
    }

    // In práctica every answer is final, so the test ends with the last one.
    if (mode === "practica" && questions.every((q) => next[q.id])) {
      complete(false);
    } else {
      persistInProgress(next, mode, elapsedAt(now));
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
    const saved = examRecord?.inProgress;

    return (
      <div ref={sessionRef} className="scroll-mt-4">
        {saved && examKey ? (
          <ResumePrompt
            saved={saved}
            total={questions.length}
            limitMs={limitMs}
            onResume={() => run(saved.mode, saved.answers, saved.elapsedMs)}
            onDiscard={() => clearExamInProgress(examKey)}
          />
        ) : (
          <ModePicker
            recommended={recommendedMode}
            timeLimitMinutes={timeLimitMinutes}
            lastResult={examRecord?.last}
            onPick={start}
          />
        )}
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
        onFinish={() => complete(false)}
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
            onNewTest ??
            (allowNewTest ? () => startNewTest(() => router.refresh()) : undefined)
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
              showPageLink
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
