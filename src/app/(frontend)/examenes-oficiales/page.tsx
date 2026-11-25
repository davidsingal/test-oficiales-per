import Link from "next/link";
import Breadcrumbs from "@/components/breadcrumbs";
import ExamStatus from "@/components/progress/exam-status";
import { getExamSessions, type ExamSession } from "@/lib/exam-sessions";
import { examKey } from "@/lib/quiz";
import { monthLabels } from "@/lib/utils";
import type { NextPage } from "next";

export const dynamic = "force-dynamic";

const ExamenesOficialesPage: NextPage = async () => {
  const sessions = await getExamSessions();

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
        <Breadcrumbs items={[{ label: "Exámenes oficiales" }]} />
        <h1 className="text-3xl font-semibold">Exámenes oficiales</h1>
        <p className="text-muted-foreground">
          Los exámenes de convocatorias anteriores, tal como salieron y con la
          corrección oficial. Cada uno tiene 45 preguntas, carta de navegación
          incluida.
        </p>
      </section>

      {[...sessionsByYear].map(([year, yearSessions]) => (
        <section key={year} aria-labelledby={`year-${year}`} className="space-y-3">
          <h2 id={`year-${year}`} className="text-lg font-semibold">
            {year}
          </h2>
          <ul className="divide-y rounded-xl border">
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
                        href={`/examenes-oficiales/${year}/${session.month}/${testNumber}`}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        Test {testNumber}
                        <ExamStatus examKey={examKey(year, session.month, testNumber)} />
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

export default ExamenesOficialesPage;
