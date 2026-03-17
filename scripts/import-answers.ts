import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPayload } from "payload";
import config from "../src/payload.config";

type AnswersCsvRow = {
  id: string;
  question_id: string;
  answer_id: string;
  answer: string;
};

type QuestionsCsvRow = {
  id: string;
  question: string;
  exam_year: string;
  exam_month: string;
  exam_number: string;
  question_number: string;
};

type ExistingAnswer = {
  id: number | string;
  answerText?: unknown;
};

type QuestionAnswerState = {
  questionId: number | string;
  original: Map<string, number | string>;
  current: Map<string, number | string>;
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

const ANSWER_ID_BY_INDEX: Record<number, "A" | "B" | "C" | "D"> = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
};

function parseAnswerId(raw: string): "A" | "B" | "C" | "D" | undefined {
  const normalized = normalizeText(raw).toUpperCase();
  if (
    normalized === "A" ||
    normalized === "B" ||
    normalized === "C" ||
    normalized === "D"
  ) {
    return normalized;
  }
  return undefined;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return normalizeText(value) === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function extractRelationshipId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object" && value !== null && "id" in value) {
    const idValue = (value as { id?: unknown }).id;
    return idValue === null || idValue === undefined ? undefined : String(idValue);
  }
  return String(value);
}

