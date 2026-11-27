import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { vercelPostgresAdapter } from "@payloadcms/db-vercel-postgres";
import { buildConfig } from "payload";
import { Topics } from "./collections/Topics";
import { Questions } from "./collections/Questions";
import { Answers } from "./collections/Answers";
import { migrations } from "./migrations";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  // Define and configure your collections in this array
  collections: [Topics, Questions, Answers],
  // Your Payload secret - should be a complex and secure string, unguessable
  secret: process.env.PAYLOAD_SECRET || "",
  // Whichever Database Adapter you're using should go here
  db: vercelPostgresAdapter({
    // Schema changes go through migrations only (`payload migrate:create` + `payload migrate`).
    // Dev-mode push marks the DB as "dev" and makes `payload migrate` refuse to run.
    push: false,
    // Applied when Payload starts with NODE_ENV=production (each Vercel deploy),
    // so a deploy never serves code ahead of its schema. Already-applied
    // migrations are skipped. Local dev and the pipeline still use `payload migrate`.
    prodMigrations: migrations,
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  // If you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  // This is optional - if you don't need to do these things,
  // you don't need it!
  sharp,

  typescript: {
    outputFile: path.resolve(dirname, "types", "payload-types.d.ts"),
  },
});
