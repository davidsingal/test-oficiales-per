#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT_DIR="${1:-$SCRIPT_DIR/../public}"
OUTPUT_DIR="${2:-$SCRIPT_DIR/extracted}"

if ! command -v pdftotext >/dev/null 2>&1; then
  echo "Error: pdftotext is not installed or not in PATH." >&2
  exit 1
fi

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory '$INPUT_DIR' does not exist." >&2
  exit 1
fi

count=0

while IFS= read -r -d '' pdf_file; do
  rel_path="${pdf_file#"$INPUT_DIR"/}"
  out_file="$OUTPUT_DIR/${rel_path%.pdf}.txt"
  out_dir="$(dirname "$out_file")"

  mkdir -p "$out_dir"
  pdftotext "$pdf_file" "$out_file"
  count=$((count + 1))
done < <(find "$INPUT_DIR" -type f -name '*.pdf' -print0)

echo "Converted $count PDF file(s) from '$INPUT_DIR' into '$OUTPUT_DIR'."
