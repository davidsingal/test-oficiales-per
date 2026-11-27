/**
 * Upserts the dataset built by the Python pipeline (data/outputs/exams.json)
 * into Payload. Idempotent: questions are keyed by licence/year/month/test/
 * question number, topics by licence + name and answers by question + letter,
 * so re-running only applies changes.
 * The hand-written `explanation` field is never touched.
 *
 *   pnpm data:ingest [dry-run] [prune] [path/to/exams.json]
 *
 *   dry-run  report what would change without writing anything
 *   prune    also delete questions (and their answers) that are not in the
 *            dataset, plus duplicate answers
 *
 * Options are plain words, not --flags: `payload run` only forwards positional
 * arguments to the script and silently drops anything starting with "--".
 */
import fs from "node:fs/promises";
import path from "node:path";

import { getPayload, type Payload } from "payload";
import config from "../src/payload.config";
import type { Answer, Question } from "../src/types/payload-types";

type AnswerId = Answer["answerId"];
type Month = Question["month"];
type Licence = Question["licence"];
type CorrectAnswer = NonNullable<Question["correctAnswers"]>[number];

type DatasetQuestion = {
  questionNumber: number;
  topic: string;
  questionText: string;
  answers: { answerId: AnswerId; answerText: string }[];
  correctAnswers: CorrectAnswer[];
};

type Dataset = {
  exams: {
    licence: Licence;
    year: number;
    month: Month;
    testNumber: number;
    source: string;
    sourceUrl: string | null;
    questions: DatasetQuestion[];
  }[];
};

const CONCURRENCY = 8;

const argv = process.argv.slice(2).map((arg) => arg.replace(/^--/, ""));
const unknown = argv.filter((arg) => arg !== "dry-run" && arg !== "prune" && !arg.endsWith(".json"));
if (unknown.length > 0) {
  console.error(`Unknown arguments: ${unknown.join(" ")}. Usage: pnpm data:ingest [dry-run] [prune] [file.json]`);
  process.exit(1);
}
const args = {
  file: argv.find((arg) => arg.endsWith(".json")) ?? "data/outputs/exams.json",
  prune: argv.includes("prune"),
};
const dryRun = argv.includes("dry-run");

const stats = {
  topicsCreated: 0,
  questionsCreated: 0,
  questionsUpdated: 0,
  questionsUnchanged: 0,
  answersCreated: 0,
  answersUpdated: 0,
  questionsPruned: 0,
  answersPruned: 0,
};

const questionKey = (q: {
  licence: string;
  year: number;
  month: string;
  testNumber: number;
  questionNumber: number;
}) => `${q.licence}|${q.year}|${q.month}|${q.testNumber}|${q.questionNumber}`;

// Topic names repeat across licences ("Meteorología"), so the licence is part of the key.
const topicKey = (licence: string, name: string) => `${licence}|${name.trim().toLowerCase()}`;

const idOf = (value: number | { id: number } | null | undefined): number | undefined =>
  value == null ? undefined : typeof value === "number" ? value : value.id;

const sameList = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

async function findAll<T>(payload: Payload, collection: "topics" | "questions" | "answers"): Promise<T[]> {
  const docs: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await payload.find({ collection, page, limit: 1000, depth: 0, pagination: true });
    docs.push(...(result.docs as T[]));
    if (!result.hasNextPage) return docs;
  }
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  let done = 0;
  const tick = () => {
    done += 1;
    if (done % 100 === 0 || done === items.length) {
      process.stdout.write(`\r  ${done}/${items.length}`);
      if (done === items.length) process.stdout.write("\n");
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++];
        await worker(item);
        tick();
      }
    }),
  );
}

