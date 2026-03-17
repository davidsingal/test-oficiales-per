import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPayload } from "payload";
import config from "../src/payload.config";

type CsvRow = {
  id: string;
  question: string;
  category: string;
  exam_year: string;
  exam_month: string;
  exam_number: string;
  question_number: string;
  image: string;
  explanation: string;
};

type ExistingQuestion = {
  id: number | string;
  year: number;
  month: string;
  testNumber: number;
  questionNumber: number;
  questionText: string;
  topic?: unknown;
  explanation?: unknown;
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
  const value = normalizeText(raw).toLowerCase();
  if (!value || value === "undefined") return undefined;

  if (!/^\d+$/.test(value)) return undefined;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 45) {
    return undefined;
  }

  return numeric;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return normalizeText(value) === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function hasTopicValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "object" && value !== null && "id" in value) {
    return !isEmptyValue((value as { id?: unknown }).id);
  }
  return !isEmptyValue(value);
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

function rowsToObjects(rows: string[][]): CsvRow[] {
  if (rows.length === 0) return [];

  const [headers, ...body] = rows;
  const expectedHeaders = [
    "id",
    "question",
    "category",
    "exam_year",
    "exam_month",
    "exam_number",
    "question_number",
    "image",
    "explanation",
  ];
  const snakeOrCamelHeaders = [
    "id",
    "question",
    "category",
    "exam_year",
    "exam_month",
    "exam_number",
    "questionNumber",
    "image",
    "explanation",
  ];
  const midHeaders = [
    "id",
    "question",
    "category",
    "exam_year",
    "exam_month",
    "exam_number",
    "testIndex",
    "image",
    "explanation",
  ];
  const legacyHeaders = [
    "id",
    "question",
    "category",
    "exam_year",
    "exam_month",
    "exam_number",
    "image",
    "explanation",
  ];

  const headersAreValid = expectedHeaders.every(
    (header, index) => headers[index] === header,
  );
  const legacyHeadersAreValid = legacyHeaders.every(
    (header, index) => headers[index] === header,
  );
  const snakeOrCamelHeadersAreValid = snakeOrCamelHeaders.every(
    (header, index) => headers[index] === header,
  );
  const midHeadersAreValid = midHeaders.every(
    (header, index) => headers[index] === header,
  );

  if (
    !headersAreValid &&
    !snakeOrCamelHeadersAreValid &&
    !midHeadersAreValid &&
    !legacyHeadersAreValid
  ) {
    throw new Error(
      `Unexpected CSV headers. Received: ${headers.join(", ")}. Expected one of: ${expectedHeaders.join(", ")} OR ${snakeOrCamelHeaders.join(", ")} OR ${midHeaders.join(", ")} OR ${legacyHeaders.join(", ")}`,
    );
  }

  const activeHeaders = headersAreValid
    ? expectedHeaders
    : snakeOrCamelHeadersAreValid
      ? snakeOrCamelHeaders
    : midHeadersAreValid
      ? midHeaders
      : legacyHeaders;

  return body.map((cells) => {
    const row: Record<string, string> = {};

    for (let i = 0; i < activeHeaders.length; i += 1) {
      row[activeHeaders[i]] = cells[i] ?? "";
    }
    if ("questionNumber" in row && !("question_number" in row)) {
      row.question_number = row.questionNumber;
    }
    if ("testIndex" in row && !("question_number" in row)) {
      row.question_number = row.testIndex;
    }
    if (!("question_number" in row)) row.question_number = "";

    return row as CsvRow;
  });
}

