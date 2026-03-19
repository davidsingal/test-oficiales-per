import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import QuestionItem from "@/components/question-item";
import type { NextPage } from "next";
import type { Question } from "@/types/payload-types";

type PageProps = {
  params: Promise<{ questionId: string }>;
};

const payload = await getPayload({ config });

const getTopicName = (topic: Question["topic"]) =>
  typeof topic === "object" && topic !== null ? topic.name : "Tema";

const PreguntaPage: NextPage<PageProps> = async ({ params }) => {
  const { questionId } = await params;
  const selectedQuestionId = Number(decodeURIComponent(questionId));

  if (!Number.isFinite(selectedQuestionId)) {
    notFound();
  }

  const questionData = await payload.find({
    collection: "questions",
    depth: 1,
    where: {
      id: {
        equals: selectedQuestionId,
      },
    },
    limit: 1,
    pagination: false,
  });

  const question = questionData.docs[0];

  if (!question) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-3xl font-semibold sr-only">
          Pregunta {question.questionNumber}
        </h1>
      </header>
      <section className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <span>{getTopicName(question.topic)}</span> · Convocatoria{" "}
          {question.year} {question.month} - Test 0{question.testNumber}
        </div>
        <QuestionItem data={question} />
      </section>
    </main>
  );
};

export default PreguntaPage;
