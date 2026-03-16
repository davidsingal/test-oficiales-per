#!/usr/bin/env bash
set -euo pipefail

INPUT_DIR="${1:-extracted/exams}"
QUESTIONS_CSV="${2:-outputs/questions.csv}"
ANSWERS_CSV="${3:-outputs/answers.csv}"

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory '$INPUT_DIR' does not exist." >&2
  exit 1
fi

mkdir -p "$(dirname "$QUESTIONS_CSV")"
mkdir -p "$(dirname "$ANSWERS_CSV")"

tmp_questions="$(mktemp)"
tmp_answers="$(mktemp)"
trap 'rm -f "$tmp_questions" "$tmp_answers"' EXIT

echo 'id,question,category,exam_year,exam_number,image,explanation' > "$tmp_questions"
echo 'id,question_id,answer,is_correct' > "$tmp_answers"

q_id=0
a_id=0

while IFS= read -r file; do
  exam_year="$(basename "$(dirname "$file")")"
  base_name="$(basename "$file" .txt)"
  exam_number=""
  if [[ "$base_name" =~ _([0-9]+)$ ]]; then
    exam_number="${BASH_REMATCH[1]}"
  fi

  awk -v year="$exam_year" \
      -v exam="$exam_number" \
      -v start_qid="$q_id" \
      -v start_aid="$a_id" \
      -v qcsv="$tmp_questions" \
      -v acsv="$tmp_answers" '
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
      return (nxt ~ /^[0-9]+[[:space:]]+/)
    }
    function flush_question() {
      if (qnum == "") return

      qid++
      print qid "," esc(qtext) "," esc(category) "," esc(year) "," esc(exam) ",\"\",\"\"" >> qcsv

      aid++
      print aid "," qid "," esc(opt["a"]) ",\"\"" >> acsv
      aid++
      print aid "," qid "," esc(opt["b"]) ",\"\"" >> acsv
      aid++
      print aid "," qid "," esc(opt["c"]) ",\"\"" >> acsv
      aid++
      print aid "," qid "," esc(opt["d"]) ",\"\"" >> acsv

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

      for (i = 1; i <= n; i++) {
        line = trim(lines[i])
        if (line == "") continue

        if (line ~ /^[0-9][0-9]?[0-9]?[[:space:]]+/) {
          flush_question()
          qnum = line
          sub(/[[:space:]].*$/, "", qnum)
          qtext = line
          sub(/^[0-9][0-9]?[0-9]?[[:space:]]+/, "", qtext)
          qtext = trim(qtext)
          current = "q"
          continue
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
    }
  ' "$file" > /tmp/csv_ids.$$

  q_id="$(awk -F= '/^QID=/{print $2}' /tmp/csv_ids.$$)"
  a_id="$(awk -F= '/^AID=/{print $2}' /tmp/csv_ids.$$)"
done < <(find "$INPUT_DIR" -type f -name '*.txt' | sort)

rm -f /tmp/csv_ids.$$

mv "$tmp_questions" "$QUESTIONS_CSV"
mv "$tmp_answers" "$ANSWERS_CSV"
trap - EXIT

echo "Created questions CSV: $QUESTIONS_CSV"
echo "Created answers CSV: $ANSWERS_CSV"
echo "Total questions: $q_id"
echo "Total answers: $a_id"
