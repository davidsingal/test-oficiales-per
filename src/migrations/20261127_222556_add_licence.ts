import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_topics_licence" AS ENUM('per', 'py');
  CREATE TYPE "public"."enum_questions_licence" AS ENUM('per', 'py');
  ALTER TABLE "topics" ADD COLUMN "licence" "enum_topics_licence" DEFAULT 'per' NOT NULL;
  ALTER TABLE "questions" ADD COLUMN "licence" "enum_questions_licence" DEFAULT 'per' NOT NULL;
  CREATE INDEX "topics_licence_idx" ON "topics" USING btree ("licence");
  CREATE INDEX "questions_licence_idx" ON "questions" USING btree ("licence");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "topics_licence_idx";
  DROP INDEX "questions_licence_idx";
  ALTER TABLE "topics" DROP COLUMN "licence";
  ALTER TABLE "questions" DROP COLUMN "licence";
  DROP TYPE "public"."enum_topics_licence";
  DROP TYPE "public"."enum_questions_licence";`)
}
