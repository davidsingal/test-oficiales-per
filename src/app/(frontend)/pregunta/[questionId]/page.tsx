import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import Breadcrumbs from "@/components/breadcrumbs";
import SingleQuestion from "@/components/quiz/single-question";
import { buttonVariants } from "@/components/ui/button-variants";
import { LICENCES } from "@/lib/licences";
import { examPath, formatSessionLabel, toQuizQuestion, topicPath } from "@/lib/quiz";
import { pageMetadata, truncate } from "@/lib/seo";
import { monthLabels } from "@/lib/utils";
import type { Metadata, NextPage } from "next";

type PageProps = {
  params: Promise<{ questionId: string }>;
};

const payload = await getPayload({ config });

// Cached so metadata and page share one query per request.
const findQuestion = cache(async (questionId: string) => {
  const selectedQuestionId = Number(decodeURIComponent(questionId));
  if (!Number.isInteger(selectedQuestionId)) return undefined;

  const questionData = await payload.find({
    collection: "questions",
    depth: 1,
    where: { id: { equals: selectedQuestionId } },
    limit: 1,
    pagination: false,
  });

  return questionData.docs[0];
});

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const question = await findQuestion((await params).questionId);
  if (!question) return {};

  const licence = LICENCES[question.licence];
  const session = `${monthLabels[question.month].toLowerCase()} ${question.year}`;
  return pageMetadata({
    title: `${truncate(question.questionText, 60)} (${licence.shortName} ${session})`,
    description: truncate(
      `Pregunta oficial del examen ${licence.of} de ${session} (test ${question.testNumber}, n.º ${question.questionNumber}): ${question.questionText}`,
      155,
    ),
    path: `/pregunta/${question.id}`,
  });
};

const PreguntaPage: NextPage<PageProps> = async ({ params }) => {
  const question = await findQuestion((await params).questionId);

  if (!question) {
    notFound();
  }

  const { docs: examQuestions } = await payload.find({
    collection: "questions",
    depth: 0,
    where: {
      licence: { equals: question.licence },
      year: { equals: question.year },
      month: { equals: question.month },
      testNumber: { equals: question.testNumber },
    },
    sort: ["questionNumber"],
    select: { questionNumber: true },
    pagination: false,
  });
  const position = examQuestions.findIndex(({ id }) => id === question.id);
  const previous = examQuestions[position - 1];
  const next = examQuestions[position + 1];

  const sessionLabel = formatSessionLabel(
    question.year,
    question.month,
    question.testNumber,
  );
  const licence = LICENCES[question.licence];
  const examHref = examPath(licence.id, question.year, question.month, question.testNumber);
  const topicName =
    typeof question.topic === "object" && question.topic !== null
      ? question.topic.name
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs
          licence={licence}
          items={[
            { label: "Exámenes oficiales", href: `${licence.basePath}/examenes-oficiales` },
            { label: sessionLabel, href: examHref },
            { label: `Pregunta ${question.questionNumber}` },
          ]}
        />
        <h1 className="text-3xl font-semibold">
          Pregunta {question.questionNumber}
        </h1>
        <p className="text-muted-foreground">
          Del examen oficial {licence.of} de {question.month} de {question.year}, test{" "}
          {question.testNumber}.
        </p>
      </section>

      {/* Keyed so the selected answer does not carry over between questions. */}
      <SingleQuestion key={question.id} question={toQuizQuestion(question)} />

      <nav aria-label="Otras preguntas del examen" className="flex justify-between gap-3 text-sm">
        {previous && (
          <Link href={`/pregunta/${previous.id}`} className="hover:underline">
            ← Pregunta {previous.questionNumber}
          </Link>
        )}
        {next && (
          <Link href={`/pregunta/${next.id}`} className="ml-auto hover:underline">
            Pregunta {next.questionNumber} →
          </Link>
        )}
      </nav>

      <div className="flex flex-wrap gap-2">
        <Link href={examHref} className={buttonVariants({ size: "lg" })}>
          Hacer el examen completo
        </Link>
        {topicName && (
          <Link
            href={topicPath(licence.id, topicName)}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Practicar {topicName}
          </Link>
        )}
      </div>
    </main>
  );
};

export default PreguntaPage;
