import { getPayload } from "payload";
import config from "@payload-config";
import { getExamSessions } from "@/lib/exam-sessions";
import { examKey } from "@/lib/quiz";
import { absoluteUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

// Built on request, so new exams show up without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config });
  const [sessions, topics, questions] = await Promise.all([
    getExamSessions(),
    payload.find({ collection: "topics", pagination: false }),
    payload.find({
      collection: "questions",
      depth: 0,
      pagination: false,
      select: { updatedAt: true },
    }),
  ]);

  const paths = [
    "/",
    "/examenes-oficiales",
    "/test-por-tema",
    "/test-aleatorio",
    ...sessions.flatMap(({ year, month, testNumbers }) =>
      testNumbers.map(
        (testNumber) => `/examenes-oficiales/${examKey(year, month, testNumber)}`,
      ),
    ),
    ...topics.docs.map(
      (topic) => `/test-por-tema/${encodeURIComponent(topic.name)}`,
    ),
  ];

  return [
    ...paths.map((path) => ({ url: absoluteUrl(path) })),
    ...questions.docs.map((question) => ({
      url: absoluteUrl(`/pregunta/${question.id}`),
      lastModified: question.updatedAt,
    })),
  ];
}
