# Data pipeline

Finds the official PER and Patrón de Yate (PY) exams published by the ministry, extracts the questions
and correct answers from the original PDFs, and loads them into the database.
Everything runs in Docker; nothing needs to be installed on the host.

```
saved exams page ─ import-page ─┐
ministry CDN ─────── discover ──┴─▶ sources.json
                               │
          extract (fetches PDFs into data/cache/, gitignored)
                               │
                  data/outputs/exams.json ─ ingest ─▶ Postgres (Payload)
```

The PDFs are not stored in the repo or served by the app. The app links to the
official CDN URL of each test (`sourceUrl`, e.g. `…pdf#page=58`).

## Usage

```bash
scripts/data-sync.sh --page ~/Downloads/page.html   # import the saved exams page, extract, ingest dry run
scripts/data-sync.sh --apply                         # (no page: discover only) and write to the database
```

Or step by step:

```bash
docker compose run --rm -T pipeline import-page - < page.html   # links from the saved exams page
docker compose run --rm pipeline discover --write   # look for new sessions on the CDN
docker compose run --rm pipeline extract            # PDFs -> data/outputs/exams.json
docker compose run --rm ingest dry-run              # preview the DB changes
docker compose run --rm ingest                      # apply them (`prune` also deletes rows not in the dataset)
```

Add `--build` after `run` when `pipeline/requirements.txt` or `package.json` change.

## Sources: `sources.json`

Lists each exam session (`YYYY-MM`) with the URLs of its documents, as labelled on
the ministry's exams page, plus the sha256 of each file. It is committed and is the
only record of where the data comes from:

- `exams`: "Enunciados exámenes convocatoria de …"
- `answers`: "Plantilla de respuestas convocatoria de …"
- `modifications`: "Modificación de respuestas a exámenes de …". Either a re-issued
  answer key, which is applied automatically after `answers`, or a letter from the
  exam board. A letter's PER and PY changes must be transcribed into the session's
  `overrides`, citing the letter as `source`:
  `{"test": 2, "question": 8, "answers": ["B", "C"], "source": "<letter URL>"}`.
  `licence` defaults to `"PER"`; PY changes add `"licence": "PY"` (see 2021-12).
  If a letter affects neither (Capitán de Yate only), mark the document
  `"reviewed": true`. Until then, `extract` warns about it.
- `hints` (on a document): for a section whose printed header is missing or unreadable,
  map a page number to the section that starts there, e.g.
  `"hints": {"1": {"licence": "PER", "test": 1}}` (see 2021-02).

### Keeping it up to date

The ministry publishes about 3 sessions a year (April, June, November). Each session's
links are added to its exams page, and a "Modificación" usually follows a few weeks later.

1. **Main way: import the page.** The page blocks automated clients, so open it in a
   browser, save it (⌘S, "Webpage, HTML only") and run
   `scripts/data-sync.sh --page ~/Downloads/<file>.html`. `import-page` reads every
   labelled link and updates `sources.json`, matching documents by filename and keeping
   already known URLs. Running it again with the same page changes nothing.
2. **Fallback: `discover`.** It runs in every sync. For each month after the latest
   known session, it tries the filename patterns the ministry has used (`PATTERNS` in
   `discover.py`, newest first) with a few paced HEAD requests. It finds new sessions
   only when the naming hasn't changed, so the page import stays the authoritative step.
3. **Blocked host:** some documents are only on `www.transportes.gob.es`, which also
   blocks automated downloads. `extract` then reports where to save the file by hand
   (`data/cache/<filename>`), and uses it from then on.
4. **Re-published files:** each `extract` compares the remote size of every cached file
   with the CDN and re-downloads files that changed. The new sha256 then shows up in the
   `sources.json` git diff.

## Extract (`dataset.py`, `download.py`, `sections.py`, `exams.py`, `corrections.py`)

- **Cache:** the originals are only needed while parsing, so they're kept in
  `data/cache/`, which is gitignored and can be deleted at any time. Missing files are
  downloaded on demand.
- **Re-published files:** the ministry sometimes re-publishes a file under the same name
  (e.g. adding rectifications). Each run compares the remote size with the cached copy
  (one HEAD per file) and re-downloads it if it changed. The new sha256 then shows up in
  the `sources.json` git diff.
- **Sections:** each session PDF contains every licence (Capitán de Yate, Patrón de Yate,
  PER, PER for PNB holders, PNB). It's split at each `EXAMEN DE … / Código de Test NN`
  header, and PER and PY tests are kept (layouts in `common.py`: PER 45 questions in
  11 topics, PY 40 in 4). A PER test must start at q1 and go past q27: the PNB-holders
  part (from q28) repeats questions of a full test, so it's skipped. Capitán de Yate and
  PNB are skipped.
- **Questions:** questions and options are parsed from the text. Topics come from the
  section headings in the PDF, with the canonical ranges in `common.py` as a cross-check.
- **Answers:** answers are read from the answer key, and any later rectification
  (annulled questions, extra valid answers) is applied. The ministry draws those as PDF
  annotations over the original answer, so each one is matched to the answer row it covers.
- **Errors:** `WARN`/`ERROR` lines are printed and `extract` exits with status 1 on errors.
  The JSON is still written so it can be inspected.

Known warnings:
- The 2021-12 PDFs are missing pages (tests 01 and 05).
- A 2020-12 section printed as PER is actually a 27-question PNB test.
- 2021-02 has a PY answer key, but its exam PDF doesn't include the PY test.

## Ingest (`scripts/ingest-exams.ts`)

Runs through `payload run` in the app image, using the Payload local API.

- **Idempotent upsert:** a question is identified by licence + year + month + test +
  question number, a topic by licence + name ("Meteorología" is in both), and an answer
  by question + letter. Re-running only writes what changed.
- It never touches `explanation`, which is written by hand.
- Rows that aren't in the dataset are reported, and deleted only with `prune`.
