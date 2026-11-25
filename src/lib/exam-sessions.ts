import { getPayload } from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-vercel-postgres";
import { monthOrder } from "@/lib/utils";
import type { Question } from "@/types/payload-types";

export type ExamSession = {
  year: number;
  month: Question["month"];
  testNumbers: number[];
};

/** Every exam session (year and month) with its tests, newest first. */
export const getExamSessions = async (): Promise<ExamSession[]> => {
  const payload = await getPayload({ config });
  const result = await payload.db.drizzle.execute(sql`
    SELECT DISTINCT "year", "month", "test_number"
    FROM "questions"
  `);

  const sessions = new Map<string, ExamSession>();
  for (const row of result.rows as {
    year: number;
    month: Question["month"];
    test_number: number;
  }[]) {
    const key = `${row.year}/${row.month}`;
    const session = sessions.get(key) ?? {
      year: row.year,
      month: row.month,
      testNumbers: [],
    };
    session.testNumbers.push(row.test_number);
    sessions.set(key, session);
  }

  return [...sessions.values()]
    .map((session) => ({
      ...session,
      testNumbers: session.testNumbers.sort((a, b) => a - b),
    }))
    .sort(
      (a, b) =>
        b.year - a.year ||
        monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month),
    );
};
