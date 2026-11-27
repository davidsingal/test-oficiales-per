"""Parse the questions of one exam section (PER or Patrón de Yate)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from common import PER, Issues, Licence, fold, squash

QUESTION_RE = re.compile(r"^(?P<number>\d{1,2})\.?\s+(?P<text>\S.*)$")
OPTION_RE = re.compile(r"^(?P<letter>[a-dA-D])\)\s*(?P<text>.*)$")
TEST_HEADER_RE = re.compile(r"^codigo (?:de )?test\b")

# Page footers that pdfplumber interleaves with the question text.
FOOTER_PREFIXES = tuple(fold(p) for p in ("SUBDIRECCIÓN GENERAL DE SEGURIDAD", "ÁREA FUNCIONAL DE"))
PAGE_NUMBER_RE = re.compile(r"^\d{1,2}$")
# How far ahead a question number may jump when the source PDF is missing questions.
MAX_NUMBER_GAP = 10
# PNB exams are questions 1-27; a "PER" section that ends there is a mislabelled PNB.
PNB_LAST_QUESTION = 27


@dataclass
class Question:
    number: int
    text: str
    topic: str
    options: dict[str, str] = field(default_factory=dict)


@dataclass
class Exam:
    licence: Licence
    year: int
    month: int
    test: int
    source: str
    page: int | None = None
    url: str | None = None
    questions: list[Question] = field(default_factory=list)


def as_topic_heading(line: str, licence: Licence) -> str | None:
    # Headings are capitalised; a wrapped option ending in e.g. "... y de\nseguridad." is not one.
    if not line[:1].isupper():
        return None
    folded = fold(line).rstrip(". ")
    return next((name for name, _ in licence.topics if fold(name) == folded), None)


def is_noise(line: str) -> bool:
    return bool(PAGE_NUMBER_RE.match(line)) or fold(line).startswith(FOOTER_PREFIXES)


def parse_questions(pages: list[list[str]], licence: Licence, where: str, issues: Issues) -> list[Question]:
    """Parses the text lines of a section's pages into questions."""
    last = licence.questions
    questions: list[Question] = []
    heading_topic: str | None = None
    current: Question | None = None
    current_part: str | None = None  # "q" for the statement, or the option letter

    def at_question_boundary() -> bool:
        # A new question can only start once the previous one has its options.
        return current is None or len(current.options) == 4

    for lines in pages:
        # Pages after the last question are annexes (charts, tables): stop there.
        if current and current.number == last and len(current.options) == 4:
            break

        # Everything before "Código de Test" on a section's first page is the letterhead.
        start = next((i + 1 for i, line in enumerate(lines) if TEST_HEADER_RE.match(fold(line))), 0)

        for line in lines[start:]:
            if is_noise(line):
                continue

            topic = as_topic_heading(line, licence)
            if topic and at_question_boundary():
                heading_topic = topic
                continue

            question = QUESTION_RE.match(line)
            if question and at_question_boundary():
                number = int(question["number"])
                expected = current.number + 1 if current else 1
                if expected <= number < expected + MAX_NUMBER_GAP and number <= last:
                    if number != expected:
                        # Questions are missing from the PDF, so their topic heading may be too.
                        heading_topic = None
                    fallback = licence.topic_for_question(number)
                    if heading_topic and fallback and heading_topic != fallback:
                        issues.warn(
                            where, f"q{number}: heading topic '{heading_topic}' differs from expected '{fallback}'"
                        )
                    current = Question(number=number, text=question["text"], topic=heading_topic or fallback or "")
                    current_part = "q"
                    questions.append(current)
                    continue

            option = OPTION_RE.match(line)
            if option and current is not None:
                letter = option["letter"].upper()
                if letter not in current.options and len(current.options) == "ABCD".index(letter):
                    current.options[letter] = option["text"]
                    current_part = letter
                    continue

            if current is None:
                continue

            # Continuation of a wrapped line.
            if current_part == "q":
                current.text = f"{current.text} {line}"
            elif current_part:
                current.options[current_part] = f"{current.options[current_part]} {line}"

    for q in questions:
        q.text = squash(q.text)
        q.options = {k: squash(v) for k, v in q.options.items()}
        if sorted(q.options) != ["A", "B", "C", "D"]:
            issues.error(where, f"q{q.number}: expected options A-D, got {sorted(q.options)}")
        if not q.topic:
            issues.error(where, f"q{q.number}: no topic")

    return questions


def is_full_exam(questions: list[Question], licence: Licence) -> bool:
    """True for a test that starts at q1. For PER, also False for the PNB-holders
    part (from q28) and for a PNB-length test mislabelled as PER."""
    if not questions or questions[0].number != 1:
        return False
    return licence != PER or questions[-1].number > PNB_LAST_QUESTION


def check_complete(exam: Exam, where: str, issues: Issues) -> None:
    numbers = {q.number for q in exam.questions}
    missing = [n for n in range(1, exam.licence.questions + 1) if n not in numbers]
    if missing:
        issues.warn(where, f"missing questions {missing} (not present in the source PDF)")
