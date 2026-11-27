import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { getPayload } from "payload";
import { sql } from "@payloadcms/db-vercel-postgres";
import config from "@payload-config";
import Breadcrumbs from "@/components/breadcrumbs";
import TopicStats from "@/components/progress/topic-stats";
import type { Licence } from "@/lib/licences";
import { needsChart, topicPath } from "@/lib/quiz";
import { pageMetadata } from "@/lib/seo";

export const topicsMetadata = (licence: Licence) =>
  pageMetadata({
    title: `Test ${licence.shortName} por temas`,
    description: `Practica ${licence.id === "per" ? "el PER" : licence.name} tema a tema, ${licence.exampleTopics}, con preguntas de exámenes oficiales y su corrección.`,
    path: `${licence.basePath}/test-por-tema`,
  });

/** The topics of a licence, each linking to a 10-question test. */
const Topics = async ({ licence }: { licence: Licence }) => {
  const payload = await getPayload({ config });
  const topics = await payload.find({
    collection: "topics",
    where: { licence: { equals: licence.id } },
    pagination: false,
    sort: ["createdAt"],
  });

  const countsResult = await payload.db.drizzle.execute(sql`
    SELECT "topic_id", COUNT(*)::int AS "count"
    FROM "questions"
    WHERE "licence" = ${licence.id}
    GROUP BY "topic_id"
  `);
  const countByTopicId = new Map(
    (countsResult.rows as { topic_id: number; count: number }[]).map((row) => [
      row.topic_id,
      row.count,
    ]),
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs licence={licence} items={[{ label: "Test por tema" }]} />
        <h1 className="text-3xl font-semibold">
          Test por tema{licence.basePath && ` · ${licence.name}`}
        </h1>
        <p className="text-muted-foreground">
          Elige un tema y practica con 10 preguntas de exámenes oficiales. Viene
          bien para reforzar lo que más te cuesta.
        </p>
      </section>

      <ul className="grid gap-3 md:grid-cols-2">
        {topics.docs.map((topic) => (
          <li key={topic.id}>
            <Link
              href={topicPath(licence.id, topic.name)}
              className="group surface-link flex h-full items-center justify-between gap-3 p-4"
            >
              <span className="space-y-1">
                <span className="block font-medium">{topic.name}</span>
                <TopicStats
                  licence={licence.id}
                  topicName={topic.name}
                  total={countByTopicId.get(topic.id) ?? 0}
                />
                {needsChart(topic.name) && (
                  <span className="block text-xs text-muted-foreground">
                    Necesitas la carta náutica impresa, como en el examen.
                  </span>
                )}
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Topics;