async function main(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFile);
  const projectRoot = path.resolve(scriptsDir, "..");

  const csvPath = path.resolve(
    projectRoot,
    process.argv[2] ?? "data/outputs/questions.csv",
  );

  console.log(`Reading CSV from: ${csvPath}`);

  const csvContent = await fs.readFile(csvPath, "utf8");
  const csvRows = rowsToObjects(parseCSV(csvContent));

  const payload = await getPayload({ config });
  let createdCount = 0;
  let updatedExistingCount = 0;
  let unchangedExistingCount = 0;
  let skippedInvalidCount = 0;
  let createdTopicsCount = 0;

  const topicByName = new Map<string, number | string>();
  let topicPage = 1;

  while (true) {
    const topics = await payload.find({
      collection: "topics",
      page: topicPage,
      limit: 100,
      depth: 0,
    });

    for (const topic of topics.docs) {
      const topicName = normalizeText(String(topic.name ?? ""));
      if (!topicName) continue;
      topicByName.set(topicName.toLowerCase(), topic.id);
    }

    if (!topics.hasNextPage) break;
    topicPage += 1;
  }

  const getOrCreateTopicId = async (rawCategory: string): Promise<number | string> => {
    const topicLookupKey = rawCategory.toLowerCase();
    let topicId = topicByName.get(topicLookupKey);

    if (!topicId) {
      const createdTopic = await payload.create({
        collection: "topics",
        data: {
          name: rawCategory,
        },
      });

      topicId = createdTopic.id;
      topicByName.set(topicLookupKey, topicId);
      createdTopicsCount += 1;
    }

    return topicId;
  };

  const existingQuestionByKey = new Map<string, ExistingQuestion>();
  let questionPage = 1;

  while (true) {
    const questions = await payload.find({
      collection: "questions",
      page: questionPage,
      limit: 500,
      depth: 0,
    });

    for (const question of questions.docs) {
      const key = `${question.year}|${question.month}|${question.testNumber}|${question.questionNumber}|${normalizeText(String(question.questionText ?? ""))}`;
      existingQuestionByKey.set(key, {
        id: question.id,
        year: Number(question.year),
        month: String(question.month),
        testNumber: Number(question.testNumber),
        questionNumber: Number(question.questionNumber),
        questionText: normalizeText(String(question.questionText ?? "")),
        topic: question.topic,
        explanation: question.explanation,
      });
    }

    if (!questions.hasNextPage) break;
    questionPage += 1;
  }

  for (const row of csvRows) {
    const questionText = normalizeText(row.question ?? "");
    const category = normalizeText(row.category ?? "");
    const year = Number(row.exam_year);
    const month = parseMonthValue(row.exam_month ?? "");
    const testNumber = Number(row.exam_number);
    const questionNumber = parseQuestionNumber(row.question_number ?? "");

    if (
      !questionText ||
      !category ||
      !Number.isFinite(year) ||
      !Number.isFinite(testNumber) ||
      !month ||
      !questionNumber
    ) {
      skippedInvalidCount += 1;
      continue;
    }

    const dedupeKey = `${year}|${month}|${testNumber}|${questionNumber}|${questionText}`;

    const explanation = normalizeText(row.explanation ?? "");
    const existingQuestion = existingQuestionByKey.get(dedupeKey);

    if (existingQuestion) {
      const updateData: Record<string, unknown> = {};

      if (!hasTopicValue(existingQuestion.topic)) {
        updateData.topic = await getOrCreateTopicId(category);
      }

      if (isEmptyValue(existingQuestion.explanation) && explanation) {
        updateData.explanation = explanation;
      }

      if (Object.keys(updateData).length > 0) {
        await payload.update({
          collection: "questions",
          id: existingQuestion.id,
          data: updateData,
        });
        if ("topic" in updateData) existingQuestion.topic = updateData.topic;
        if ("explanation" in updateData) {
          existingQuestion.explanation = updateData.explanation;
        }
        updatedExistingCount += 1;
      } else {
        unchangedExistingCount += 1;
      }

      continue;
    }

    const topicId = await getOrCreateTopicId(category);

    const createdQuestion = await payload.create({
      collection: "questions",
      data: {
        year,
        month,
        testNumber,
        questionNumber,
        topic: topicId,
        questionText,
        explanation: explanation || undefined,
      },
    });

    existingQuestionByKey.set(dedupeKey, {
      id: createdQuestion.id,
      year,
      month,
      testNumber,
      questionNumber,
      questionText,
      topic: topicId,
      explanation: explanation || null,
    });
    createdCount += 1;
  }

  console.log("Import finished.");
  console.log(`- Total CSV rows: ${csvRows.length}`);
  console.log(`- Created questions: ${createdCount}`);
  console.log(`- Updated existing questions: ${updatedExistingCount}`);
  console.log(`- Existing questions unchanged: ${unchangedExistingCount}`);
  console.log(`- Skipped invalid rows: ${skippedInvalidCount}`);
  console.log(`- Created topics: ${createdTopicsCount}`);
}

await main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
