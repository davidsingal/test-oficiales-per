#!/usr/bin/env bash
set -euo pipefail

INPUT_DIR="${1:-extracted/exams}"
QUESTIONS_CSV="${2:-outputs/questions.csv}"
ANSWERS_CSV="${3:-outputs/answers.csv}"
REPORT_CSV="${4:-outputs/generation_report.csv}"

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory '$INPUT_DIR' does not exist." >&2
  exit 1
fi

mkdir -p "$(dirname "$QUESTIONS_CSV")"
mkdir -p "$(dirname "$ANSWERS_CSV")"
mkdir -p "$(dirname "$REPORT_CSV")"

tmp_questions="$(mktemp)"
tmp_answers="$(mktemp)"
tmp_report="$(mktemp)"
trap 'rm -f "$tmp_questions" "$tmp_answers" "$tmp_report"' EXIT

echo 'id,question,category,exam_year,exam_month,exam_number,question_number,image,explanation' > "$tmp_questions"
echo 'id,question_id,answer_id,answer' > "$tmp_answers"
echo 'file,exam_year,exam_month,exam_number,question_count,answers_count,unknown_category_count,status' > "$tmp_report"

q_id=0
a_id=0
invalid_exam_count=0
total_unknown_category_count=0

while IFS= read -r file; do
  exam_year="$(basename "$(dirname "$file")")"
  base_name="$(basename "$file" .txt)"
  month_token="${base_name%%_*}"
  month_token="$(printf '%s' "$month_token" | tr '[:upper:]' '[:lower:]')"
  exam_month=""
  case "$month_token" in
    enero) exam_month="01" ;;
    febrero) exam_month="02" ;;
    marzo) exam_month="03" ;;
    abril) exam_month="04" ;;
    mayo) exam_month="05" ;;
    junio) exam_month="06" ;;
    julio) exam_month="07" ;;
    agosto) exam_month="08" ;;
    septiembre|setiembre) exam_month="09" ;;
    octubre) exam_month="10" ;;
    noviembre) exam_month="11" ;;
    diciembre) exam_month="12" ;;
  esac
  exam_number=""
  if [[ "$base_name" =~ _([0-9]+)$ ]]; then
    exam_number="$(printf '%02d' "${BASH_REMATCH[1]}")"
  fi

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
    function canon_text(s) {
      s = trim(s)
      s = tolower(s)
      gsub(/[[:space:]]+/, " ", s)
      gsub(/[.]/, "", s)
      gsub(/[áàäâ]/, "a", s)
      gsub(/[éèëê]/, "e", s)
      gsub(/[íìïî]/, "i", s)
      gsub(/[óòöô]/, "o", s)
      gsub(/[úùüû]/, "u", s)
      gsub(/[()]/, "", s)
      return trim(s)
    }
    function normalize_category(raw,   s) {
      s = canon_text(raw)
      if (s == "nomenclatura nautica") return "Nomenclatura náutica"
      if (s == "elementos de amarre y fondeo") return "Elementos de amarre y fondeo"
      if (s == "seguridad") return "Seguridad"
      if (s == "legislacion") return "Legislación"
      if (s == "balizamiento") return "Balizamiento"
      if (s == "reglamento ripa" || s == "reglamento") return "Reglamento (RIPA)"
      if (s == "maniobra y navegacion") return "Maniobra y navegación"
      if (s == "emergencias en la mar") return "Emergencias en la mar"
      if (s == "meteorologia") return "Meteorología"
      if (s == "teoria de la navegacion") return "Teoría de la navegación"
      if (s == "carta de navegacion") return "Carta de navegación"
      return ""
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
    function word_count(s,   t) {
      t = squash(s)
      if (t == "") return 0
      return split(t, _wc, " ")
    }
    function next_nonempty(idx,   j, t) {
      for (j = idx + 1; j <= n; j++) {
        t = trim(lines[j])
        if (t != "") return t
      }
      return ""
    }
    function is_ignored(s) {
      if (s ~ /^(MINISTERIO|SECRETAR[ÍI]A|DE TRANSPORTES|Y MOVILIDAD|DIRECCI[ÓO]N GENERAL|SUBDIRECCI[ÓO]N GENERAL|[ÁA]REA FUNCIONAL|EXAMEN DE PATR[ÓO]N|C[óo]digo de Test)/) return 1
      return 0
    }
    function is_category(s, idx,   nxt, normalized) {
      normalized = normalize_category(s)
      if (normalized == "") return 0
      nxt = next_nonempty(idx)
      return (nxt ~ /^[0-9][0-9]?[0-9]?([^0-9]|$)/)
    }
    function category_by_qnum(qn) {
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
      return ""
    }
    function flush_question(   assigned_category, test_index) {
      if (qnum == "") return

      qid++
      assigned_category = category_by_qnum(qnum)
      if (assigned_category == "") assigned_category = category
      if (assigned_category == "") assigned_category = "Unknown category"
      if (assigned_category == "Unknown category") unknown_count++
      test_index = "undefined"
      if ((qnum + 0) >= 1 && (qnum + 0) <= 45) test_index = qnum + 0
      print qid "," esc(qtext) "," esc(assigned_category) "," esc(year) "," esc(month) "," esc(exam) "," esc(test_index) ",\"\",\"\"" >> qcsv

      aid++
      print aid "," qid ",\"A\"," esc(opt["a"]) >> acsv
      aid++
      print aid "," qid ",\"B\"," esc(opt["b"]) >> acsv
      aid++
      print aid "," qid ",\"C\"," esc(opt["c"]) >> acsv
      aid++
      print aid "," qid ",\"D\"," esc(opt["d"]) >> acsv

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
          if (qnum != "" && (candidate_qnum + 0) > qnum && (candidate_qnum + 0) <= 45 && current == "d") {
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

        if (line ~ /^[abcd]\)/) {
          current = substr(line, 1, 1)
          option_text = line
          sub(/^[abcd]\)[[:space:]]*/, "", option_text)
          opt[current] = trim(option_text)
          continue
        }

        if (is_category(line, i)) {
          category = normalize_category(line)
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
  ' "$file" > /tmp/csv_ids.$$

  q_id_new="$(awk -F= '/^QID=/{print $2}' /tmp/csv_ids.$$)"
  a_id_new="$(awk -F= '/^AID=/{print $2}' /tmp/csv_ids.$$)"
  unknown_count="$(awk -F= '/^UNKNOWN=/{print $2}' /tmp/csv_ids.$$)"

  file_q_count=$((q_id_new - prev_q_id))
  file_a_count=$((a_id_new - prev_a_id))
  total_unknown_category_count=$((total_unknown_category_count + unknown_count))

  status="ok"
  if [[ "$file_q_count" -ne 45 || "$file_a_count" -ne 180 ]]; then
    status="incomplete"
    echo "WARN: $(basename "$file") produced $file_q_count questions and $file_a_count answers (expected 45/180)." >&2
    invalid_exam_count=$((invalid_exam_count + 1))
  fi

  echo "\"$(basename "$file")\",\"$exam_year\",\"$exam_month\",\"$exam_number\",$file_q_count,$file_a_count,$unknown_count,\"$status\"" >> "$tmp_report"

  cat "$file_tmp_questions" >> "$tmp_questions"
  cat "$file_tmp_answers" >> "$tmp_answers"
  q_id="$q_id_new"
  a_id="$a_id_new"
  rm -f "$file_tmp_questions" "$file_tmp_answers"
done < <(find "$INPUT_DIR" -type f -name '*.txt' | sort)

rm -f /tmp/csv_ids.$$

mv "$tmp_questions" "$QUESTIONS_CSV"
mv "$tmp_answers" "$ANSWERS_CSV"
mv "$tmp_report" "$REPORT_CSV"
trap - EXIT

echo "Created questions CSV: $QUESTIONS_CSV"
echo "Created answers CSV: $ANSWERS_CSV"
echo "Created report CSV: $REPORT_CSV"
echo "Total questions: $q_id"
echo "Total answers: $a_id"
echo "Exams with incomplete parsing: $invalid_exam_count"
echo "Questions with Unknown category: $total_unknown_category_count"
