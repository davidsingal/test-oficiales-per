import { getPayload } from "payload";
import config from "@payload-config";
import { BackButton } from "@/components/back-button";
import QuestionItem from "@/components/question-item";
import type { NextPage } from "next";
import type { Question } from "@/types/payload-types";

type PageProps = {
  params: Promise<{ year: string; month: string; test: string }>;
};

const payload = await getPayload({ config });

const getTopicName = (topic: Question["topic"]) =>
  typeof topic === "object" && topic !== null ? topic.name : "Tema";

const OficialExamPage: NextPage<PageProps> = async ({ params }) => {
  const { year, month, test } = await params;
  const selectedYear = Number(decodeURIComponent(year));
  const selectedMonth = decodeURIComponent(month);
  const selectedTest = Number(decodeURIComponent(test));

  const questionsData = await payload.find({
    collection: "questions",
    where: {
      year: {
        equals: selectedYear,
      },
      month: {
        equals: selectedMonth,
      },
      testNumber: {
        equals: selectedTest,
      },
    },
    sort: ["questionNumber"],
    pagination: false,
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <BackButton />
      <h1 className="text-3xl font-semibold">{`Examen Oficial ${selectedYear} ${selectedMonth} - Test ${selectedTest}`}</h1>
      <div className="space-y-10">
        {questionsData.docs.map((question) => (
          <div key={`question-${question.id}`} className="space-y-2">
            <div className="px-4 text-xs text-muted-foreground">
              <span>{getTopicName(question.topic)}</span>
            </div>
            <QuestionItem data={question} />
          </div>
        ))}
      </div>
    </main>
  );
};

export default OficialExamPage;
