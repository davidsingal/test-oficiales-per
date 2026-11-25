import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import SingleQuestion from "@/components/quiz/single-question";
import { toQuizQuestion } from "@/lib/quiz";
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <h1 className="sr-only">Pregunta {question.questionNumber}</h1>
      <SingleQuestion question={toQuizQuestion(question)} />
    </main>
  );
};

export default PreguntaPage;
