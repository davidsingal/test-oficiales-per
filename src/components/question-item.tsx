"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSetAtom } from "jotai";
import type { Answer, Question } from "@/types/payload-types";
import { setQuestionOutcomeAtom } from "@/store/test-progress";

const isAnswer = (answer: number | Answer): answer is Answer =>
  typeof answer === "object" && answer !== null;

const isAnswerId = (value: string): value is Answer["answerId"] =>
  value === "A" || value === "B" || value === "C" || value === "D";

const QuestionItem: FC<{ data: Question }> = ({ data }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<
    Answer["answerId"] | null
  >(null);

  const pathname = usePathname();
  const setQuestionOutcome = useSetAtom(setQuestionOutcomeAtom);

  const feedback = useMemo(() => {
    if (!selectedAnswer) return null;

    const correctAnswers = data.correctAnswers ?? [];

    if (!correctAnswers.length) {
      return {
        text: "No hay corrección disponible para esta pregunta.",
        className: "text-amber-700",
        outcome: "neutral" as const,
      };
    }

    if (correctAnswers.includes("ANULADA")) {
      return {
        text: "Esta pregunta está ANULADA.",
        className: "text-amber-700",
        outcome: "neutral" as const,
      };
    }

    if (correctAnswers.includes(selectedAnswer)) {
      return {
        text: "Respuesta correcta.",
        className: "text-green-700",
        outcome: "correct" as const,
      };
    }

    return {
      text: "Respuesta incorrecta.",
      className: "text-red-700",
      outcome: "incorrect" as const,
    };
  }, [data.correctAnswers, selectedAnswer]);

  useEffect(() => {
    if (!feedback || !selectedAnswer) return;
    setQuestionOutcome({
      path: pathname,
      questionId: data.id,
      outcome: feedback.outcome,
    });
  }, [data.id, feedback, pathname, selectedAnswer, setQuestionOutcome]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data.questionNumber}. {data.questionText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          className="space-y-2"
          onValueChange={(value) => {
            if (isAnswerId(value)) {
              setSelectedAnswer(value);
            }
          }}
        >
          {data.answers?.filter(isAnswer).map((answer) => (
            <div className="flex items-center gap-2" key={answer.id}>
              <RadioGroupItem
                value={answer.answerId}
                id={`answer-${answer.id}`}
              />
              <Label htmlFor={`answer-${answer.id}`} className="leading-5">
                {answer.answerId}. {answer.answerText}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {feedback && (
          <p className={`mt-3 text-sm font-medium ${feedback.className}`}>
            {feedback.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionItem;
