import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-vercel-postgres";
import { BackButton } from "@/components/back-button";
import QuestionItem from "@/components/question-item";
import type { NextPage } from "next";
import type { Question } from "@/types/payload-types";

const payload = await getPayload({ config });

const getTopicName = (topic: Question["topic"]) =>
  typeof topic === "object" && topic !== null ? topic.name : "Tema";

const TestAleatorioPage: NextPage = async () => {
  const randomIdsResult = await payload.db.drizzle.execute(sql`
    SELECT q."id"
    FROM "questions" q
    INNER JOIN "topics" t ON t."id" = q."topic_id"
    WHERE t."name" <> 'Carta de navegación'
    ORDER BY RANDOM()
    LIMIT 10
  `);

  const randomIds = (randomIdsResult.rows as { id: number }[]).map(
    (row) => row.id,
  );

  let questionsData: Question[] = [];

  if (randomIds.length > 0) {
    const questions = await payload.find({
      collection: "questions",
      depth: 1,
      where: {
        id: {
          in: randomIds,
        },
      },
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
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <BackButton />
        <h1 className="text-3xl font-semibold">Practica dinámica y variada</h1>
        <p className="text-muted-foreground">
          Genera tests combinados para entrenar reflejos y consolidar conceptos.
          Ideal como test de repaso o para practicar de forma rápida y efectiva.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>10 preguntas por ronda</li>
          <li>Corrección automática inmediata</li>
          <li>No incluye preguntas de Carta de navegación</li>
        </ul>
      </section>

      <div className="space-y-10">
        {questionsData.map((question) => (
          <div key={`question-${question.id}`} className="space-y-2">
            <div className="px-4 text-sm text-muted-foreground">
              <span>{getTopicName(question.topic)}</span> · Convocatoria{" "}
              {question.year} {question.month} - Test 0{question.testNumber}
            </div>
            <QuestionItem data={question} />
          </div>
        ))}
      </div>
    </main>
  );
};

export default TestAleatorioPage;
