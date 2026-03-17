import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-vercel-postgres";
import { BackButton } from "@/components/back-button";
import QuestionItem from "@/components/question-item";
import type { NextPage } from "next";
import type { Question } from "@/types/payload-types";

type PageProps = {
  params: Promise<{ topic: string }>;
};

const payload = await getPayload({ config });

const TopicPage: NextPage<PageProps> = async ({ params }) => {
  const { topic: rawTopic } = await params;
  const selectedTopicName = decodeURIComponent(rawTopic);

  const randomIdsResult = await payload.db.drizzle.execute(sql`
    SELECT q."id"
    FROM "questions" q
    INNER JOIN "topics" t ON t."id" = q."topic_id"
    WHERE t."name" = ${selectedTopicName}
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
      <BackButton />
      <h1 className="text-3xl font-semibold">{selectedTopicName}</h1>
      <div className="space-y-10">
        {questionsData.map((question) => (
          <div key={`question-${question.id}`} className="space-y-2">
            <QuestionItem data={question} />
            <div className="px-4 text-xs text-muted-foreground">
              Convocatoria {question.year} {question.month} - Test 0
              {question.testNumber}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};

export default TopicPage;
