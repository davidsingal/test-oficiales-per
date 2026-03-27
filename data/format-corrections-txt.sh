#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_DIR="${1:-$SCRIPT_DIR/extracted/correcciones}"

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Error: input directory '$INPUT_DIR' does not exist." >&2
  exit 1
fi

while IFS= read -r file; do
  tmp_file="$(mktemp)"

  awk -v file_path="$file" -v tmp_file="$tmp_file" '
    function trim(s) {
      sub(/^[[:space:]]+/, "", s)
      sub(/[[:space:]]+$/, "", s)
      return s
    }
    function remove_accents(s) {
      gsub(/[ÁÀÄÂáàäâ]/, "A", s)
      gsub(/[ÉÈËÊéèëê]/, "E", s)
      gsub(/[ÍÌÏÎíìïî]/, "I", s)
      gsub(/[ÓÒÖÔóòöô]/, "O", s)
      gsub(/[ÚÙÜÛúùüû]/, "U", s)
      gsub(/[Ññ]/, "N", s)
      return s
    }
    function normalize_answer(raw, normalized, compact, parts, unique, count, i, out) {
      normalized = toupper(remove_accents(trim(raw)))
      compact = normalized
      gsub(/[[:space:]]+/, "", compact)
      gsub(/[.,;:()\/_|+-]+/, "", compact)

      if (compact == "") return ""
      if (normalized ~ /^ANULADA/ || compact ~ /^ANULADA/) return "ANULADA"
      if (compact == "CYC") return "BC"

      if (compact ~ /^[ABCD]+$/) {
        count = split(compact, parts, "")
      } else if (compact ~ /^[ABCD](Y[ABCD])+$/) {
        count = split(compact, parts, "Y")
      } else {
        return ""
      }

      delete unique
      out = ""
      for (i = 1; i <= count; i++) {
        if (!(parts[i] in unique)) {
          unique[parts[i]] = 1
          out = out parts[i]
        }
      }
      return out
    }
    function marker_type(raw, normalized, compact, token, letters) {
      normalized = toupper(remove_accents(trim(raw)))
      compact = normalized
      gsub(/[[:space:]]+/, "", compact)
      gsub(/[.,;:()\/_|+-]+/, "", compact)

      if (compact == "") return ""
      if (normalized ~ /^ANULADA/ || compact ~ /^ANULADA/) return "annulada"
      if (compact == "CYC") return "ocr_multi_keep"

      token = compact
      gsub(/[^ABCDY]/, "", token)
      if (token ~ /^[ABCD](Y[ABCD])+$/) return "multi"

      letters = token
      gsub(/Y/, "", letters)
      if (length(letters) > 1) return "multi"

      return ""
    }
    function remove_token_at(position,    j) {
      if (position < 1 || position > sequential_count) return
      for (j = position; j < sequential_count; j++) {
        sequential_answers[j] = sequential_answers[j + 1]
        sequential_marker_types[j] = sequential_marker_types[j + 1]
      }
      delete sequential_answers[sequential_count]
      delete sequential_marker_types[sequential_count]
      sequential_count--
    }
    function format_answer(answer, parts, count, i, out) {
      if (answer == "ANULADA" || length(answer) <= 1) return answer
      count = split(answer, parts, "")
      out = parts[1]
      for (i = 2; i <= count; i++) out = out "y" parts[i]
      return out
    }
    function reset_current_test(    i) {
      delete explicit_answers
      delete sequential_answers
      delete sequential_marker_types
      sequential_count = 0
    }
    function flush_test(    question_number, line, answer, normalized_line, header_line, qnum, answer_raw, extra_count, marker_count, marker_pos, marker_kind) {
      if (current_test == "") return

      reset_current_test()

      for (i = 1; i <= current_count; i++) {
        line = current_lines[i]
        gsub(/\r/, "", line)
        gsub(/\f/, "", line)
        line = trim(line)
        if (line == "") continue
        if (line ~ /^[0-9]{1,2}$/) continue

        if (match(line, /^[0-9]{1,2}[.]?[[:space:]]*.+$/)) {
          qnum = line
          sub(/[^0-9].*$/, "", qnum)
          answer_raw = line
          sub(/^[0-9]{1,2}[.]?[[:space:]]*/, "", answer_raw)
          answer = normalize_answer(answer_raw)
          if (qnum + 0 >= 1 && qnum + 0 <= 45 && answer != "") {
            explicit_answers[qnum + 0] = answer
            continue
          }
        }

        answer = normalize_answer(line)
        if (answer != "") {
          sequential_count++
          sequential_answers[sequential_count] = answer
          sequential_marker_types[sequential_count] = marker_type(line)
        }
      }

      if (sequential_count == 46) {
        marker_count = 0
        marker_pos = 0
        marker_kind = ""

        for (i = 1; i <= sequential_count; i++) {
          if (sequential_marker_types[i] != "") {
            marker_count++
            marker_pos = i
            marker_kind = sequential_marker_types[i]
          }
        }

        if (marker_count == 1) {
          if (marker_kind == "annulada") {
            if (marker_pos < sequential_count) {
              remove_token_at(marker_pos + 1)
            } else if (marker_pos > 1) {
              remove_token_at(marker_pos - 1)
            }
          } else if (marker_kind == "multi") {
            if (marker_pos > 1) {
              remove_token_at(marker_pos - 1)
            } else {
              remove_token_at(sequential_count)
            }
          } else if (marker_kind == "ocr_multi_keep") {
            if (marker_pos < sequential_count) {
              remove_token_at(marker_pos + 1)
            } else if (marker_pos > 1) {
              remove_token_at(marker_pos - 1)
            }
          } else {
            remove_token_at(sequential_count)
          }
        } else {
          remove_token_at(sequential_count)
        }
      }

      if (!printed_preamble) {
        for (i = 1; i <= preamble_count; i++) {
          print preamble_lines[i] >> tmp_file
        }
        if (preamble_count > 0) print "" >> tmp_file
        printed_preamble = 1
      }

      print "Código de Test " current_test >> tmp_file
      sequential_index = 1
      extra_count = 0

      for (question_number = 1; question_number <= 45; question_number++) {
        if (question_number in explicit_answers) {
          answer = explicit_answers[question_number]
        } else if (sequential_index <= sequential_count) {
          answer = sequential_answers[sequential_index]
          sequential_index++
        } else {
          print "ERROR: Missing answer for question " question_number " in test " current_test " from " file_path > "/dev/stderr"
          exit 1
        }

        print question_number ". " format_answer(answer) >> tmp_file
      }

      if (sequential_index <= sequential_count) {
        extra_count = sequential_count - sequential_index + 1
        print "WARN: Ignoring " extra_count " extra sequential answers in test " current_test " from " file_path > "/dev/stderr"
      }

      tests_written++
      if (!end_of_file) print "" >> tmp_file
      current_test = ""
      current_count = 0
    }
    BEGIN {
      preamble_count = 0
      printed_preamble = 0
      current_test = ""
      current_count = 0
      tests_written = 0
      end_of_file = 0
    }
    {
      raw = $0
      gsub(/\r/, "", raw)
      gsub(/\f/, "", raw)
      line = trim(raw)

      header_line = tolower(remove_accents(line))
      if (header_line ~ /^codigo de test[[:space:]]+[0-9][0-9]?$/) {
        end_of_file = 0
        flush_test()
        current_test = header_line
        sub(/^codigo de test[[:space:]]+/, "", current_test)
        if (length(current_test) == 1) current_test = "0" current_test
        current_count = 0
        next
      }

      if (current_test != "") {
        current_count++
        current_lines[current_count] = raw
        next
      }

      if (line == "" || line ~ /^[0-9]+$/) next
      preamble_count++
      preamble_lines[preamble_count] = line
    }
    END {
      end_of_file = 1
      flush_test()
      if (tests_written == 0) {
        print "ERROR: No test blocks found in " file_path > "/dev/stderr"
        exit 1
      }
    }
  ' "$file"

  if ! cmp -s "$file" "$tmp_file"; then
    mv "$tmp_file" "$file"
    echo "Formatted ${file#$SCRIPT_DIR/../}"
  else
    rm -f "$tmp_file"
    echo "Already formatted ${file#$SCRIPT_DIR/../}"
  fi
done < <(find "$INPUT_DIR" -type f -name "*.txt" | sort)
