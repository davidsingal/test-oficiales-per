# Test oficiales PER

Practice the official exams for the Spanish recreational boating licence (Patrón de
Embarcaciones de Recreo), built from the PDFs published by the Ministerio de Transportes.

Next.js + Payload CMS on Postgres.

## Local development

Everything runs in Docker:

```bash
docker compose up --build    # app on http://localhost:3000, admin on /admin
docker compose down -v       # stop and wipe the local database
```

Schema changes go through Payload migrations (`pnpm payload migrate:create`, then `pnpm payload migrate`).

## Data pipeline

Fills the database with every PER exam since 2020, its questions, options and correct answers.

```bash
scripts/data-sync.sh --page ~/Downloads/exams-page.html   # preview the changes
scripts/data-sync.sh --page ~/Downloads/exams-page.html --apply
```

How it works:

1. **Sources:** `pipeline/sources.json` lists each exam session and the URLs of its
   official PDFs: exams, answer key, and any later "modificación de respuestas". It's
   built from a copy of the [ministry's exams page](https://www.transportes.gob.es/marina-mercante/titulaciones/titulaciones-de-recreo/examenes/examenes-para-la-obtencion-de-titulaciones-de-recreo)
   saved from the browser (the page blocks scripts). A fallback guesses new sessions on
   the CDN from known filename patterns.
2. **Extract (Python):** downloads the PDFs into a gitignored cache (`data/cache/`), keeps
   only the full PER tests from each session (every licence shares one PDF), and parses
   questions, topics and answers. It applies the rectifications the ministry draws over
   the answer keys, plus the corrections from modification letters, which are transcribed
   into `sources.json` as `overrides`. Output: `data/outputs/exams.json`.
3. **Ingest (TypeScript, Payload local API):** upserts questions and answers. Re-running
   it only writes what changed, and it never touches the hand-written explanations.

The PDFs aren't stored in the repo. Each test links to its official PDF on the
ministry's CDN, opened at the right page.

After each exam session (about 3 a year), save the exams page again and run the sync. If
a "modificación" letter appears, transcribe its PER changes into `overrides`; the sync
warns about any letter that hasn't been transcribed yet.

Details: [`pipeline/README.md`](pipeline/README.md).