async function main(): Promise<void> {
  const file = path.resolve(process.cwd(), args.file);
  const dataset = JSON.parse(await fs.readFile(file, "utf8")) as Dataset;
  console.log(`Reading ${file}${dryRun ? " (dry run)" : ""}`);

  const payload = await getPayload({ config });

  // Topics
  const topicIdByKey = new Map<string, number>();
  for (const topic of await findAll<{ id: number; licence: Licence; name: string }>(payload, "topics")) {
    topicIdByKey.set(topicKey(topic.licence, topic.name), topic.id);
  }
  const topics = new Map(
    dataset.exams.flatMap((e) =>
      e.questions.map((q) => [topicKey(e.licence, q.topic), { licence: e.licence, name: q.topic }] as const),
    ),
  );
  for (const [key, data] of topics) {
    if (topicIdByKey.has(key)) continue;
    stats.topicsCreated += 1;
    const id = dryRun ? -stats.topicsCreated : (await payload.create({ collection: "topics", data })).id;
    topicIdByKey.set(key, id);
  }

  // Existing questions and answers
  const existingQuestions = new Map<string, Question>();
  const duplicateQuestions: Question[] = [];
  for (const question of await findAll<Question>(payload, "questions")) {
    const key = questionKey(question);
    if (existingQuestions.has(key)) duplicateQuestions.push(question);
    else existingQuestions.set(key, question);
  }

  const existingAnswers = new Map<string, Answer>();
  const duplicateAnswers: Answer[] = [];
  for (const answer of await findAll<Answer>(payload, "answers")) {
    const key = `${idOf(answer.question)}|${answer.answerId}`;
    if (existingAnswers.has(key)) duplicateAnswers.push(answer);
    else existingAnswers.set(key, answer);
  }

  const items = dataset.exams.flatMap((exam) =>
    exam.questions.map((q) => ({
      ...q,
      licence: exam.licence,
      year: exam.year,
      month: exam.month,
      testNumber: exam.testNumber,
      sourceUrl: exam.sourceUrl ?? null,
    })),
  );
  console.log(`Upserting ${items.length} questions from ${dataset.exams.length} exams...`);

  const seenQuestionIds = new Set<number>();

  await runPool(items, async (item) => {
    const topic = topicIdByKey.get(topicKey(item.licence, item.topic))!;
    const existing = existingQuestions.get(questionKey(item));
    const data = {
      licence: item.licence,
      year: item.year,
      month: item.month,
      testNumber: item.testNumber,
      questionNumber: item.questionNumber,
      topic,
      questionText: item.questionText,
      sourceUrl: item.sourceUrl,
      correctAnswers: item.correctAnswers,
    };

    let questionId: number;
    let questionChanged = false;
    if (!existing) {
      stats.questionsCreated += 1;
      if (dryRun) {
        stats.answersCreated += item.answers.length;
        return;
      }
      questionId = (await payload.create({ collection: "questions", data })).id;
    } else {
      questionId = existing.id;
      seenQuestionIds.add(questionId);
      questionChanged =
        idOf(existing.topic) !== topic ||
        existing.questionText !== item.questionText ||
        (existing.sourceUrl ?? null) !== item.sourceUrl ||
        !sameList([...(existing.correctAnswers ?? [])].sort(), [...item.correctAnswers].sort());
      if (questionChanged && !dryRun) {
        await payload.update({ collection: "questions", id: questionId, data });
      }
    }

    const answerIds: number[] = [];
    for (const answer of item.answers) {
      const current = existingAnswers.get(`${questionId}|${answer.answerId}`);
      if (!current) {
        stats.answersCreated += 1;
        if (dryRun) continue;
        const created = await payload.create({
          collection: "answers",
          data: { question: questionId, answerId: answer.answerId, answerText: answer.answerText },
        });
        answerIds.push(created.id);
      } else {
        answerIds.push(current.id);
        if (current.answerText !== answer.answerText) {
          stats.answersUpdated += 1;
          if (!dryRun) {
            await payload.update({ collection: "answers", id: current.id, data: { answerText: answer.answerText } });
          }
        }
      }
    }

    const linked = (existing?.answers ?? []).map((a) => idOf(a)!);
    const linksChanged = !sameList(linked, answerIds);
    if (linksChanged && !dryRun) {
      await payload.update({ collection: "questions", id: questionId, data: { answers: answerIds } });
    }

    if (existing) {
      if (questionChanged || linksChanged) stats.questionsUpdated += 1;
      else stats.questionsUnchanged += 1;
    }
  });

  // Anything left over in the database that the dataset doesn't know about.
  const staleQuestions = [
    ...[...existingQuestions.values()].filter((q) => !seenQuestionIds.has(q.id)),
    ...duplicateQuestions,
  ];
  const staleQuestionIds = new Set(staleQuestions.map((q) => q.id));
  const staleAnswers = duplicateAnswers.filter((a) => !staleQuestionIds.has(idOf(a.question)!));

  if (staleQuestions.length || staleAnswers.length) {
    console.log(
      `Found ${staleQuestions.length} questions not in the dataset (or duplicated) and ${staleAnswers.length} duplicate answers.`,
    );
    for (const q of staleQuestions.slice(0, 20)) {
      console.log(`  - question #${q.id}: ${questionKey(q)} "${q.questionText.slice(0, 60)}"`);
    }
    if (args.prune && !dryRun) {
      for (const q of staleQuestions) {
        const { docs } = await payload.delete({ collection: "answers", where: { question: { equals: q.id } } });
        stats.answersPruned += docs.length;
        await payload.delete({ collection: "questions", id: q.id });
        stats.questionsPruned += 1;
      }
      for (const a of staleAnswers) {
        await payload.delete({ collection: "answers", id: a.id });
        stats.answersPruned += 1;
      }
    } else if (!args.prune) {
      console.log("  (left untouched; re-run with `prune` to delete them)");
    }
  }

  console.log(dryRun ? "\nDry run finished (nothing written):" : "\nIngest finished:");
  for (const [name, value] of Object.entries(stats)) console.log(`  ${name.padEnd(20)} ${value}`);
}

await main().catch((error) => {
  console.error("Ingest failed:", error);
  process.exitCode = 1;
});
