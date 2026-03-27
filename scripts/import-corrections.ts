import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPayload } from "payload";
import config from "../src/payload.config";

type CorrectionsCsvRow = {
  question_number: string;
  answer_id: string;
  exam_year: string;
  exam_month: string;
  exam_number: string;
};

type ExistingQuestion = {
  id: number | string;
  year: number;
  month: string;
  testNumber: number;
  questionNumber: number;
  correctAnswers?: unknown;
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

const MONTH_TEXT_TO_NUMBER: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const ANSWER_ORDER: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
const ALLOWED_ANSWER_IDS = new Set(["A", "B", "C", "D", "ANULADA"]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseMonthValue(raw: string): string | undefined {
  const value = normalizeText(raw).toLowerCase();
  if (!value) return undefined;

  const numeric = /^\d+$/.test(value)
    ? Number(value)
    : MONTH_TEXT_TO_NUMBER[value];

  if (!numeric || numeric < 1 || numeric > 12) {
    return undefined;
  }

  return MONTH_BY_NUMBER[numeric];
}

function parseQuestionNumber(raw: string): number | undefined {
  const value = normalizeText(raw);
  if (!/^\d+$/.test(value)) return undefined;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 45) {
    return undefined;
  }
  return numeric;
}

function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      const nextChar = input[i + 1];
      if (insideQuotes && nextChar === '"') {
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
      if (char === "\r" && input[i + 1] === "\n") {
        i += 1;
      }

      currentRow.push(currentCell);
      currentCell = "";
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function rowsToCorrections(rows: string[][]): CorrectionsCsvRow[] {
  if (rows.length === 0) return [];

  const [headers, ...body] = rows;
  const expected = [
    "question_number",
    "answer_id",
    "exam_year",
    "exam_month",
    "exam_number",
  ];

  const isExpected = expected.every((header, index) => headers[index] === header);
  if (!isExpected) {
    throw new Error(
      `Unexpected corrections CSV headers. Received: ${headers.join(", ")}. Expected: ${expected.join(", ")}`,
    );
  }

  return body.map((cells) => ({
    question_number: cells[0] ?? "",
    answer_id: cells[1] ?? "",
    exam_year: cells[2] ?? "",
    exam_month: cells[3] ?? "",
    exam_number: cells[4] ?? "",
  }));
}

function normalizeCorrectAnswers(raw: string): string[] | undefined {
  const normalized = normalizeText(raw).toUpperCase();
  if (!normalized) return undefined;

  if (normalized.startsWith("ANULADA")) {
    return ["ANULADA"];
  }

  const compact = normalized
    .replace(/\s+/g, "")
    .replace(/[,/|+.-]/g, "")
    .replace(/Y/g, "");

  if (!compact || !/^[ABCD]+$/.test(compact)) {
    return undefined;
  }

  const included = new Set(compact.split(""));
  return ANSWER_ORDER.filter((answerId) => included.has(answerId));
}

function normalizeStoredCorrectAnswers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const values = raw
    .map((item) => normalizeText(String(item ?? "")).toUpperCase())
    .filter((item) => ALLOWED_ANSWER_IDS.has(item));

  if (values.includes("ANULADA")) return ["ANULADA"];

  const set = new Set(values);
  return ANSWER_ORDER.filter((answerId) => set.has(answerId));
}

function makeQuestionKey(
  year: number,
  month: string,
  testNumber: number,
  questionNumber: number,
): string {
  return `${year}|${month}|${testNumber}|${questionNumber}`;
}

async function main(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFile);
  const projectRoot = path.resolve(scriptsDir, "..");

  const correctionsCsvPath = path.resolve(
    projectRoot,
    process.argv[2] ?? "data/outputs/corrections.csv",
  );
  const modeArg = normalizeText(process.argv[3] ?? "replace").toLowerCase();
  const mode: "replace" | "append" = modeArg === "append" ? "append" : "replace";

  console.log(`Reading corrections CSV: ${correctionsCsvPath}`);
  console.log(`Import mode: ${mode}`);

  const csvContent = await fs.readFile(correctionsCsvPath, "utf8");
  const csvRows = rowsToCorrections(parseCSV(csvContent));

  const desiredAnswersByQuestionKey = new Map<string, Set<string>>();

  let skippedInvalidRows = 0;
  for (const row of csvRows) {
    const questionNumber = parseQuestionNumber(row.question_number);
    const year = Number(row.exam_year);
    const month = parseMonthValue(row.exam_month);
    const testNumber = Number(row.exam_number);
    const answerIds = normalizeCorrectAnswers(row.answer_id);

    if (
      !questionNumber ||
      !Number.isFinite(year) ||
      !month ||
      !Number.isFinite(testNumber) ||
      !answerIds ||
      answerIds.length === 0
    ) {
      skippedInvalidRows += 1;
      continue;
    }

    const key = makeQuestionKey(year, month, testNumber, questionNumber);
    const current = desiredAnswersByQuestionKey.get(key) ?? new Set<string>();

    if (current.has("ANULADA")) {
      desiredAnswersByQuestionKey.set(key, current);
      continue;
    }

    if (answerIds.includes("ANULADA")) {
      desiredAnswersByQuestionKey.set(key, new Set(["ANULADA"]));
      continue;
    }

    for (const answerId of answerIds) {
      current.add(answerId);
    }
    desiredAnswersByQuestionKey.set(key, current);
  }

  const payload = await getPayload({ config });

  const existingQuestionsByKey = new Map<string, ExistingQuestion>();
  const duplicatedQuestionKeys = new Set<string>();

  let page = 1;
  while (true) {
    const questions = await payload.find({
      collection: "questions",
      page,
      limit: 500,
      depth: 0,
    });

    for (const question of questions.docs) {
      const key = makeQuestionKey(
        Number(question.year),
        String(question.month),
        Number(question.testNumber),
        Number(question.questionNumber),
      );

      if (existingQuestionsByKey.has(key)) {
        duplicatedQuestionKeys.add(key);
      } else {
        existingQuestionsByKey.set(key, {
          id: question.id,
          year: Number(question.year),
          month: String(question.month),
          testNumber: Number(question.testNumber),
          questionNumber: Number(question.questionNumber),
          correctAnswers: question.correctAnswers,
        });
      }
    }

    if (!questions.hasNextPage) break;
    page += 1;
  }

  let replacedCount = 0;
  let unchangedCount = 0;
  let clearedCount = 0;
  let missingQuestionCount = 0;
  let skippedDuplicateQuestionCount = 0;

  for (const [questionKey, question] of existingQuestionsByKey.entries()) {
    if (duplicatedQuestionKeys.has(questionKey)) {
      skippedDuplicateQuestionCount += 1;
      continue;
    }

    const answerIdsSet = desiredAnswersByQuestionKey.get(questionKey);
    const current = normalizeStoredCorrectAnswers(question.correctAnswers);

    if (mode === "append") {
      if (!answerIdsSet || current.length > 0) {
        unchangedCount += 1;
        continue;
      }
    }

    const desired = answerIdsSet
      ? answerIdsSet.has("ANULADA")
        ? ["ANULADA"]
        : ANSWER_ORDER.filter((answerId) => answerIdsSet.has(answerId))
      : [];

    const isSame =
      desired.length === current.length &&
      desired.every((value, index) => value === current[index]);

    if (mode === "append" && isSame) {
      unchangedCount += 1;
      continue;
    }

    await payload.update({
      collection: "questions",
      id: question.id,
      data: {
        correctAnswers: desired,
      },
    });

    if (desired.length === 0) {
      clearedCount += 1;
    } else {
      replacedCount += 1;
    }
  }

  for (const questionKey of desiredAnswersByQuestionKey.keys()) {
    if (duplicatedQuestionKeys.has(questionKey)) {
      continue;
    }

    if (!existingQuestionsByKey.has(questionKey)) {
      missingQuestionCount += 1;
    }
  }

  console.log("Corrections import finished.");
  console.log(`- Total CSV rows: ${csvRows.length}`);
  console.log(`- Parsed question keys: ${desiredAnswersByQuestionKey.size}`);
  console.log(`- Replaced questions from CSV: ${replacedCount}`);
  console.log(`- Cleared questions missing in CSV: ${clearedCount}`);
  console.log(`- Questions unchanged: ${unchangedCount}`);
  console.log(`- Missing questions in DB: ${missingQuestionCount}`);
  console.log(
    `- Skipped duplicate question keys in DB: ${skippedDuplicateQuestionCount}`,
  );
  console.log(`- Skipped invalid CSV rows: ${skippedInvalidRows}`);
}

await main().catch((error) => {
  console.error("Corrections import failed:", error);
  process.exitCode = 1;
});
