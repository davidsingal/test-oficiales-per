import { Suspense } from "react";
import Link from "next/link";
import { FileTextIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import Breadcrumbs from "@/components/breadcrumbs";
import QuestionsLoader from "@/components/questions-loader";
import QuizSession from "@/components/quiz/quiz-session";
import { describeRules, type Licence } from "@/lib/licences";
import {
  examKey,
  examPath,
  formatSessionLabel,
  toQuizQuestion,
} from "@/lib/quiz";
import { pageMetadata } from "@/lib/seo";
import { monthLabels, monthOrder } from "@/lib/utils";
import type { Metadata } from "next";
import type { Question } from "@/types/payload-types";

export type OfficialExamParams = Promise<{
  year: string;
  month: string;
  test: string;
}>;

type Exam = { year: number; month: Question["month"]; testNumber: number };

const isMonth = (value: string): value is Question["month"] =>
  (monthOrder as string[]).includes(value);

const parseParams = async (params: OfficialExamParams): Promise<Exam | null> => {
  const { year, month, test } = await params;
  const selectedYear = Number(decodeURIComponent(year));
  const selectedMonth = decodeURIComponent(month);
  const selectedTest = Number(decodeURIComponent(test));
  if (
    !Number.isInteger(selectedYear) ||
    !Number.isInteger(selectedTest) ||
    !isMonth(selectedMonth)
  ) {
    return null;
  }
  return { year: selectedYear, month: selectedMonth, testNumber: selectedTest };
};

const examWhere = (licence: Licence, exam: Exam) => ({
  licence: { equals: licence.id },
  year: { equals: exam.year },
  month: { equals: exam.month },
  testNumber: { equals: exam.testNumber },
});

const OfficialExamQuestions = async ({
  licence,
  exam,
}: {
  licence: Licence;
  exam: Exam;
}) => {
  const payload = await getPayload({ config });
  const questionsData = await payload.find({
    collection: "questions",
    depth: 1,
    where: examWhere(licence, exam),
    sort: ["questionNumber"],
    pagination: false,
  });

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
        rules={licence.rules}
        timeLimitMinutes={licence.rules.durationMinutes}
        examKey={examKey(licence.id, exam.year, exam.month, exam.testNumber)}
        showTopic
      />
      {/* Rendered on the server: the quiz shows no questions until a mode is
          picked, so this is how search engines reach each question page. */}
      <details className="surface p-4">
        <summary className="cursor-pointer font-medium">
          Preguntas de este examen
        </summary>
        <ol className="mt-3 space-y-2 text-sm">
          {questions.map((question) => (
            <li key={question.id}>
              <Link href={`/pregunta/${question.id}`} className="hover:underline">
                {question.number}. {question.text}
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
};

export const officialExamMetadata = async (
  licence: Licence,
  params: OfficialExamParams,
): Promise<Metadata> => {
  const exam = await parseParams(params);
  if (!exam) return {};

  const session = `${monthLabels[exam.month].toLowerCase()} ${exam.year}`;
  return pageMetadata({
    title: `Examen ${licence.shortName} ${session}, test ${exam.testNumber}, con respuestas`,
    description: `Examen oficial ${licence.of} de ${session} (test ${exam.testNumber}): ${licence.rules.questionCount} preguntas con la corrección oficial y las reglas para aprobar.`,
    path: examPath(licence.id, exam.year, exam.month, exam.testNumber),
  });
};

/** One official test, in práctica or simulacro, with the licence's pass rules. */
const OfficialExam = async ({
  licence,
  params,
}: {
  licence: Licence;
  params: OfficialExamParams;
}) => {
  const exam = await parseParams(params);
  if (!exam) notFound();

  // Checked before the Suspense boundary below: once the question list starts
  // streaming, a missing exam could only render the 404 page with status 200.
  const payload = await getPayload({ config });
  const { totalDocs } = await payload.count({
    collection: "questions",
    where: examWhere(licence, exam),
  });
  if (totalDocs === 0) notFound();

  const sessionLabel = formatSessionLabel(exam.year, exam.month, exam.testNumber);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs
          licence={licence}
          items={[
            { label: "Exámenes oficiales", href: `${licence.basePath}/examenes-oficiales` },
            { label: sessionLabel },
          ]}
        />
        <h1 className="text-3xl font-semibold">
          Examen oficial{licence.basePath && ` ${licence.of}`} · {sessionLabel}
        </h1>
        <p className="text-muted-foreground">{describeRules(licence)}</p>
      </section>
      <Suspense fallback={<QuestionsLoader />}>
        <OfficialExamQuestions licence={licence} exam={exam} />
      </Suspense>
    </main>
  );
};

export default OfficialExam;
