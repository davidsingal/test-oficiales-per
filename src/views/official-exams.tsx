import Link from "next/link";
import Breadcrumbs from "@/components/breadcrumbs";
import ExamStatus from "@/components/progress/exam-status";
import { getExamSessions, type ExamSession } from "@/lib/exam-sessions";
import type { Licence } from "@/lib/licences";
import { examKey, examPath } from "@/lib/quiz";
import { pageMetadata } from "@/lib/seo";
import { monthLabels } from "@/lib/utils";

export const officialExamsMetadata = (licence: Licence) =>
  pageMetadata({
    title: `Exámenes oficiales ${licence.shortName} de otras convocatorias`,
    description: `Todos los exámenes oficiales ${licence.of} por convocatoria, con la corrección oficial y las mismas reglas para aprobar.`,
    path: `${licence.basePath}/examenes-oficiales`,
  });

/** Every official test of a licence, grouped by year and session. */
const OfficialExams = async ({ licence }: { licence: Licence }) => {
  const sessions = await getExamSessions(licence.id);

  const sessionsByYear = sessions.reduce<Map<number, ExamSession[]>>(
    (acc, session) => {
      acc.set(session.year, [...(acc.get(session.year) ?? []), session]);
      return acc;
    },
    new Map(),
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6">
      <section className="space-y-2">
        <Breadcrumbs licence={licence} items={[{ label: "Exámenes oficiales" }]} />
        <h1 className="text-3xl font-semibold">
          Exámenes oficiales{licence.basePath && ` ${licence.of}`}
        </h1>
        <p className="text-muted-foreground">
          Los exámenes de convocatorias anteriores, tal como salieron y con la
          corrección oficial. Cada uno tiene {licence.rules.questionCount}{" "}
          preguntas, {licence.chartTopic.toLowerCase()} incluida.
        </p>
      </section>

      {[...sessionsByYear].map(([year, yearSessions]) => (
        <section key={year} aria-labelledby={`year-${year}`} className="space-y-3">
          <h2 id={`year-${year}`} className="text-lg font-semibold">
            {year}
          </h2>
          <ul className="surface divide-y">
            {yearSessions.map((session) => (
              <li
                key={session.month}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
              >
                <h3 className="font-medium sm:w-28 sm:shrink-0">
                  {monthLabels[session.month]}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {session.testNumbers.map((testNumber) => (
                    <li key={testNumber}>
                      <Link
                        href={examPath(licence.id, year, session.month, testNumber)}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        Test {testNumber}
                        <ExamStatus
                          examKey={examKey(licence.id, year, session.month, testNumber)}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
};

export default OfficialExams;
