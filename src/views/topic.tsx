import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-vercel-postgres";
import Breadcrumbs from "@/components/breadcrumbs";
import QuestionsLoader from "@/components/questions-loader";
import QuizSession from "@/components/quiz/quiz-session";
import type { Licence } from "@/lib/licences";
import { needsChart, toQuizQuestion, topicPath } from "@/lib/quiz";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { drawQuestions } from "./random-questions";

const QUESTIONS_PER_TEST = 10;

export type TopicParams = Promise<{ topic: string }>;

const findTopic = async (licence: Licence, params: TopicParams) => {
  const topicName = decodeURIComponent((await params).topic);
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "topics",
    where: { licence: { equals: licence.id }, name: { equals: topicName } },
    limit: 1,
  });
  return docs[0];
};

const TopicQuestions = async ({ topicId }: { topicId: number }) => {
  const { ids, questions } = await drawQuestions(sql`
    SELECT "id"
    FROM "questions"
    WHERE "topic_id" = ${topicId}
    ORDER BY RANDOM()
    LIMIT ${QUESTIONS_PER_TEST}
  `);

  return (
    <QuizSession
      // A new draw remounts the session, so "Otro test" starts clean.
      key={ids.join("-")}
      questions={questions.map(toQuizQuestion)}
      recommendedMode="practica"
      allowSimulacro={false}
      showSession
      allowNewTest
    />
  );
};

export const topicMetadata = async (
  licence: Licence,
  params: TopicParams,
): Promise<Metadata> => {
  const topic = await findTopic(licence, params);
  if (!topic) return {};

  return pageMetadata({
    title: `Test ${licence.shortName} de ${topic.name}`,
    description: `Preguntas de ${topic.name} sacadas de exámenes oficiales ${licence.of}, con la corrección oficial.`,
    path: topicPath(licence.id, topic.name),
  });
};

/** 10 random questions from one topic, in práctica. */
const Topic = async ({ licence, params }: { licence: Licence; params: TopicParams }) => {
  const topic = await findTopic(licence, params);
  if (!topic) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs
          licence={licence}
          items={[
            { label: "Test por tema", href: `${licence.basePath}/test-por-tema` },
            { label: topic.name },
          ]}
        />
        <h1 className="text-3xl font-semibold">{topic.name}</h1>
        <p className="text-muted-foreground">
          {topic.description ||
            `${QUESTIONS_PER_TEST} preguntas al azar de este tema, sacadas de exámenes oficiales.`}
          {needsChart(topic.name) &&
            " Necesitas la carta náutica impresa, como en el examen: cada pregunta enlaza al PDF original con el enunciado completo."}
        </p>
      </section>
      <Suspense fallback={<QuestionsLoader />}>
        <TopicQuestions topicId={topic.id} />
      </Suspense>
    </main>
  );
};

export default Topic;
