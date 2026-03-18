#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT_DIR="${1:-$SCRIPT_DIR/extracted/examenes-oficiales}"
QUESTIONS_CSV="${2:-$SCRIPT_DIR/outputs/questions.csv}"
ANSWERS_CSV="${3:-$SCRIPT_DIR/outputs/answers.csv}"

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory '$INPUT_DIR' does not exist." >&2
  exit 1
fi

mkdir -p "$(dirname "$QUESTIONS_CSV")"
mkdir -p "$(dirname "$ANSWERS_CSV")"

tmp_questions="$(mktemp)"
tmp_answers="$(mktemp)"
tmp_ids="$(mktemp)"
trap 'rm -f "$tmp_questions" "$tmp_answers" "$tmp_ids"' EXIT

echo 'id,question_number,topic,question_text,exam_year,exam_month,exam_number' > "$tmp_questions"
echo 'id,question_id,answer_id,answer_text' > "$tmp_answers"

q_id=0
a_id=0
processed_files=0
incomplete_files=0
skipped_files=0
unknown_topic_count=0

echo "Generation report (terminal):"
printf "%-24s %-6s %-6s %-6s %-9s %-9s %-11s %-10s\n" "file" "year" "month" "test" "questions" "answers" "unknown" "status"

while IFS= read -r file; do
  base_name="$(basename "$file" .txt)"
  if [[ ! "$base_name" =~ ^([0-9]{4})_([0-9]{2})_test_([0-9]+)$ ]]; then
    echo "WARN: skipping file with unexpected name format: $(basename "$file")" >&2
    skipped_files=$((skipped_files + 1))
    continue
  fi

  exam_year="${BASH_REMATCH[1]}"
  exam_month="${BASH_REMATCH[2]}"
  exam_number="$(printf '%02d' "${BASH_REMATCH[3]}")"

  prev_q_id="$q_id"
  prev_a_id="$a_id"
  file_tmp_questions="$(mktemp)"
  file_tmp_answers="$(mktemp)"

  awk -v year="$exam_year" \
      -v month="$exam_month" \
      -v exam="$exam_number" \
      -v start_qid="$q_id" \
      -v start_aid="$a_id" \
      -v qcsv="$file_tmp_questions" \
      -v acsv="$file_tmp_answers" '
    function trim(s) {
      sub(/^[[:space:]]+/, "", s)
      sub(/[[:space:]]+$/, "", s)
      return s
    }
    function squash(s) {
      gsub(/[[:space:]]+/, " ", s)
      return trim(s)
    }
    function esc(s) {
      s = squash(s)
      gsub(/"/, "\"\"", s)
      return "\"" s "\""
    }
    function append_text(old, extra) {
      if (old == "") return extra
      return old " " extra
    }
    function topic_by_qnum(qn) {
      qn = qn + 0
      if (qn >= 1  && qn <= 4)  return "Nomenclatura náutica"
      if (qn >= 5  && qn <= 6)  return "Elementos de amarre y fondeo"
      if (qn >= 7  && qn <= 10) return "Seguridad"
      if (qn >= 11 && qn <= 12) return "Legislación"
      if (qn >= 13 && qn <= 17) return "Balizamiento"
      if (qn >= 18 && qn <= 27) return "Reglamento (RIPA)"
      if (qn >= 28 && qn <= 29) return "Maniobra y navegación"
      if (qn >= 30 && qn <= 32) return "Emergencias en la mar"
      if (qn >= 33 && qn <= 36) return "Meteorología"
      if (qn >= 37 && qn <= 41) return "Teoría de la navegación"
      if (qn >= 42 && qn <= 45) return "Carta de navegación"
      return "Unknown topic"
    }
    function is_ignored(s) {
      return (s ~ /^(MINISTERIO|SECRETAR[ÍI]A|DE TRANSPORTES|Y MOVILIDAD|DIRECCI[ÓO]N GENERAL|SUBDIRECCI[ÓO]N GENERAL|[ÁA]REA FUNCIONAL|EXAMEN DE PATR[ÓO]N|C[óo]digo de Test)/)
    }
    function flush_question(   topic) {
      if (qnum == "") return

      qid++
      topic = topic_by_qnum(qnum)
      if (topic == "Unknown topic") unknown_count++
      print qid "," esc(qnum) "," esc(topic) "," esc(qtext) "," esc(year) "," esc(month) "," esc(exam) >> qcsv

      aid++; print aid "," qid ",\"A\"," esc(opt["a"]) >> acsv
      aid++; print aid "," qid ",\"B\"," esc(opt["b"]) >> acsv
      aid++; print aid "," qid ",\"C\"," esc(opt["c"]) >> acsv
      aid++; print aid "," qid ",\"D\"," esc(opt["d"]) >> acsv

      qnum = ""
      qtext = ""
      current = ""
      delete opt
    }
    {
      line = $0
      gsub(/\r/, "", line)
      gsub(/\f/, "", line)
      lines[++n] = line
    }
    END {
      qid = start_qid
      aid = start_aid
      unknown_count = 0

      for (i = 1; i <= n; i++) {
        line = trim(lines[i])
        if (line == "") continue

        if (line ~ /^[0-9][0-9]?[0-9]?([^0-9]|$)/) {
          candidate_qnum = line
          sub(/[[:space:]].*$/, "", candidate_qnum)
          sub(/[^0-9].*$/, "", candidate_qnum)

          if (qnum == "" && (candidate_qnum + 0) == 1) {
            qnum = candidate_qnum + 0
            qtext = line
            sub(/^[0-9][0-9]?[0-9]?/, "", qtext)
            sub(/^[[:space:]]+/, "", qtext)
            qtext = trim(qtext)
            current = "q"
            continue
          }

          if (qnum != "" && (candidate_qnum + 0) == (qnum + 1)) {
            flush_question()
            qnum = candidate_qnum + 0
            qtext = line
            sub(/^[0-9][0-9]?[0-9]?/, "", qtext)
            sub(/^[[:space:]]+/, "", qtext)
            qtext = trim(qtext)
            current = "q"
            continue
          }
        }

        if (line ~ /^[a-dA-D]\)/) {
          current = tolower(substr(line, 1, 1))
          option_text = line
          sub(/^[a-dA-D]\)[[:space:]]*/, "", option_text)
          opt[current] = trim(option_text)
          continue
        }

        if (is_ignored(line)) continue

        if (qnum != "") {
          if (current == "q") {
            qtext = append_text(qtext, line)
          } else if (current in opt) {
            opt[current] = append_text(opt[current], line)
          } else {
            qtext = append_text(qtext, line)
          }
        }
      }

      flush_question()
      print "QID=" qid
      print "AID=" aid
      print "UNKNOWN=" unknown_count
    }
  ' "$file" > "$tmp_ids"

  q_id_new="$(awk -F= '/^QID=/{print $2}' "$tmp_ids")"
  a_id_new="$(awk -F= '/^AID=/{print $2}' "$tmp_ids")"
  file_unknown_count="$(awk -F= '/^UNKNOWN=/{print $2}' "$tmp_ids")"

  file_q_count=$((q_id_new - prev_q_id))
  file_a_count=$((a_id_new - prev_a_id))
  unknown_topic_count=$((unknown_topic_count + file_unknown_count))

  status="ok"
  if [[ "$file_q_count" -ne 45 || "$file_a_count" -ne 180 ]]; then
    status="incomplete"
    incomplete_files=$((incomplete_files + 1))
  fi

  printf "%-24s %-6s %-6s %-6s %-9s %-9s %-11s %-10s\n" \
    "$(basename "$file")" "$exam_year" "$exam_month" "$exam_number" \
    "$file_q_count" "$file_a_count" "$file_unknown_count" "$status"

  cat "$file_tmp_questions" >> "$tmp_questions"
  cat "$file_tmp_answers" >> "$tmp_answers"
  q_id="$q_id_new"
  a_id="$a_id_new"
  processed_files=$((processed_files + 1))
  rm -f "$file_tmp_questions" "$file_tmp_answers"
done < <(find "$INPUT_DIR" -maxdepth 1 -type f -name '*.txt' | sort)

mv "$tmp_questions" "$QUESTIONS_CSV"
mv "$tmp_answers" "$ANSWERS_CSV"
trap - EXIT

echo
echo "Created questions CSV: $QUESTIONS_CSV"
echo "Created answers CSV: $ANSWERS_CSV"
echo "Processed files: $processed_files"
echo "Skipped files: $skipped_files"
echo "Incomplete files: $incomplete_files"
echo "Total questions: $q_id"
echo "Total answers: $a_id"
echo "Unknown-topic questions: $unknown_topic_count"
