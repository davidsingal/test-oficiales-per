"""Builds e2e/fixtures/exams.json: a few real sessions cut from the full dataset.

CI can't rebuild the full dataset (some PDFs must be downloaded by hand), so the
e2e job ingests this fixture instead. It covers what the tests rely on: both
licences, two years each, a June session only PER has, every topic, and a few
annulled questions.

    python3 e2e/fixtures/build.py [data/outputs/exams.json]
"""

import json
import sys
from pathlib import Path

SESSIONS = {
    ("per", 2026, "noviembre"),
    ("per", 2026, "junio"),
    ("per", 2025, "noviembre"),
    ("py", 2026, "noviembre"),
    ("py", 2026, "abril"),
    ("py", 2025, "noviembre"),
}

source = Path(sys.argv[1] if len(sys.argv) > 1 else "data/outputs/exams.json")
exams = json.loads(source.read_text(encoding="utf-8"))["exams"]
picked = [exam for exam in exams if (exam["licence"], exam["year"], exam["month"]) in SESSIONS]

found = {(exam["licence"], exam["year"], exam["month"]) for exam in picked}
if found != SESSIONS:
    sys.exit(f"Missing sessions in {source}: {sorted(SESSIONS - found)}")

target = Path(__file__).with_name("exams.json")
target.write_text(json.dumps({"exams": picked}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
questions = sum(len(exam["questions"]) for exam in picked)
print(f"Wrote {target} ({len(picked)} tests, {questions} questions)")
