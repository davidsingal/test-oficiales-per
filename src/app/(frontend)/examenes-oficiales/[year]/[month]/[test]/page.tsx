import { getPayload } from "payload";
import config from "@payload-config";
import { BackButton } from "@/components/back-button";
import QuestionItem from "@/components/question-item";
import type { NextPage } from "next";

type PageProps = {
  params: Promise<{ year: string; month: string; test: string }>;
};

const payload = await getPayload({ config });

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
    pagination: false,
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <BackButton />
      <h1 className="text-3xl font-semibold">{`Examen Oficial ${selectedYear} ${selectedMonth} - Test ${selectedTest}`}</h1>
      <div className="space-y-10">
        {questionsData.docs.map((question) => (
          <QuestionItem key={`question-${question.id}`} data={question} />
        ))}
      </div>
    </main>
  );
};

export default OficialExamPage;
