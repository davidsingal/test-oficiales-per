import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { getPayload } from "payload";
import config from "../src/payload.config";

type CollectionSlug = "answers" | "questions";

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: false,
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${cmd} ${args.join(" ")}`));
    });
  });
}

async function deleteAllFromCollection(collection: CollectionSlug): Promise<number> {
  const payload = await getPayload({ config });
  let deletedCount = 0;

  while (true) {
    const docs = await payload.find({
      collection,
      depth: 0,
      page: 1,
      limit: 200,
    });

    if (docs.docs.length === 0) break;

    for (const doc of docs.docs) {
      await payload.delete({
        collection,
        id: doc.id,
      });
      deletedCount += 1;
    }
  }

  return deletedCount;
}

async function main(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFile);
  const projectRoot = path.resolve(scriptsDir, "..");

  console.log("1) Generating CSV files from PDFs...");
  await runCommand("bash", ["data/run-data-pipeline.sh"], projectRoot);

  console.log("2) Replacing questions and answers in database (topics are kept)...");
  const deletedAnswers = await deleteAllFromCollection("answers");
  const deletedQuestions = await deleteAllFromCollection("questions");
  console.log(`- Deleted answers: ${deletedAnswers}`);
  console.log(`- Deleted questions: ${deletedQuestions}`);

  console.log("3) Importing topics, questions, answers and corrections...");
  await runCommand("pnpm", ["payload", "run", "scripts/create-topics.ts"], projectRoot);
  await runCommand("pnpm", ["payload", "run", "scripts/import-questions.ts"], projectRoot);
  await runCommand(
    "pnpm",
    ["payload", "run", "scripts/import-answers.ts"],
    projectRoot,
  );
  await runCommand(
    "pnpm",
    ["payload", "run", "scripts/import-corrections.ts"],
    projectRoot,
  );

  console.log("Data pipeline finished successfully.");
}

await main().catch((error) => {
  console.error("Data pipeline failed:", error);
  process.exitCode = 1;
});
