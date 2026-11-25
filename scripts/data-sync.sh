#!/usr/bin/env bash
# Full data pipeline, everything in Docker:
#   update sources.json -> parse the original PDFs -> load into the DB.
#
#   scripts/data-sync.sh                        # discover new sessions on the CDN, ingest dry run
#   scripts/data-sync.sh --page page.html       # import the links from a saved copy of the exams page
#   scripts/data-sync.sh [--page FILE] --apply  # ... and write to the database
set -euo pipefail
cd "$(dirname "$0")/.."

page=""
apply=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --page) page="$2"; shift 2 ;;
    --apply) apply=true; shift ;;
    *) echo "Usage: $0 [--page FILE] [--apply]" >&2; exit 2 ;;
  esac
done

if [[ -n "$page" ]]; then
  docker compose run --rm -T pipeline import-page - < "$page"
fi
docker compose run --rm pipeline discover --write
docker compose run --rm pipeline extract

if $apply; then
  docker compose run --rm ingest
else
  docker compose run --rm ingest dry-run
  echo "Dry run only. Re-run with --apply to write to the database."
fi
