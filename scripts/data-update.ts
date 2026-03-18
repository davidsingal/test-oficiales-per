import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

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

async function main(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFile);
  const projectRoot = path.resolve(scriptsDir, "..");

  console.log("1) Generating CSV files from PDFs...");
  await runCommand("bash", ["data/run-data-pipeline.sh"], projectRoot);

  console.log("2) Importing only missing/new data (no replacement)...");
  await runCommand("pnpm", ["payload", "run", "scripts/create-topics.ts"], projectRoot);
  await runCommand("pnpm", ["payload", "run", "scripts/import-questions.ts"], projectRoot);
  await runCommand(
    "pnpm",
    ["payload", "run", "scripts/import-answers.ts"],
    projectRoot,
  );
  await runCommand(
    "pnpm",
    ["payload", "run", "scripts/import-corrections.ts", "data/outputs/corrections.csv", "append"],
    projectRoot,
  );

  console.log("Data update finished successfully.");
}

await main().catch((error) => {
  console.error("Data update failed:", error);
  process.exitCode = 1;
});
