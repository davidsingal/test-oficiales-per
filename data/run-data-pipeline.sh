#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

./extract-txt-from-pdf.sh origin extracted
./generate-exams-csv.sh extracted/exams outputs/questions.csv outputs/answers.csv
./generate-corrections-csv.sh extracted/answers outputs/corrections.csv

echo "Data pipeline completed."
