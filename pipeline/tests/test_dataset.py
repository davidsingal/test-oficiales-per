"""DATA-2 / DATA-3 / DATA-4 / DATA-6 on the extracted dataset (data/outputs/exams.json).

Skipped when the file isn't there (run `extract` first). Override the path with
EXAMS_JSON.
"""

import json
import os
from collections import Counter
from pathlib import Path

import pytest

from common import LICENCES, MONTHS

PATH = Path(os.environ.get("EXAMS_JSON", "/data/outputs/exams.json"))
pytestmark = pytest.mark.skipif(not PATH.exists(), reason=f"{PATH} not found: run extract first")

BY_SLUG = {licence.slug: licence for licence in LICENCES.values()}
# Tests the source PDFs publish incomplete (see "Known warnings" in pipeline/README.md).
INCOMPLETE = {("per", 2021, "diciembre")}


@pytest.fixture(scope="module")
def exams():
    return json.loads(PATH.read_text(encoding="utf-8"))["exams"]


def test_only_per_and_py_tests(exams):
    assert {exam["licence"] for exam in exams} == set(BY_SLUG)
    keys = [(e["licence"], e["year"], e["month"], e["testNumber"]) for e in exams]
    assert len(keys) == len(set(keys)), "a test appears twice"


def test_every_test_is_complete_and_in_order(exams):
    for exam in exams:
        licence = BY_SLUG[exam["licence"]]
        numbers = [q["questionNumber"] for q in exam["questions"]]
        assert numbers == sorted(set(numbers))
        if (exam["licence"], exam["year"], exam["month"]) in INCOMPLETE:
            assert numbers[0] == 1 and numbers[-1] <= licence.questions
        else:
            assert numbers == list(range(1, licence.questions + 1)), (exam["licence"], exam["year"], exam["month"], exam["testNumber"])


def test_every_question_has_four_options_a_topic_and_a_key(exams):
    for exam in exams:
        topics = {name for name, _ in BY_SLUG[exam["licence"]].topics}
        assert exam["month"] in MONTHS.values()
        for question in exam["questions"]:
            where = (exam["licence"], exam["year"], exam["month"], exam["testNumber"], question["questionNumber"])
            assert question["questionText"].strip(), where
            assert [a["answerId"] for a in question["answers"]] == ["A", "B", "C", "D"], where
            assert all(a["answerText"].strip() for a in question["answers"]), where
            assert question["topic"] in topics, where
            key = question["correctAnswers"]
            assert key == ["ANULADA"] or (key and set(key) <= set("ABCD")), where


def test_topics_follow_the_official_layout(exams):
    """Most questions sit in their canonical block: catches headings read from the wrong licence."""
    for slug, licence in BY_SLUG.items():
        placed = Counter(
            q["topic"] == licence.topic_for_question(q["questionNumber"])
            for e in exams
            if e["licence"] == slug
            for q in e["questions"]
        )
        assert placed[True] / sum(placed.values()) > 0.99, slug


def test_links_point_to_the_official_pdf_page(exams):
    for exam in exams:
        assert exam["sourceUrl"].startswith("https://"), exam["sourceUrl"]
        assert exam["sourceUrl"].split("#")[0].lower().endswith(".pdf")
        assert "#page=" in exam["sourceUrl"]


def test_py_overrides_are_applied(exams):
    def key(year, month, test, number):
        exam = next(e for e in exams if (e["licence"], e["year"], e["month"], e["testNumber"]) == ("py", year, month, test))
        return next(q for q in exam["questions"] if q["questionNumber"] == number)["correctAnswers"]

    assert key(2021, "diciembre", 1, 39) == ["A", "D"]
    assert key(2022, "diciembre", 2, 31) == ["ANULADA"]
