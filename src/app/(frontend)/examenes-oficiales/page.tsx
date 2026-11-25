import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-vercel-postgres";
import { monthLabels, monthOrder } from "@/lib/utils";
import { BackButton } from "@/components/back-button";
import ExamStatus from "@/components/progress/exam-status";
import { examKey } from "@/lib/quiz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ClipboardIcon } from "lucide-react";
import type { Question } from "@/types/payload-types";
import type { NextPage } from "next";

const payload = await getPayload({ config });

type DistinctExamRow = {
  year: number;
  month: Question["month"];
  test_number: number;
};

const ExamenesOficialesPage: NextPage = async () => {
  let distinctExamRows: DistinctExamRow[] = [];

  try {
    // Pull only unique exam calls instead of all question rows.
    const result = await payload.db.drizzle.execute(sql`
      SELECT DISTINCT "year", "month", "test_number"
      FROM "questions"
    `);

    distinctExamRows = result.rows as DistinctExamRow[];
  } catch {
    // Fallback to Local API if SQL shape/table naming differs in some env.
    const exams = await payload.find({
      collection: "questions",
      pagination: false,
      sort: ["-year", "month", "testNumber"],
      select: {
        year: true,
        month: true,
        testNumber: true,
      },
    });

    distinctExamRows = exams.docs.map((exam) => ({
      year: exam.year,
      month: exam.month,
      test_number: exam.testNumber,
    }));
  }

  const examsByYearAndMonth = distinctExamRows.reduce<
    Record<number, Record<Question["month"], Set<number>>>
  >((acc, row) => {
    const year = row.year;
    const month = row.month;
    const examNumber = row.test_number;

    if (!acc[year]) {
      acc[year] = {} as Record<Question["month"], Set<number>>;
    }

    if (!acc[year][month]) {
      acc[year][month] = new Set<number>();
    }

    acc[year][month].add(examNumber);
    return acc;
  }, {});

  const years = Object.keys(examsByYearAndMonth)
    .map((year) => Number(year))
    .sort((a, b) => b - a);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-2">
        <BackButton />
        <h1 className="text-3xl font-semibold">Exámenes oficiales</h1>
        <p className="text-muted-foreground">
          Los exámenes de convocatorias anteriores, tal como salieron y con la
          corrección oficial. Cada uno tiene 45 preguntas, carta de navegación
          incluida.
        </p>
      </section>
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {years.map((year) => (
          <Card key={`card-${year}`}>
            <CardHeader>
              <CardTitle>{year}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthOrder
                .filter((month) => examsByYearAndMonth[year]?.[month])
                .map((month) => (
                  <Item key={`card-${year}-${month}`} variant="outline">
                    <ItemMedia variant="icon">
                      <ClipboardIcon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{monthLabels[month]}</ItemTitle>
                      <ItemDescription className="flex flex-wrap gap-x-4 gap-y-1">
                        {[...examsByYearAndMonth[year][month]]
                          .sort((a, b) => a - b)
                          .map((examNumber) => (
                            <span
                              key={`exam-${examNumber}`}
                              className="inline-flex items-center gap-1.5"
                            >
                              <Link
                                href={`/examenes-oficiales/${year}/${month}/${examNumber}`}
                                className="hover:underline"
                              >{`Test ${examNumber}`}</Link>
                              <ExamStatus examKey={examKey(year, month, examNumber)} />
                            </span>
                          ))}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
};

export default ExamenesOficialesPage;
