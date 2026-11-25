import Link from "next/link";
import { getPayload } from "payload";
import { sql } from "@payloadcms/db-vercel-postgres";
import config from "@payload-config";
import { BackButton } from "@/components/back-button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import TopicStats from "@/components/progress/topic-stats";
import type { NextPage } from "next";

const payload = await getPayload({ config });

const TestPorTemaPage: NextPage = async () => {
  const topics = await payload.find({
    collection: "topics",
    pagination: false,
    sort: ["createdAt"],
  });

  const countsResult = await payload.db.drizzle.execute(sql`
    SELECT "topic_id", COUNT(*)::int AS "count"
    FROM "questions"
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
        <BackButton />
        <h1 className="text-3xl font-semibold">Test por tema</h1>
        <p className="text-muted-foreground">
          Elige un tema y practica con 10 preguntas de exámenes oficiales. Viene
          bien para reforzar lo que más te cuesta. Por ahora no incluye la carta
          de navegación.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Temas</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {topics.docs
            ?.filter((d) => d.name !== "Carta de navegación") // Excluimos este tema por ahora
            .map((d) => (
              <Card key={`card-${d.id}`}>
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/test-por-tema/${encodeURIComponent(d.name)}`}
                      passHref
                    >
                      {d.name}
                    </Link>
                  </CardTitle>
                  <TopicStats
                    topicName={d.name}
                    total={countByTopicId.get(d.id) ?? 0}
                  />
                </CardHeader>
              </Card>
            ))}
        </div>
      </section>
    </main>
  );
};

export default TestPorTemaPage;
