import "dotenv/config";

import { getPayload } from "payload";
import config from "../src/payload.config";

const TOPIC_NAMES = [
  "Nomenclatura náutica",
  "Elementos de amarre y fondeo",
  "Seguridad",
  "Legislación",
  "Balizamiento",
  "Reglamento (RIPA)",
  "Maniobra y navegación",
  "Emergencias en la mar",
  "Meteorología",
  "Teoría de la navegación",
  "Carta de navegación",
] as const;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function main(): Promise<void> {
  const payload = await getPayload({ config });

  const existingByName = new Map<string, number | string>();
  let page = 1;

  while (true) {
    const topics = await payload.find({
      collection: "topics",
      page,
      limit: 200,
      depth: 0,
    });

    for (const topic of topics.docs) {
      const key = normalizeText(String(topic.name ?? ""));
      if (!key) continue;
      existingByName.set(key, topic.id);
    }

    if (!topics.hasNextPage) break;
    page += 1;
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const name of TOPIC_NAMES) {
    const key = normalizeText(name);
    if (existingByName.has(key)) {
      skippedCount += 1;
      continue;
    }

    const created = await payload.create({
      collection: "topics",
      data: {
        name,
        description: "",
      },
    });

    existingByName.set(key, created.id);
    createdCount += 1;
  }

  console.log("Topic seed finished.");
  console.log(`- Required topics: ${TOPIC_NAMES.length}`);
  console.log(`- Created topics: ${createdCount}`);
  console.log(`- Existing topics: ${skippedCount}`);
}

await main().catch((error) => {
  console.error("Topic seed failed:", error);
  process.exitCode = 1;
});
