import { getPayload } from "payload";
import config from "@payload-config";
import type { sql } from "@payloadcms/db-vercel-postgres";
import type { Question } from "@/types/payload-types";

type SQL = ReturnType<typeof sql>;

/**
 * Draws question ids with `idsQuery` (an `ORDER BY RANDOM()` query returning
 * `id`), then loads them with their topic and answers, in the drawn order.
 */
export const drawQuestions = async (
  idsQuery: SQL,
): Promise<{ ids: number[]; questions: Question[] }> => {
  const payload = await getPayload({ config });
  const result = await payload.db.drizzle.execute(idsQuery);
  const ids = (result.rows as { id: number }[]).map((row) => row.id);
  if (ids.length === 0) return { ids, questions: [] };

  const { docs } = await payload.find({
    collection: "questions",
    depth: 1,
    where: { id: { in: ids } },
    pagination: false,
  });
  const byId = new Map(docs.map((question) => [question.id, question]));
  return {
    ids,
    questions: ids
      .map((id) => byId.get(id))
      .filter((question): question is Question => Boolean(question)),
  };
};
