import { Suspense } from "react";
import { FileTextIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { BackButton } from "@/components/back-button";
import QuestionsLoader from "@/components/questions-loader";
import QuizSession from "@/components/quiz/quiz-session";
import { examKey, formatSessionLabel, toQuizQuestion } from "@/lib/quiz";
import { monthOrder } from "@/lib/utils";
import {
  OFFICIAL_EXAM_DURATION_MINUTES,
  OFFICIAL_EXAM_ERROR_LIMITS,
} from "@/lib/official-exam-evaluation";
import type { NextPage } from "next";
import type { Question } from "@/types/payload-types";

type PageProps = {
  params: Promise<{ year: string; month: string; test: string }>;
};

const payload = await getPayload({ config });

const isMonth = (value: string): value is Question["month"] =>
  (monthOrder as string[]).includes(value);

const OfficialExamQuestions = async ({
  selectedYear,
  selectedMonth,
  selectedTest,
}: {
  selectedYear: number;
  selectedMonth: Question["month"];
  selectedTest: number;
}) => {
  const questionsData = await payload.find({
    collection: "questions",
    depth: 1,
    where: {
      year: { equals: selectedYear },
      month: { equals: selectedMonth },
      testNumber: { equals: selectedTest },
    },
    sort: ["questionNumber"],
    pagination: false,
  });

  if (questionsData.docs.length === 0) notFound();

  const questions = questionsData.docs.map(toQuizQuestion);
  const sourceUrl = questions.find((question) => question.sourceUrl)?.sourceUrl;

  return (
    <>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
        >
          <FileTextIcon className="size-4" />
          Ver examen original (PDF)
        </a>
      )}
      <QuizSession
        questions={questions}
        recommendedMode="simulacro"
        official
        timeLimitMinutes={OFFICIAL_EXAM_DURATION_MINUTES}
        examKey={examKey(selectedYear, selectedMonth, selectedTest)}
        showTopic
      />
    </>
  );
};

const OficialExamPage: NextPage<PageProps> = async ({ params }) => {
  const { year, month, test } = await params;
  const selectedYear = Number(decodeURIComponent(year));
  const selectedMonth = decodeURIComponent(month);
  const selectedTest = Number(decodeURIComponent(test));

  if (
    !Number.isInteger(selectedYear) ||
    !Number.isInteger(selectedTest) ||
    !isMonth(selectedMonth)
  ) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <BackButton />
        <h1 className="text-3xl font-semibold">
          Examen oficial · {formatSessionLabel(selectedYear, selectedMonth, selectedTest)}
        </h1>
        <p className="text-muted-foreground">
          45 preguntas y {OFFICIAL_EXAM_DURATION_MINUTES} minutos. Apruebas con{" "}
          {OFFICIAL_EXAM_ERROR_LIMITS.total} fallos como máximo, sin pasar de{" "}
          {OFFICIAL_EXAM_ERROR_LIMITS.ripa} en Reglamento (RIPA),{" "}
          {OFFICIAL_EXAM_ERROR_LIMITS.balizamiento} en Balizamiento y{" "}
          {OFFICIAL_EXAM_ERROR_LIMITS.cartaDeNavegacion} en Carta de navegación.
        </p>
      </section>
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
