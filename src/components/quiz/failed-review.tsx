"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import QuestionsLoader from "@/components/questions-loader";
import { getFailedQuestionIds, getProgress } from "@/lib/progress-store";
import { toQuizQuestion, type QuizQuestion } from "@/lib/quiz";
import type { Question } from "@/types/payload-types";
import QuizSession from "./quiz-session";

/** How many failed questions go into one review round. */
const QUESTIONS_PER_REVIEW = 20;

const fetchQuestions = async (ids: number[]): Promise<QuizQuestion[]> => {
  if (ids.length === 0) return [];

  const params = new URLSearchParams({
    "where[id][in]": ids.join(","),
    depth: "1",
    limit: String(ids.length),
  });
  const response = await fetch(`/api/questions?${params}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const { docs } = (await response.json()) as { docs: Question[] };
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  return ids
    .map((id) => byId.get(id))
    .filter((doc): doc is Question => Boolean(doc))
    .map(toQuizQuestion);
};

/**
 * A práctica test with the questions the learner last got wrong, most recent
 * first. Each round is drawn once, so answering doesn't reshuffle it.
 */
const FailedReview = () => {
  const [round, setRound] = useState(0);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["failed-review", round],
    queryFn: () =>
      fetchQuestions(
        getFailedQuestionIds(getProgress()).slice(0, QUESTIONS_PER_REVIEW),
      ),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (isPending) return <QuestionsLoader />;

  if (isError) {
    return (
      <div className="space-y-3 rounded-xl border p-6 text-center text-sm">
        <p>No se han podido cargar las preguntas.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="underline underline-offset-4"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="space-y-2 rounded-xl border p-6 text-center text-sm">
        <p className="font-medium">No tienes fallos pendientes.</p>
        <p className="text-muted-foreground">
          Aquí aparecerán las preguntas que falles en cualquier test, hasta que
          las aciertes.{" "}
          <Link href="/test-aleatorio" className="underline underline-offset-4">
            Haz un test aleatorio
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <QuizSession
      key={round}
      questions={data}
      recommendedMode="practica"
      allowSimulacro={false}
      showTopic
      showSession
      onNewTest={() => setRound((value) => value + 1)}
    />
  );
};

export default FailedReview;
