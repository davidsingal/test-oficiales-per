import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-vercel-postgres";
import Breadcrumbs from "@/components/breadcrumbs";
import QuestionsLoader from "@/components/questions-loader";
import QuizSession from "@/components/quiz/quiz-session";
import { needsChart, toQuizQuestion } from "@/lib/quiz";
import { pageMetadata } from "@/lib/seo";
import type { Metadata, NextPage } from "next";
import type { Question } from "@/types/payload-types";

export const dynamic = "force-dynamic";

const QUESTIONS_PER_TEST = 10;

type PageProps = {
  params: Promise<{ topic: string }>;
};

const payload = await getPayload({ config });

const TopicQuestions = async ({ topicName }: { topicName: string }) => {
  const randomIdsResult = await payload.db.drizzle.execute(sql`
    SELECT q."id"
    FROM "questions" q
    INNER JOIN "topics" t ON t."id" = q."topic_id"
    WHERE t."name" = ${topicName}
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
      allowSimulacro={false}
      showSession
      allowNewTest
    />
  );
};

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const topicName = decodeURIComponent((await params).topic);
  const { docs } = await payload.find({
    collection: "topics",
    where: { name: { equals: topicName } },
    limit: 1,
  });
  const topic = docs[0];
  if (!topic) return {};

  return pageMetadata({
    title: `Test PER de ${topic.name}`,
    description: `Preguntas de ${topic.name} sacadas de exámenes oficiales del PER, con la corrección oficial.`,
    path: `/test-por-tema/${encodeURIComponent(topic.name)}`,
  });
};

const TopicPage: NextPage<PageProps> = async ({ params }) => {
  const { topic: rawTopic } = await params;
  const topicName = decodeURIComponent(rawTopic);

  const topics = await payload.find({
    collection: "topics",
    where: { name: { equals: topicName } },
    limit: 1,
  });
  const topic = topics.docs[0];

  if (!topic) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs
          items={[
            { label: "Test por tema", href: "/test-por-tema" },
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
        <TopicQuestions topicName={topic.name} />
      </Suspense>
    </main>
  );
};

export default TopicPage;
