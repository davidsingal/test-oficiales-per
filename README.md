# Test oficiales PER

Practice the official exams for the Spanish recreational boating licences, Patrón de
Embarcaciones de Recreo (PER) and Patrón de Yate (PY), built from the PDFs published by
the Ministerio de Transportes.

Next.js + Payload CMS on Postgres.

## Local development

Everything runs in Docker:

```bash
docker compose up --build    # app on http://localhost:3000, admin on /admin
docker compose down -v       # stop and wipe the local database
```

Schema changes go through Payload migrations (`pnpm payload migrate:create`, then `pnpm payload migrate`).
In production they apply themselves: `prodMigrations` in `src/payload.config.ts` runs any
pending migration when Payload starts with `NODE_ENV=production`, i.e. on each deploy.

Checks (each test names the `SPECS.md` requirement it covers):

```bash
docker compose exec app pnpm test        # unit tests (Vitest): scoring, keys, helpers
docker compose exec app pnpm lint
docker compose run --rm e2e              # end-to-end (Playwright), needs `docker compose up`
docker compose run --rm e2e e2e/quiz.spec.ts -g QUIZ-2   # one file / one requirement
docker compose run --rm --entrypoint python pipeline -m pytest   # pipeline (pytest)
```

The e2e tests run against the dev app and the local database, so ingest the data first.
They read answer keys from the REST API, so new sessions don't break them. After
changing dependencies, rebuild (`docker compose up --build`, and `docker compose build
e2e`): installing into the running dev server can leave two copies of Next in its cache
and make pages fail at random.

## SEO

Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://example.com`, no trailing slash) in the
production environment. Canonical URLs, `/sitemap.xml`, `/robots.txt` and the
breadcrumb structured data are built from it. Without it they fall back to
Vercel's production address, or `localhost`.

## The app

PER lives at the root (`/examenes-oficiales`, …) and Patrón de Yate under
`/patron-de-yate/…`, with the same three ways to practise. Each licence's format and
pass rules are in `src/lib/licences.ts`, and the pages are shared views in `src/views/`.

- **Exámenes oficiales:** a full past exam. Two modes, chosen at the start: *Práctica*
  corrects each answer as you go; *Simulación* works like the real exam (answers can
  change, correction when you hand in). The result applies the official rules of
  RD 875/2014 (`src/lib/official-exam-evaluation.ts`):
  - PER: 45 questions, 90 minutes, at most 13 errors in total, 5 in RIPA, 2 in
    Balizamiento and 2 in Carta de navegación.
  - PY: 40 questions, 120 minutes, at most 12 errors in total, 5 in Teoría de
    navegación and 3 in Navegación carta. (PY can also be passed by modules over
    several sittings; the app only applies the one-sitting criterion.)
- **Test por tema:** 10 random questions from one topic, in Práctica mode. Chart
  questions (Carta de navegación, Navegación carta) link to the original PDF, since
  they need the printed chart.
- **Test aleatorio:** 10 random questions from every topic of the licence except the
  chart one.

Progress lives only in the browser (`localStorage`, see `src/lib/progress-store.ts`):
unfinished exams can be resumed, exams keep their last result, and `/repaso` builds a
test from the questions last answered wrong. It can be cleared from the home page.

`/repaso` loads its questions through Payload's REST API, so `questions`, `answers`
and `topics` are readable without signing in. Writing still requires an admin user.

## Data pipeline

Fills the database with every PER and Patrón de Yate exam since 2020, its questions,
options and correct answers.

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
   only the full PER and Patrón de Yate tests from each session (every licence shares one PDF), and parses
   questions, topics and answers. It applies the rectifications the ministry draws over
   the answer keys, plus the corrections from modification letters, which are transcribed
   into `sources.json` as `overrides`. Output: `data/outputs/exams.json`.
3. **Ingest (TypeScript, Payload local API):** upserts questions and answers. Re-running
   it only writes what changed, and it never touches the hand-written explanations.

The PDFs aren't stored in the repo. Each test links to its official PDF on the
ministry's CDN, opened at the right page.

After each exam session (about 3 a year), save the exams page again and run the sync. If
a "modificación" letter appears, transcribe its PER and PY changes into `overrides`; the
sync warns about any letter that hasn't been transcribed yet.

Details: [`pipeline/README.md`](pipeline/README.md).
