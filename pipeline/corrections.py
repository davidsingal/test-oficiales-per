"""Parse the answers of one PER answer-key section.

The ministry publishes later rectifications (annulled questions, extra valid
answers) as FreeText annotations drawn on top of the original answer, so the
text layer alone is not enough: each annotation is matched to the answer row
it covers and overrides it.
"""

from __future__ import annotations

import re

import pdfplumber

from common import QUESTIONS_PER_TEST, Issues

ANSWER_PATTERN = r"A\s*NULADA\b.*|[A-D](?:\s*(?:y|,)?\s*[A-D])*"
# "8 B y D", "32C", "12. A", "30 ANULADA (Todas las respuestas ...)", "40 A nulada (...)"
ANSWER_RE = re.compile(rf"^(?P<number>\d{{1,2}})\.?\s*(?P<answer>{ANSWER_PATTERN})\s*$", re.IGNORECASE)
OVERRIDE_RE = re.compile(rf"^(?P<answer>{ANSWER_PATTERN})$", re.IGNORECASE)

# question_number -> ["A"] | ["B", "D"] | ["ANULADA"]
Answers = dict[int, list[str]]


def normalize_answer(raw: str) -> list[str]:
    raw = raw.strip().upper()
    if re.sub(r"\s+", "", raw).startswith("ANULADA"):
        return ["ANULADA"]
    return sorted(set(re.findall(r"[A-D]", raw)))


def overlap(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    """Overlapping area of two (x0, top, x1, bottom) boxes. Answer keys can have two
    columns, so an annotation must be matched on both axes."""
    width = min(a[2], b[2]) - max(a[0], b[0])
    height = min(a[3], b[3]) - max(a[1], b[1])
    return max(0.0, width) * max(0.0, height)


def parse_override(raw: str | None) -> re.Match[str] | None:
    """Parses an annotation's text as an answer. Some PDFs store it as single-byte
    text that gets decoded as UTF-16 ("乁䱕䑁⁁..." instead of "ANULADA ..."), so the
    re-decoded form is tried as well."""
    text = (raw or "").strip()
    try:
        redecoded = text.encode("utf-16-le").decode("latin-1").strip()
    except UnicodeError:
        redecoded = ""
    return OVERRIDE_RE.match(text) or OVERRIDE_RE.match(redecoded)


def parse_answers(pages: list[pdfplumber.page.Page], where: str, issues: Issues) -> tuple[Answers, int]:
    """Returns the answers of the section and how many annotation overrides were applied."""
    answers: Answers = {}
    overrides = 0

    for page in pages:
        rows: list[tuple[int, tuple[float, float, float, float]]] = []  # (question, box)
        for line in page.extract_text_lines():
            text = line["text"].strip()
            match = ANSWER_RE.match(text)
            if not match:
                continue
            number = int(match["number"])
            if not 1 <= number <= QUESTIONS_PER_TEST:
                continue
            if number in answers:
                issues.warn(where, f"q{number}: duplicate answer line '{text}'")
                continue
            answers[number] = normalize_answer(match["answer"])
            rows.append((number, (line["x0"], line["top"], line["x1"], line["bottom"])))

        for annot in page.annots or []:
            if "FreeText" not in str((annot.get("data") or {}).get("Subtype")):
                continue
            contents = (annot.get("contents") or "").strip()
            if not contents:
                continue
            note = f"page {page.page_number} annotation '{contents}'"
            parsed = parse_override(contents)
            if not parsed:
                issues.warn(where, f"{note}: not an answer, ignored")
                continue
            box = (annot["x0"], annot["top"], annot["x1"], annot["bottom"])
            best = max(rows, key=lambda r: overlap(box, r[1]), default=None)
            if best is None or overlap(box, best[1]) == 0:
                issues.error(where, f"{note}: does not cover any answer row")
                continue
            answers[best[0]] = normalize_answer(parsed["answer"])
            overrides += 1

    return answers, overrides


def check_complete(answers: Answers, where: str, issues: Issues) -> None:
    missing = [n for n in range(1, QUESTIONS_PER_TEST + 1) if n not in answers]
    if missing:
        issues.error(where, f"missing answers for questions {missing}")
