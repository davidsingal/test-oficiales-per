import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPayload } from "payload";
import config from "../src/payload.config";

type CorrectionRow = {
  question_number: number;
  answer_id: string;
  exam_year: number;
  exam_month: number;
  exam_number: number;
};

type ReportRow = {
  status: "updated" | "unchanged" | "not_found";
  exam_year: number;
  exam_month: string;
  exam_number: number;
  question_number: number;
  prev_answer: string;
  new_answer: string;
};

const MONTH_BY_NUMBER: Record<number, string> = {
  1: "enero",
  2: "febrero",
  3: "marzo",
  4: "abril",
  5: "mayo",
  6: "junio",
  7: "julio",
  8: "agosto",
  9: "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
};

function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (insideQuotes && input[i + 1] === '"') {
        currentCell += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      currentRow.push(currentCell);
      currentCell = "";
      if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
  }

  return rows;
}

function parseCorrections(rows: string[][]): CorrectionRow[] {
  if (rows.length === 0) return [];

  const [headers, ...body] = rows;
  const expected = [
    "question_number",
    "answer_id",
    "exam_year",
    "exam_month",
    "exam_number",
  ];
  const isValid = expected.every((h, i) => headers[i] === h);

  if (!isValid) {
    throw new Error(
      `Unexpected CSV headers. Received: ${headers.join(", ")}. Expected: ${expected.join(", ")}`,
    );
  }

  const result: CorrectionRow[] = [];

  for (const cells of body) {
    const questionNumber = Number(cells[0]);
    const answerIdRaw = cells[1]?.trim().toUpperCase() ?? "";
    const examYear = Number(cells[2]);
    const examMonth = Number(cells[3]);
    const examNumber = Number(cells[4]);

    if (
      !Number.isFinite(questionNumber) ||
      !answerIdRaw ||
      !Number.isFinite(examYear) ||
      !Number.isFinite(examMonth) ||
      !Number.isFinite(examNumber)
    ) {
      continue;
    }

    result.push({
      question_number: questionNumber,
      answer_id: answerIdRaw,
      exam_year: examYear,
      exam_month: examMonth,
      exam_number: examNumber,
    });
  }

  return result;
}

function formatEta(elapsedMs: number, done: number, remaining: number): string {
  if (done === 0) return "calculating...";
  const msPerItem = elapsedMs / done;
  const etaSec = Math.round((msPerItem * remaining) / 1000);
  if (etaSec < 60) return `${etaSec}s`;
  return `${Math.floor(etaSec / 60)}m ${etaSec % 60}s`;
}

function toReportLine(row: ReportRow): string {
  const cells = [
    row.status,
    row.exam_year,
    row.exam_month,
    row.exam_number,
    row.question_number,
    row.prev_answer,
    row.new_answer,
  ];
  return cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
}

async function main(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFile);
  const projectRoot = path.resolve(scriptsDir, "..");

  const correctionsCsvPath = path.resolve(
    projectRoot,
    process.argv[2] ?? "data/outputs/corrections.csv",
  );
  const reportCsvPath = path.resolve(
    projectRoot,
    process.argv[3] ?? "data/outputs/corrections-report.csv",
  );

  console.log(`Reading corrections CSV: ${correctionsCsvPath}`);
  console.log(`Writing report to:       ${reportCsvPath}\n`);

  const csvContent = await fs.readFile(correctionsCsvPath, "utf8");
  const corrections = parseCorrections(parseCSV(csvContent));

  console.log(`Parsed ${corrections.length} correction rows.\n`);

  const payload = await getPayload({ config });

  const reportLines: string[] = [
    "status,exam_year,exam_month,exam_number,question_number,prev_answer,new_answer",
  ];

  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedNotFoundCount = 0;
  const total = corrections.length;
  const startTime = Date.now();

  const printProgress = (current: number): void => {
    const elapsed = Date.now() - startTime;
    const eta = formatEta(elapsed, current, total - current);
    const pct = Math.round((current / total) * 100);
    process.stdout.write(
      `\r[${current}/${total}] ${pct}% — updated: ${updatedCount}, unchanged: ${unchangedCount}, not found: ${skippedNotFoundCount} — ETA: ${eta}   `,
    );
  };

  for (let i = 0; i < corrections.length; i += 1) {
    const row = corrections[i];
    const current = i + 1;

    printProgress(current);

    const month = MONTH_BY_NUMBER[row.exam_month];
    if (!month) {
      console.warn(`\n  [SKIP] Invalid month value: ${row.exam_month}`);
      skippedNotFoundCount += 1;
      reportLines.push(
        toReportLine({
          status: "not_found",
          exam_year: row.exam_year,
          exam_month: String(row.exam_month),
          exam_number: row.exam_number,
          question_number: row.question_number,
          prev_answer: "",
          new_answer: row.answer_id,
        }),
      );
      continue;
    }

    const result = await payload.find({
      collection: "questions",
      limit: 1,
      where: {
        and: [
          { year: { equals: row.exam_year } },
          { month: { equals: month } },
          { testNumber: { equals: row.exam_number } },
          { questionNumber: { equals: row.question_number } },
        ],
      },
    });

    const question = result.docs[0];

    if (!question) {
      skippedNotFoundCount += 1;
      reportLines.push(
        toReportLine({
          status: "not_found",
          exam_year: row.exam_year,
          exam_month: month,
          exam_number: row.exam_number,
          question_number: row.question_number,
          prev_answer: "",
          new_answer: row.answer_id,
        }),
      );
      continue;
    }
    const prevAnswers =
      (question.correctAnswers as string[] | null | undefined) ?? [];
    const nextAnswers = row.answer_id.split("").filter(Boolean); // e.g. "BD" -> ["B", "D"]

    const prevSorted = [...prevAnswers].sort().join("");
    const nextSorted = [...nextAnswers].sort().join("");
    const prevDisplay = prevSorted || "(empty)";

    if (prevSorted === nextSorted) {
      unchangedCount += 1;
      reportLines.push(
        toReportLine({
          status: "unchanged",
          exam_year: row.exam_year,
          exam_month: month,
          exam_number: row.exam_number,
          question_number: row.question_number,
          prev_answer: prevDisplay,
          new_answer: nextSorted,
        }),
      );
    } else {
      await payload.update({
        collection: "questions",
        id: question.id,
        data: { correctAnswer: nextAnswers },
      });
      updatedCount += 1;
      reportLines.push(
        toReportLine({
          status: "updated",
          exam_year: row.exam_year,
          exam_month: month,
          exam_number: row.exam_number,
          question_number: row.question_number,
          prev_answer: prevDisplay,
          new_answer: nextSorted,
        }),
      );
    }
  }

  process.stdout.write("\n");

  await fs.writeFile(reportCsvPath, reportLines.join("\n") + "\n", "utf8");

  console.log("\nImport finished.");
  console.log(`- Total CSV rows:  ${total}`);
  console.log(`- Updated:         ${updatedCount}`);
  console.log(`- Already correct: ${unchangedCount}`);
  console.log(`- Not found:       ${skippedNotFoundCount}`);
  console.log(`\nReport written to: ${reportCsvPath}`);
}

await main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
