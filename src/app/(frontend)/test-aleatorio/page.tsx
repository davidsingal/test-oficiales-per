import { Suspense } from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-vercel-postgres";
import Breadcrumbs from "@/components/breadcrumbs";
import QuestionsLoader from "@/components/questions-loader";
import QuizSession from "@/components/quiz/quiz-session";
import { toQuizQuestion } from "@/lib/quiz";
import type { NextPage } from "next";
import type { Question } from "@/types/payload-types";

export const dynamic = "force-dynamic";

const QUESTIONS_PER_TEST = 10;

const payload = await getPayload({ config });

const RandomQuestions = async () => {
  // Carta de navegación questions need the printed chart, so they stay out of
  // random tests.
  const randomIdsResult = await payload.db.drizzle.execute(sql`
    SELECT q."id"
    FROM "questions" q
    INNER JOIN "topics" t ON t."id" = q."topic_id"
    WHERE t."name" <> 'Carta de navegación'
    ORDER BY RANDOM()
    LIMIT ${QUESTIONS_PER_TEST}
  `);

  const randomIds = (randomIdsResult.rows as { id: number }[]).map(
    (row) => row.id,
  );

  let questionsData: Question[] = [];

  if (randomIds.length > 0) {
    const questions = await payload.find({
      collection: "questions",
      depth: 1,
      where: { id: { in: randomIds } },
      pagination: false,
    });

    const byId = new Map(
      questions.docs.map((question) => [question.id, question]),
    );
    questionsData = randomIds
      .map((id) => byId.get(id))
      .filter((question): question is Question => Boolean(question));
  }

  return (
    <QuizSession
      // A new draw remounts the session, so "Otro test" starts clean.
      key={randomIds.join("-")}
      questions={questionsData.map(toQuizQuestion)}
      recommendedMode="practica"
      showTopic
      showSession
      allowNewTest
    />
  );
};

const TestAleatorioPage: NextPage = async () => {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs items={[{ label: "Test aleatorio" }]} />
        <h1 className="text-3xl font-semibold">Test aleatorio</h1>
        <p className="text-muted-foreground">
          {QUESTIONS_PER_TEST} preguntas al azar de todos los exámenes oficiales,
          para un repaso rápido. No incluye la carta de navegación.
        </p>
      </section>
      <Suspense fallback={<QuestionsLoader />}>
        <RandomQuestions />
      </Suspense>
    </main>
  );
};

export default TestAleatorioPage;
