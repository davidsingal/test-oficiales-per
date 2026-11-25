import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import Breadcrumbs from "@/components/breadcrumbs";
import SingleQuestion from "@/components/quiz/single-question";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatSessionLabel, toQuizQuestion } from "@/lib/quiz";
import type { NextPage } from "next";

type PageProps = {
  params: Promise<{ questionId: string }>;
};

const payload = await getPayload({ config });

const PreguntaPage: NextPage<PageProps> = async ({ params }) => {
  const { questionId } = await params;
  const selectedQuestionId = Number(decodeURIComponent(questionId));

  if (!Number.isInteger(selectedQuestionId)) {
    notFound();
  }

  const questionData = await payload.find({
    collection: "questions",
    depth: 1,
    where: { id: { equals: selectedQuestionId } },
    limit: 1,
    pagination: false,
  });

  const question = questionData.docs[0];

  if (!question) {
    notFound();
  }

  const sessionLabel = formatSessionLabel(
    question.year,
    question.month,
    question.testNumber,
  );
  const examHref = `/examenes-oficiales/${question.year}/${question.month}/${question.testNumber}`;
  const topicName =
    typeof question.topic === "object" && question.topic !== null
      ? question.topic.name
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs
          items={[
            { label: "Exámenes oficiales", href: "/examenes-oficiales" },
            { label: sessionLabel, href: examHref },
            { label: `Pregunta ${question.questionNumber}` },
          ]}
        />
        <h1 className="text-3xl font-semibold">
          Pregunta {question.questionNumber}
        </h1>
        <p className="text-muted-foreground">
          Del examen oficial de {question.month} de {question.year}, test{" "}
          {question.testNumber}.
        </p>
      </section>

      <SingleQuestion question={toQuizQuestion(question)} />

      <div className="flex flex-wrap gap-2">
        <Link href={examHref} className={buttonVariants({ size: "lg" })}>
          Hacer el examen completo
        </Link>
        {topicName && (
          <Link
            href={`/test-por-tema/${encodeURIComponent(topicName)}`}
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
