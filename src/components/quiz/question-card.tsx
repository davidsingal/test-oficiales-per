"use client";

import { CheckIcon, FileTextIcon, XIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ShareQuestionButton from "@/components/share-question-button";
import { cn } from "@/lib/utils";
import {
  getOutcome,
  needsChart,
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
  /** Link to the official PDF. Always on for Carta de navegación questions. */
  showSourceLink?: boolean;
};

const isAnswerLetter = (value: unknown): value is AnswerLetter =>
  value === "A" || value === "B" || value === "C" || value === "D";

/** "La correcta era la A." / "Valían la A y la C." */
const describeCorrect = (letters: string[]) => {
  const named = letters.map((letter) => `la ${letter}`);
  if (named.length === 1) return `La correcta era ${named[0]}.`;
  return `Valían ${named.slice(0, -1).join(", ")} y ${named.at(-1)}.`;
};

const Feedback = ({
  question,
  selected,
}: {
  question: QuizQuestion;
  selected: AnswerLetter | undefined;
}) => {
  const outcome = getOutcome(question, selected);
  const correct = describeCorrect(question.correctAnswers);

  switch (outcome) {
    case "correct":
      return <p className="font-medium text-success">¡Correcto!</p>;
    case "incorrect":
      return (
        <p className="font-medium text-destructive">
          Incorrecto. {correct}
        </p>
      );
    case "unanswered":
      return (
        <p className="font-medium text-warning">
          En blanco. {correct}
        </p>
      );
    case "neutral":
      return (
        <p className="font-medium text-warning">
          {question.correctAnswers.includes("ANULADA")
            ? "Pregunta anulada: no cuenta para el resultado."
            : "Esta pregunta no tiene respuesta oficial."}
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
        <h2 id={headingId} className="text-lg leading-snug font-medium">
          {question.text}
        </h2>
        {(showSourceLink || needsChart(question.topicName)) && question.sourceUrl && (
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
                  "flex items-start gap-3 rounded-lg border p-3 text-base leading-6 transition-colors",
                  locked ? "cursor-default" : "cursor-pointer hover:bg-muted",
                  isSelected && !revealed && "border-primary bg-muted",
                  showCorrect &&
                    "border-success bg-success/10",
                  showWrong &&
                    "border-destructive bg-destructive/10",
                  revealed && !showCorrect && !showWrong && "opacity-70",
                )}
              >
                <RadioGroupItem value={option.letter} className="mt-1" />
                <span className="flex-1">
                  <span className="font-medium">{option.letter}.</span>{" "}
                  {option.text}
                </span>
                {showCorrect && (
                  <CheckIcon
                    aria-label="Respuesta correcta"
                    className="mt-1 size-4 shrink-0 text-success"
                  />
                )}
                {showWrong && (
                  <XIcon
                    aria-label="Tu respuesta, incorrecta"
                    className="mt-1 size-4 shrink-0 text-destructive"
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
