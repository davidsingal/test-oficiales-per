# Specs

What the app must do, written so each item can be checked. This is the source of
truth for behaviour: the README explains how to run things, this file explains what
they must do.

## How we use this file (spec-driven, kept simple)

1. **Spec first.** Before changing behaviour, add or edit the requirement here, in the
   same PR as the code. A new feature starts as a new section (copy the template at
   the end).
2. **One requirement, one ID.** IDs (`EXAM-3`) never change meaning and are never
   reused. To drop one, mark it `~~removed~~` with the reason instead of deleting it.
3. **Every requirement says how it is verified:** a test file, or `manual` (with what
   to check). Prefer tests for rules and data (scoring, keys, parsing); `manual` is
   fine for layout and copy.
4. **Done means:** code matches the spec, its tests pass (`pnpm test`, `pnpm lint`),
   and the `manual` checks of the touched sections were done.
5. **Out of scope is written down too**, so it is a decision and not an oversight.

Statuses: ✅ done · 🚧 in progress · 💡 planned.

## Glossary

- **Licence (titulación):** PER (Patrón de Embarcaciones de Recreo) or PY (Patrón de
  Yate). Capitán de Yate and PNB are not covered.
- **Session (convocatoria):** one exam date, `year` + `month` (e.g. noviembre 2026).
- **Test:** one exam paper of a session, numbered (`Test 1`, `Test 2`, …).
- **Topic (tema):** a block of the exam (e.g. Balizamiento). Names can repeat across
  licences ("Meteorología").
- **Chart topic:** the topic answered on the printed chart: Carta de navegación (PER),
  Navegación carta (PY).
- **Annulled (anulada):** a question the exam board cancelled; it is never scored.
- **Práctica / Simulación:** quiz modes (see QUIZ).

---

## LIC · Licences ✅

| ID | Requirement | Verified by |
|---|---|---|
| LIC-1 | The app covers PER and PY. Each licence is defined once in `src/lib/licences.ts`: name, short name, URL prefix, chart topic and official rules. | `official-exam-evaluation.test.ts` |
| LIC-2 | PER pages live at the root (`/examenes-oficiales`, …). PY pages live under `/patron-de-yate/…` with the same structure. Existing PER URLs never change. | manual: old PER URLs return 200 |
| LIC-3 | Every question and topic belongs to exactly one licence (`licence` field, `per` by default). Pages only show content of their licence. | manual: PER exam has 45 questions, PY 40; topic lists don't mix |

## SCORE · Official pass rules ✅

Source: RD 875/2014, anexo II.

| ID | Requirement | Verified by |
|---|---|---|
| SCORE-1 | PER: 45 questions, 90 minutes. Pass with ≤ 13 errors in total, ≤ 5 in Reglamento (RIPA), ≤ 2 in Balizamiento, ≤ 2 in Carta de navegación. | `official-exam-evaluation.test.ts` |
| SCORE-2 | PY: 40 questions, 120 minutes. Pass with ≤ 12 errors in total (28 right), ≤ 5 in Teoría de navegación, ≤ 3 in Navegación carta. | `official-exam-evaluation.test.ts` |
| SCORE-3 | Exceeding any single limit fails the exam (NO APTO), even with few errors overall. | `official-exam-evaluation.test.ts`, `quiz.test.ts` |
| SCORE-4 | A wrong answer is an error. Once handed in, a blank answer is also an error. | `quiz.test.ts` |
| SCORE-5 | Annulled questions and questions without an answer key are never errors or hits. | `quiz.test.ts` |
| SCORE-6 | A question can have several valid answers; any of them counts as right. | `quiz.test.ts` |
| SCORE-7 | Topic limits match topic names loosely (case, accents and spaces ignored). | `official-exam-evaluation.test.ts` |
| SCORE-8 | Out of scope: passing PY by modules over several sittings. Only the one-sitting rule is applied. | — |

## QUIZ · Taking a test ✅

| ID | Requirement | Verified by |
|---|---|---|
| QUIZ-1 | Práctica: each answer is corrected as soon as it is picked and can't be changed. The test ends when every question is answered. | manual |
| QUIZ-2 | Simulación: answers can change, no correction until handed in, countdown with the licence's duration. At zero the exam is handed in automatically. | manual |
| QUIZ-3 | Official exams offer both modes (Simulación recommended). Topic, random and review tests are Práctica only. | manual |
| QUIZ-4 | In Práctica on an official exam, a sticky bar shows errors against each limit and warns "ya sería NO APTO" as soon as a limit is passed. | manual |
| QUIZ-5 | The result shows APTO / NO APTO (official exams) or hits out of scored questions (other tests), plus a table of errors per limit. | manual |
| QUIZ-6 | After the result: review only the failed ones, repeat the test, and (topic, random, review) draw another test. | manual |
| QUIZ-7 | After correction, a question shows the right answer(s) and, if it has one, the hand-written explanation. | manual |
| QUIZ-8 | Chart questions always link to the original PDF at the test's page, since they need the printed chart. | `quiz.test.ts` (`needsChart`) |

## EXAM · Official exams ✅

| ID | Requirement | Verified by |
|---|---|---|
| EXAM-1 | `…/examenes-oficiales` lists every test of the licence, by year then session, newest first, with the learner's status on each test. | manual |
| EXAM-2 | `…/examenes-oficiales/{year}/{month}/{test}` shows the whole test in order, the official rules as one sentence, and a link to the original PDF. | `official-exam-evaluation.test.ts` (`describeRules`) |
| EXAM-3 | A test that doesn't exist for that licence returns 404 (with a real 404 status). | manual: `/patron-de-yate/examenes-oficiales/2026/junio/1` → 404 |
| EXAM-4 | The page also lists every question as a link to its own page, rendered on the server (for search engines). | manual |

