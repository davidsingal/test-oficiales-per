"use client";

import { CheckIcon, FileTextIcon, XIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ShareQuestionButton from "@/components/share-question-button";
import { cn } from "@/lib/utils";
import {
  getOutcome,
  type AnswerLetter,
  type QuizQuestion,
} from "@/lib/quiz";

type QuestionCardProps = {
  question: QuizQuestion;
  selected: AnswerLetter | undefined;
  onSelect: (letter: AnswerLetter) => void;
  /** Show the correction: colours, feedback and explanation. */
  revealed: boolean;
  /** Prevent changing the answer. */
  locked: boolean;
  showTopic?: boolean;
  showSession?: boolean;
  /** Link to the official PDF, for questions that need the printed chart. */
  showSourceLink?: boolean;
};

const isAnswerLetter = (value: unknown): value is AnswerLetter =>
  value === "A" || value === "B" || value === "C" || value === "D";

const formatLetters = (letters: string[]) =>
  letters.length > 1
    ? `${letters.slice(0, -1).join(", ")} y ${letters.at(-1)}`
    : letters[0];

const Feedback = ({
  question,
  selected,
}: {
  question: QuizQuestion;
  selected: AnswerLetter | undefined;
}) => {
  const outcome = getOutcome(question, selected);
  const correct = formatLetters(question.correctAnswers);
  const plural = question.correctAnswers.length > 1;

  switch (outcome) {
    case "correct":
      return <p className="font-medium text-green-700 dark:text-green-400">Correcta.</p>;
    case "incorrect":
      return (
        <p className="font-medium text-red-700 dark:text-red-400">
          Incorrecta. La respuesta correcta es{" "}
          {plural ? `${correct} (cualquiera vale)` : `la ${correct}`}.
        </p>
      );
    case "unanswered":
      return (
        <p className="font-medium text-amber-700 dark:text-amber-400">
          Sin responder. La respuesta correcta es{" "}
          {plural ? `${correct} (cualquiera vale)` : `la ${correct}`}.
        </p>
      );
    case "neutral":
      return (
        <p className="font-medium text-amber-700 dark:text-amber-400">
          {question.correctAnswers.includes("ANULADA")
            ? "Pregunta anulada por el tribunal: no cuenta para el resultado."
            : "Esta pregunta no tiene corrección oficial."}
        </p>
      );
  }
};

const QuestionCard = ({
  question,
  selected,
  onSelect,
  revealed,
  locked,
  showTopic = false,
  showSession = false,
  showSourceLink = false,
}: QuestionCardProps) => {
  const headingId = `question-${question.id}-text`;
  const meta = [
    `Pregunta ${question.number}`,
    showTopic ? question.topicName : null,
    showSession ? question.sessionLabel : null,
  ].filter(Boolean);

  return (
    <Card id={`question-${question.id}`} className="scroll-mt-24">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
          <p>{meta.join(" · ")}</p>
          <ShareQuestionButton questionId={question.id} />
        </div>
        <h2 id={headingId} className="text-base leading-snug font-medium">
          {question.text}
        </h2>
        {showSourceLink && question.sourceUrl && (
          <a
            href={question.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            <FileTextIcon className="size-3.5" />
            Ver en el examen original (PDF)
          </a>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <RadioGroup
          aria-labelledby={headingId}
          value={selected ?? null}
          readOnly={locked}
          onValueChange={(value) => {
            if (!locked && isAnswerLetter(value)) onSelect(value);
          }}
        >
          {question.options.map((option) => {
            const isSelected = selected === option.letter;
            const isCorrect = question.correctAnswers.includes(option.letter);
            const showCorrect = revealed && isCorrect;
            const showWrong = revealed && isSelected && !isCorrect;

            return (
              <label
                key={option.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-sm leading-5 transition-colors",
                  locked ? "cursor-default" : "cursor-pointer hover:bg-muted",
                  isSelected && !revealed && "border-primary bg-muted",
                  showCorrect &&
                    "border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-950/40",
                  showWrong &&
                    "border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/40",
                  revealed && !showCorrect && !showWrong && "opacity-70",
                )}
              >
                <RadioGroupItem value={option.letter} className="mt-0.5" />
                <span className="flex-1">
                  <span className="font-medium">{option.letter}.</span>{" "}
                  {option.text}
                </span>
                {showCorrect && (
                  <CheckIcon
                    aria-label="Respuesta correcta"
                    className="size-4 shrink-0 text-green-700 dark:text-green-400"
                  />
                )}
                {showWrong && (
                  <XIcon
                    aria-label="Tu respuesta, incorrecta"
                    className="size-4 shrink-0 text-red-700 dark:text-red-400"
                  />
                )}
              </label>
            );
          })}
        </RadioGroup>

        <div aria-live="polite" className="space-y-2 text-sm">
          {revealed && (
            <>
              <Feedback question={question} selected={selected} />
              {question.explanation && (
                <p className="rounded-lg bg-muted p-3 whitespace-pre-line text-muted-foreground">
                  {question.explanation}
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
