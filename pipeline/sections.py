"""Split an official PDF into its exam sections.

Each original session PDF holds several exams back to back (Capitán de Yate,
Patrón de Yate, PER, PER for PNB holders, PNB), each starting on a page whose
header reads "EXAMEN DE <licence>" + "Código de Test NN". Answer keys follow
the same layout, one page per section.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import pdfplumber

from common import fold

# Checked in order against the folded "EXAMEN DE ..." header line.
LICENCES = (
    ("PNB", "basica"),
    ("CY", "capitan"),
    ("PY", "yate"),
    ("PER", "embarcaciones de recreo"),
)
CODE_RE = re.compile(r"codigo (?:de )?test\s*:?\s*(?P<code>\d{1,2}(?:\(cid:\d+\))?|\(cid:\d+\))")
HEADER_LINES = 20  # the section header is always near the top of its first page


@dataclass
class Section:
    licence: str | None
    test: int | None
    start_page: int  # 1-based
    pages: list[pdfplumber.page.Page] = field(default_factory=list)


def page_lines(page: pdfplumber.page.Page) -> list[str]:
    # Cached on the page: text extraction is the slow part and each page is read
    # twice (once to find section headers, once to parse its section).
    cached = getattr(page, "_lines", None)
    if cached is None:
        cached = [line.strip() for line in (page.extract_text() or "").splitlines() if line.strip()]
        page._lines = cached  # type: ignore[attr-defined]
    return cached


def detect_header(lines: list[str]) -> tuple[str | None, int | None] | None:
    """Returns (licence, test) if the page starts a section, else None."""
    for i, line in enumerate(lines[:HEADER_LINES]):
        code = CODE_RE.search(fold(line))
        if not code:
            continue
        raw = code["code"]
        test = int(raw) if raw.isdigit() else None  # "0(cid:24)": glyph that can't be decoded
        licence = None
        for previous in reversed(lines[: i + 1]):
            # Spaces removed: some PDFs break words ("PATRÓ N", "CAPITÁNDE YATE").
            compact = fold(previous).replace(" ", "")
            if "examen" in compact:
                licence = next((name for name, key in LICENCES if key.replace(" ", "") in compact), None)
                break
        return licence, test
    return None


def split_sections(pdf: pdfplumber.PDF, hints: dict[int, dict] | None = None) -> list[Section]:
    """Splits the PDF into sections. `hints` maps a 1-based page number to
    {"licence": ..., "test": ...} for sources whose header is missing or unreadable;
    a hinted page always starts a section and its values win over what is printed."""
    hints = hints or {}
    sections: list[Section] = []
    for page in pdf.pages:
        header = detect_header(page_lines(page))
        hint = hints.get(page.page_number)
        if header or hint:
            licence, test = header or (None, None)
            if hint:
                licence = hint.get("licence", licence)
                test = hint.get("test", test)
            sections.append(Section(licence=licence, test=test, start_page=page.page_number))
        if sections:
            sections[-1].pages.append(page)
    return sections
