import { Suspense } from "react";
import { sql } from "@payloadcms/db-vercel-postgres";
import Breadcrumbs from "@/components/breadcrumbs";
import QuestionsLoader from "@/components/questions-loader";
import QuizSession from "@/components/quiz/quiz-session";
import type { Licence } from "@/lib/licences";
import { toQuizQuestion } from "@/lib/quiz";
import { pageMetadata } from "@/lib/seo";
import { drawQuestions } from "./random-questions";

const QUESTIONS_PER_TEST = 10;

export const randomTestMetadata = (licence: Licence) =>
  pageMetadata({
    title: `Test ${licence.shortName} aleatorio`,
    description: `Test rápido ${licence.of} con 10 preguntas al azar de exámenes oficiales y corrección al momento.`,
    path: `${licence.basePath}/test-aleatorio`,
  });

const RandomQuestions = async ({ licence }: { licence: Licence }) => {
  // Chart questions need the printed chart, so they stay out of random tests.
  const { ids, questions } = await drawQuestions(sql`
    SELECT q."id"
    FROM "questions" q
    INNER JOIN "topics" t ON t."id" = q."topic_id"
    WHERE q."licence" = ${licence.id} AND t."name" <> ${licence.chartTopic}
    ORDER BY RANDOM()
    LIMIT ${QUESTIONS_PER_TEST}
  `);

  return (
    <QuizSession
      // A new draw remounts the session, so "Otro test" starts clean.
      key={ids.join("-")}
      questions={questions.map(toQuizQuestion)}
      recommendedMode="practica"
      showTopic
      showSession
      allowNewTest
    />
  );
};

/** 10 random questions from every topic of a licence except the chart. */
const RandomTest = ({ licence }: { licence: Licence }) => (
  <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
    <section className="space-y-2">
      <Breadcrumbs licence={licence} items={[{ label: "Test aleatorio" }]} />
      <h1 className="text-3xl font-semibold">
        Test aleatorio{licence.basePath && ` · ${licence.name}`}
      </h1>
      <p className="text-muted-foreground">
        {QUESTIONS_PER_TEST} preguntas al azar de todos los exámenes oficiales,
        para un repaso rápido. No incluye las preguntas de{" "}
        {licence.chartTopic.toLowerCase()}.
      </p>
    </section>
    <Suspense fallback={<QuestionsLoader />}>
      <RandomQuestions licence={licence} />
    </Suspense>
  </main>
);

export default RandomTest;