function toIdKey(value: number | string): string {
  return String(value);
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

function rowsToAnswers(rows: string[][]): AnswersCsvRow[] {
  if (rows.length === 0) return [];

  const [headers, ...body] = rows;
  const expected = ["id", "question_id", "answer_id", "answer"];
  const expectedWithCorrect = [
    "id",
    "question_id",
    "answer_id",
    "answer",
    "is_correct",
  ];
  const legacy = ["id", "question_id", "answer"];
  const legacyWithCorrect = ["id", "question_id", "answer", "is_correct"];
  const isExpected = expected.every((header, index) => headers[index] === header);
  const isExpectedWithCorrect = expectedWithCorrect.every(
    (header, index) => headers[index] === header,
  );
  const isLegacy = legacy.every((header, index) => headers[index] === header);
  const isLegacyWithCorrect = legacyWithCorrect.every(
    (header, index) => headers[index] === header,
  );
  if (!isExpected && !isExpectedWithCorrect && !isLegacy && !isLegacyWithCorrect) {
    throw new Error(
      `Unexpected answers CSV headers. Received: ${headers.join(", ")}. Expected: ${expected.join(", ")} OR ${expectedWithCorrect.join(", ")} OR ${legacy.join(", ")} OR ${legacyWithCorrect.join(", ")}`,
    );
  }

  if (isExpected || isExpectedWithCorrect) {
    return body.map((cells) => ({
      id: cells[0] ?? "",
      question_id: cells[1] ?? "",
      answer_id: cells[2] ?? "",
      answer: cells[3] ?? "",
    }));
  }

  return body.map((cells) => ({
    id: cells[0] ?? "",
    question_id: cells[1] ?? "",
    answer_id: "",
    answer: cells[2] ?? "",
  }));
}

function rowsToQuestions(rows: string[][]): QuestionsCsvRow[] {
  if (rows.length === 0) return [];

  const [headers, ...body] = rows;
  const expected = [
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
  const camel = [
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
  const legacy = [
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

  const isExpected = expected.every((header, index) => headers[index] === header);
  const isCamel = camel.every((header, index) => headers[index] === header);
  const isLegacy = legacy.every((header, index) => headers[index] === header);
  if (!isExpected && !isCamel && !isLegacy) {
    throw new Error(
      `Unexpected questions CSV headers. Received: ${headers.join(", ")}`,
    );
  }

  return body.map((cells) => ({
    id: cells[0] ?? "",
    question: cells[1] ?? "",
    exam_year: cells[3] ?? "",
    exam_month: cells[4] ?? "",
    exam_number: cells[5] ?? "",
    question_number: cells[6] ?? "",
  }));
}

async function main(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFile);
  const projectRoot = path.resolve(scriptsDir, "..");

  const answersCsvPath = path.resolve(
    projectRoot,
    process.argv[2] ?? "data/outputs/answers.csv",
  );
  const questionsCsvPath = path.resolve(
    projectRoot,
    process.argv[3] ?? "data/outputs/questions.csv",
  );

  console.log(`Reading answers CSV: ${answersCsvPath}`);
  console.log(`Reading questions CSV: ${questionsCsvPath}`);

  const [answersCsvContent, questionsCsvContent] = await Promise.all([
    fs.readFile(answersCsvPath, "utf8"),
    fs.readFile(questionsCsvPath, "utf8"),
  ]);

  const answersRows = rowsToAnswers(parseCSV(answersCsvContent));
  const questionsRows = rowsToQuestions(parseCSV(questionsCsvContent));

  const sourceQuestionKeyById = new Map<number, string>();
  for (const row of questionsRows) {
    const sourceQuestionId = Number(row.id);
    const year = Number(row.exam_year);
    const month = parseMonthValue(row.exam_month);
    const testNumber = Number(row.exam_number);
    const questionNumber = parseQuestionNumber(row.question_number);
    const questionText = normalizeText(row.question);

    if (
      !Number.isFinite(sourceQuestionId) ||
      !Number.isFinite(year) ||
      !month ||
      !Number.isFinite(testNumber) ||
      !questionNumber ||
      !questionText
    ) {
      continue;
    }

    const key = `${year}|${month}|${testNumber}|${questionNumber}|${questionText}`;
    sourceQuestionKeyById.set(sourceQuestionId, key);
  }

  const payload = await getPayload({ config });

  const questionIdByKey = new Map<string, number | string>();
  const questionAnswerStateById = new Map<string, QuestionAnswerState>();
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
      questionIdByKey.set(key, question.id);

      const answerIds = new Map<string, number | string>();
      const answersValue = question.answers;
      if (Array.isArray(answersValue)) {
        for (const answerRef of answersValue) {
          const extracted = extractRelationshipId(answerRef);
          if (!extracted) continue;
          const numeric = Number(extracted);
          const typedId =
            Number.isFinite(numeric) && extracted === String(numeric)
              ? numeric
              : extracted;
          answerIds.set(toIdKey(typedId), typedId);
        }
      }

      questionAnswerStateById.set(String(question.id), {
        questionId: question.id,
        original: new Map(answerIds),
        current: new Map(answerIds),
      });
    }

    if (!questions.hasNextPage) break;
    questionPage += 1;
  }

  const existingAnswersByKey = new Map<string, ExistingAnswer>();
  let answerPage = 1;
  while (true) {
    const answers = await payload.find({
      collection: "answers",
      page: answerPage,
      limit: 500,
      depth: 0,
    });

    for (const answer of answers.docs) {
      const questionValue =
        typeof answer.question === "object" && answer.question !== null
          ? (answer.question as { id?: unknown }).id
          : answer.question;
      const questionId = questionValue as number | string | undefined;
      const answerId = String(answer.answerId ?? "");
      if (!questionId || !answerId) continue;

      const key = `${questionId}|${answerId}`;
      existingAnswersByKey.set(key, {
        id: answer.id,
        answerText: answer.answerText,
      });
    }

    if (!answers.hasNextPage) break;
    answerPage += 1;
  }

  const answerOrdinalBySourceQuestionId = new Map<number, number>();

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedInvalidCount = 0;
  let skippedMissingQuestionCount = 0;
  let questionLinksUpdated = 0;

  const linkAnswerToQuestion = (
    questionId: number | string,
    answerId: number | string,
  ): void => {
    const key = String(questionId);
    const answerRefKey = toIdKey(answerId);

    let state = questionAnswerStateById.get(key);
    if (!state) {
      state = {
        questionId,
        original: new Map<string, number | string>(),
        current: new Map<string, number | string>(),
      };
      questionAnswerStateById.set(key, state);
    }

    state.current.set(answerRefKey, answerId);
  };

  for (const row of answersRows) {
    const sourceQuestionId = Number(row.question_id);
    const answerText = normalizeText(row.answer);
    if (!Number.isFinite(sourceQuestionId) || !answerText) {
      skippedInvalidCount += 1;
      continue;
    }

    let answerId = parseAnswerId(row.answer_id);

    if (!answerId) {
      const nextOrdinal =
        (answerOrdinalBySourceQuestionId.get(sourceQuestionId) ?? 0) + 1;
      answerOrdinalBySourceQuestionId.set(sourceQuestionId, nextOrdinal);
      answerId = ANSWER_ID_BY_INDEX[nextOrdinal];
    }

    if (!answerId) {
      skippedInvalidCount += 1;
      continue;
    }

    const questionKey = sourceQuestionKeyById.get(sourceQuestionId);
    if (!questionKey) {
      skippedMissingQuestionCount += 1;
      continue;
    }

    const payloadQuestionId = questionIdByKey.get(questionKey);
    if (!payloadQuestionId) {
      skippedMissingQuestionCount += 1;
      continue;
    }

    const dedupeKey = `${payloadQuestionId}|${answerId}`;
    const existingAnswer = existingAnswersByKey.get(dedupeKey);

    if (existingAnswer) {
      linkAnswerToQuestion(payloadQuestionId, existingAnswer.id);

      if (isEmptyValue(existingAnswer.answerText)) {
        await payload.update({
          collection: "answers",
          id: existingAnswer.id,
          data: {
            answerText,
          },
        });
        existingAnswer.answerText = answerText;
        updatedCount += 1;
      } else {
        unchangedCount += 1;
      }
      continue;
    }

    const created = await payload.create({
      collection: "answers",
      data: {
        question: payloadQuestionId,
        answerId,
        answerText,
      },
    });

    existingAnswersByKey.set(dedupeKey, {
      id: created.id,
      answerText,
    });
    linkAnswerToQuestion(payloadQuestionId, created.id);
    createdCount += 1;
  }

  for (const state of questionAnswerStateById.values()) {
    if (state.original.size === state.current.size) {
      let same = true;
      for (const key of state.original.keys()) {
        if (!state.current.has(key)) {
          same = false;
          break;
        }
      }
      if (same) continue;
    }

    await payload.update({
      collection: "questions",
      id: state.questionId,
      data: {
        answers: Array.from(state.current.values()),
      },
    });
    questionLinksUpdated += 1;
  }

  console.log("Import finished.");
  console.log(`- Total CSV rows: ${answersRows.length}`);
  console.log(`- Created answers: ${createdCount}`);
  console.log(`- Updated existing answers: ${updatedCount}`);
  console.log(`- Existing answers unchanged: ${unchangedCount}`);
  console.log(`- Questions with answers relationship synced: ${questionLinksUpdated}`);
  console.log(`- Skipped invalid rows: ${skippedInvalidCount}`);
  console.log(`- Skipped rows with missing question mapping: ${skippedMissingQuestionCount}`);
}

await main().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