## TOPIC · Test por tema ✅

| ID | Requirement | Verified by |
|---|---|---|
| TOPIC-1 | `…/test-por-tema` lists the licence's topics with their question count and the learner's hits for that licence and topic. | manual |
| TOPIC-2 | `…/test-por-tema/{topic}` draws 10 random questions of that topic and licence. A topic of the other licence returns 404. | manual |
| TOPIC-3 | The chart topic says the printed chart is needed. | manual |

## RAND · Test aleatorio ✅

| ID | Requirement | Verified by |
|---|---|---|
| RAND-1 | `…/test-aleatorio` draws 10 random questions of the licence, excluding its chart topic. | manual |

## Q · Question page ✅

| ID | Requirement | Verified by |
|---|---|---|
| Q-1 | `/pregunta/{id}` shows one question to answer, for either licence, with links to the previous and next question of the same test, the full test, and its topic. | manual |
| Q-2 | Breadcrumbs, title and links use the question's licence. | manual |

## PROG · Progress (browser only) ✅

| ID | Requirement | Verified by |
|---|---|---|
| PROG-1 | Progress lives only in `localStorage` (key `per-progress`, versioned). Nothing is sent to the server. | manual: DevTools › Application › Local Storage |
| PROG-2 | The latest outcome of every answered question is kept, with its licence and topic. | manual |
| PROG-3 | An unfinished official exam can be resumed (answers, mode and, in Simulación, time left). The last result of each exam is kept. | manual |
| PROG-4 | Exam keys: PER `2026/abril/1` (unchanged, so old progress still matches), PY `py/2026/abril/1`. | `quiz.test.ts` |
| PROG-5 | `/repaso` builds a test from up to 20 questions last answered wrong, most recent first, mixing licences (PY sessions are labelled `PY · …`). A question leaves the list once answered right. | `progress-store.test.ts` (order), manual |
| PROG-6 | The home page summarises progress, links to unfinished exams, and can erase everything after a confirmation. | manual |

## NAV · Navigation and home ✅

| ID | Requirement | Verified by |
|---|---|---|
| NAV-1 | The navbar shows the brand (anchor + site name; anchor only on phones), a PER / PY switch and the three sections of the licence being browsed. | manual |
| NAV-2 | The navbar fits without scrolling from 360 px wide. | manual: measure at 360 and 390 px |
| NAV-3 | Each licence has a home page: latest exam, the three ways to practise, a link to the other licence, and progress. | manual |
| NAV-4 | PY pages' breadcrumbs include the licence level: Inicio › Patrón de Yate › … | manual |

## SEO ✅

| ID | Requirement | Verified by |
|---|---|---|
| SEO-1 | Every page has a title ending in `| Test Náutico`, a description, a canonical URL and Open Graph tags. Long titles are cut at a word boundary. | `seo.test.ts` (cutting), manual |
| SEO-2 | `/sitemap.xml` lists the home, section, exam and topic pages of both licences and every question page, built on request. | manual: URL count = pages + exams + topics + questions |
| SEO-3 | `/robots.txt` allows everything except `/admin` and `/api/`. `/repaso` is `noindex`. | manual |
| SEO-4 | Breadcrumbs emit `BreadcrumbList` structured data. | manual |

## DATA · Pipeline (PDFs → dataset) ✅

| ID | Requirement | Verified by |
|---|---|---|
| DATA-1 | `pipeline/sources.json` is the only record of which official PDFs belong to each session. | manual |
| DATA-2 | Only full PER and PY tests are extracted; Capitán de Yate, PNB and the PER-for-PNB-holders part are skipped. | `extract` output |
| DATA-3 | Every extracted question has 4 options (A–D), a topic and its answer key. Topics come from the PDF headings, cross-checked with the canonical layout in `pipeline/common.py`. | `extract`: 0 errors |
| DATA-4 | Rectifications drawn on the answer keys are applied, and changes from modification letters are transcribed into `overrides` (with `licence`, default PER). An untranscribed letter is a warning. | `extract` warnings |
| DATA-5 | `extract` exits with status 1 on any error and still writes the JSON. Known warnings are listed in `pipeline/README.md`. | `extract` |
| DATA-6 | The original PDFs are never stored in the repo or served by the app; questions link to the ministry's CDN. | manual |

## ING · Ingest (dataset → database) ✅

| ID | Requirement | Verified by |
|---|---|---|
| ING-1 | Idempotent: questions keyed by licence + year + month + test + number, topics by licence + name, answers by question + letter. A second run changes nothing. | `ingest dry-run` after a run: all unchanged |
| ING-2 | Never touches the hand-written `explanation`. | code review |
| ING-3 | Rows not in the dataset are reported and only deleted with `prune`. Always `dry-run` before writing to production. | manual |

## OPS · Schema and deploys ✅

| ID | Requirement | Verified by |
|---|---|---|
| OPS-1 | Schema changes only through Payload migrations (`push: false`). | code review |
| OPS-2 | Pending migrations run on deploy (`prodMigrations`, when `NODE_ENV=production`). | manual: fresh DB in production mode applies all migrations |
| OPS-3 | Exam content is publicly readable (site and REST API); only signed-in admins can change it. | manual |

## Out of scope

- Capitán de Yate and PNB exams.
- Passing PY by modules (SCORE-8).
- Accounts or syncing progress across devices (PROG-1).
- Reproducing the nautical chart: chart questions link to the PDF (QUIZ-8).

---

## Template for a new section

```md
## KEY · Feature name 💡

Why: one or two lines on the problem it solves and for whom.

| ID | Requirement | Verified by |
|---|---|---|
| KEY-1 | One observable behaviour, testable as written. | test file, or manual: what to check |

Out of scope: what this deliberately doesn't do.
```
