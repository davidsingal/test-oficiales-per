#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT_DIR="${1:-$SCRIPT_DIR/extracted/answers}"
OUTPUT_CSV="${2:-$SCRIPT_DIR/outputs/corrections.csv}"

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory '$INPUT_DIR' does not exist." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_CSV")"

tmp_csv="$(mktemp)"
trap 'rm -f "$tmp_csv"' EXIT

echo "question_number,answer_id,exam_year,exam_month,exam_number" > "$tmp_csv"

month_to_number() {
  local month="$1"
  case "$month" in
    enero) echo "01" ;;
    febrero) echo "02" ;;
    marzo) echo "03" ;;
    abril) echo "04" ;;
    mayo) echo "05" ;;
    junio) echo "06" ;;
    julio) echo "07" ;;
    agosto) echo "08" ;;
    septiembre|setiembre) echo "09" ;;
    octubre) echo "10" ;;
    noviembre) echo "11" ;;
    diciembre) echo "12" ;;
    *) echo "" ;;
  esac
}

while IFS= read -r file; do
  base_name="$(basename "$file" .txt)"

  if [[ "$base_name" =~ ^([^_]+)_([0-9]{4})_ ]]; then
    month_token="${BASH_REMATCH[1]}"
    exam_year="${BASH_REMATCH[2]}"
  else
    echo "WARN: skipping '$base_name.txt' (cannot extract month/year from filename)." >&2
    continue
  fi

  exam_month="$(month_to_number "${month_token,,}")"
  if [[ -z "$exam_month" ]]; then
    echo "WARN: skipping '$base_name.txt' (unknown month token '$month_token')." >&2
    continue
  fi

  awk -v file_name="$(basename "$file")" \
      -v exam_year="$exam_year" \
      -v exam_month="$exam_month" '
    function trim(s) {
      sub(/^[[:space:]]+/, "", s)
      sub(/[[:space:]]+$/, "", s)
      return s
    }
    function normalize_text(raw, s) {
      s = tolower(trim(raw))
      gsub(/[[:space:]]+/, " ", s)
      gsub(/ó/, "o", s)
      return s
    }
    function extract_test_number(raw, s) {
      s = normalize_text(raw)
      if (s !~ /codigo de test/) return ""
      sub(/^.*codigo de test[[:space:]]*/, "", s)
      sub(/[^0-9].*$/, "", s)
      return s
    }
    function normalize_answer(raw, cleaned) {
      cleaned = toupper(trim(raw))
      gsub(/[[:space:]]+/, "", cleaned)
      gsub(/[.,;:]/, "", cleaned)
      if (cleaned ~ /^[ABCD]$/) return cleaned
      if (cleaned ~ /^ANULADA/) return "ANULADA"
      if (cleaned ~ /^[ABCD]Y[ABCD]$/) return substr(cleaned, 1, 1) substr(cleaned, 3, 1)
      return ""
    }
    function flush_exam(   i) {
      if (exam_number == "") return
      if (count_answers != 45) {
        print "WARN: " file_name " test " exam_number " has " count_answers " parsed answers (expected 45)." > "/dev/stderr"
      }
    }
    function start_exam(raw_number) {
      flush_exam()
      exam_number = sprintf("%02d", raw_number + 0)
      delete seen
      next_question = 1
      count_answers = 0
    }
    function push_answer(question_number, answer_id) {
      if (question_number < 1 || question_number > 45) return
      if (seen[question_number]) return
      seen[question_number] = 1
      count_answers++
      print question_number "," answer_id "," exam_year "," exam_month "," exam_number
    }
    {
      line = $0
      gsub(/\r/, "", line)
      gsub(/\f/, "", line)
      line = trim(line)
      if (line == "") next

      test_number = extract_test_number(line)
      if (test_number != "") {
        start_exam(test_number)
        next
      }

      if (exam_number == "") next

      if (line ~ /^[0-9][0-9]?$/) next

      if (line ~ /^[0-9][0-9]?[[:space:]]*[[:alpha:]].*$/) {
        qnum = line
        sub(/[^0-9].*$/, "", qnum)
        answer_raw = line
        sub(/^[0-9][0-9]?[[:space:]]*/, "", answer_raw)
        answer_id = normalize_answer(answer_raw)
        if (answer_id != "") {
          push_answer(qnum + 0, answer_id)
          if (qnum >= next_question) next_question = qnum + 1
        }
        next
      }

      answer_id = normalize_answer(line)
      if (answer_id == "") next

      while (next_question <= 45 && seen[next_question]) next_question++
      if (next_question <= 45) {
        push_answer(next_question, answer_id)
        next_question++
      } else {
        print "WARN: " file_name " test " exam_number " has extra answer token '"'"'" line "'"'"'." > "/dev/stderr"
      }
    }
    END {
      flush_exam()
    }
  ' "$file" >> "$tmp_csv"
done < <(find "$INPUT_DIR" -type f -name "*.txt" | sort)

mv "$tmp_csv" "$OUTPUT_CSV"
trap - EXIT

echo "Created corrections CSV: $OUTPUT_CSV"
