import { Suspense } from "react";
import { LinkIcon } from "lucide-react";
import { getPayload } from "payload";
import config from "@payload-config";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import QuestionItem from "@/components/question-item";
import ShareQuestionButton from "@/components/share-question-button";
import QuestionsLoader from "@/components/questions-loader";
import Report from "@/components/report";
import type { NextPage } from "next";
import type { Question } from "@/types/payload-types";

type PageProps = {
  params: Promise<{ year: string; month: string; test: string }>;
};

const payload = await getPayload({ config });

const getTopicName = (topic: Question["topic"]) =>
  typeof topic === "object" && topic !== null ? topic.name : "Tema";

const monthToNumber: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

const OfficialExamQuestions = async ({
  selectedYear,
  selectedMonth,
  selectedTest,
}: {
  selectedYear: number;
  selectedMonth: string;
  selectedTest: number;
}) => {
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
    <>
      <Report totalQuestions={questionsData.docs.length} />
      <div className="space-y-10">
        {questionsData.docs.map((question) => (
          <div key={`question-${question.id}`} className="space-y-2">
            <div className="px-4 text-sm text-muted-foreground flex justify-between items-center">
              <div>{getTopicName(question.topic)}</div>
              <div>
                <ShareQuestionButton questionId={question.id} />
              </div>
            </div>
            <QuestionItem data={question} />
          </div>
        ))}
      </div>
    </>
  );
};

const OficialExamPage: NextPage<PageProps> = async ({ params }) => {
  const { year, month, test } = await params;
  const selectedYear = Number(decodeURIComponent(year));
  const selectedMonth = decodeURIComponent(month);
  const selectedTest = Number(decodeURIComponent(test));
  const monthNumber = monthToNumber[selectedMonth] ?? selectedMonth;
  const formattedTest = String(selectedTest).padStart(2, "0");
  const originalExamHref = `/examenes-oficiales/${selectedYear}_${monthNumber}_test_${formattedTest}.pdf`;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <BackButton />
      <h1 className="text-3xl font-semibold">{`Examen Oficial ${selectedYear} ${selectedMonth} - Test ${selectedTest}`}</h1>
      <div className="text-sm">
        <Link href={originalExamHref} target="_blank" rel="noopener noreferrer">
          <LinkIcon className="h-4 w-4 inline-block mr-2" />
          Ver examen original (PDF)
        </Link>
      </div>
      <Suspense fallback={<QuestionsLoader />}>
        <OfficialExamQuestions
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedTest={selectedTest}
        />
      </Suspense>
    </main>
  );
};

export default OficialExamPage;
