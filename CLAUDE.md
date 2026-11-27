# CLAUDE.md

Practice site for the official Spanish boating licence exams (PER and Patrón de Yate).
Next.js + Payload CMS on Postgres, plus a Python pipeline that extracts the exams from
the ministry's PDFs. Setup and commands: `README.md`. Pipeline details:
`pipeline/README.md`.

## Specs come first

`SPECS.md` is the source of truth for what the app must do. Read the sections that
apply before changing behaviour, and follow its workflow:

- Change `SPECS.md` in the same change as the code: add or edit the requirement
  (keeping its ID), or mark it `~~removed~~` with the reason. Never reuse an ID.
- A new feature starts as a new section, from the template at the end of `SPECS.md`.
- If a request contradicts a requirement or something listed as out of scope, say so
  before implementing it.
- Done means the code matches the spec, `pnpm test` and `pnpm lint` pass, and the
  `manual` checks of the touched sections were done. Report which ones you did.

## Working here

- Everything runs in Docker (`docker compose up`). Checks:
  - `docker compose exec -T app pnpm test` / `pnpm lint` / `npx tsc --noEmit -p .`
  - `docker compose run --rm -T e2e` (Playwright, against the running app)
  - `docker compose run --rm -T --entrypoint python pipeline -m pytest`
- New behaviour gets a test named after its requirement ID (`test("EXAM-5: …")`), in
  the suite that fits: Vitest for logic, `e2e/` for pages, `pipeline/tests/` for data.
- After changing dependencies, rebuild the containers instead of installing into the
  running dev server (it can end up with two copies of Next and fail at random).
- Licences are defined once in `src/lib/licences.ts`. Pages are shared views in
  `src/views/` that take a licence; route files are thin wrappers. PER URLs and PER
  progress keys must not change (LIC-2, PROG-4).
- Schema changes only through Payload migrations: edit the collection, then
  `pnpm payload migrate:create <name>` and `pnpm payload generate:types`. Production
  applies them on deploy (OPS-2).

## Production

- `.env.local` holds the **production** `DATABASE_URL`. Never print it or any other
  secret: pass it to commands through a variable.
- Anything that writes to production (ingest, SQL) needs the user's go-ahead. Always
  run `ingest dry-run` first and show the counts, and check what a delete will remove
  before running it.
