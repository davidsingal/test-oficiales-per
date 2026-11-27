import { getPayload } from "payload";
import config from "@payload-config";
import { getExamSessions } from "@/lib/exam-sessions";
import { LICENCES } from "@/lib/licences";
import { examPath, topicPath } from "@/lib/quiz";
import { absoluteUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

// Built on request, so new exams show up without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config });
  const licences = Object.values(LICENCES);
  const [sessionsByLicence, topics, questions] = await Promise.all([
    Promise.all(licences.map((licence) => getExamSessions(licence.id))),
    payload.find({ collection: "topics", pagination: false }),
    payload.find({
      collection: "questions",
      depth: 0,
      pagination: false,
      select: { updatedAt: true },
    }),
  ]);

  const paths = [
    ...licences.flatMap(({ id, basePath }, index) => [
      basePath || "/",
      `${basePath}/examenes-oficiales`,
      `${basePath}/test-por-tema`,
      `${basePath}/test-aleatorio`,
      ...sessionsByLicence[index].flatMap(({ year, month, testNumbers }) =>
        testNumbers.map((testNumber) => examPath(id, year, month, testNumber)),
      ),
    ]),
    ...topics.docs.map((topic) => topicPath(topic.licence, topic.name)),
  ];

  return [
    ...paths.map((path) => ({ url: absoluteUrl(path) })),
    ...questions.docs.map((question) => ({
      url: absoluteUrl(`/pregunta/${question.id}`),
      lastModified: question.updatedAt,
    })),
  ];
}
