"""Shared helpers for the PDF parsers."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

MONTHS = {
    1: "enero",
    2: "febrero",
    3: "marzo",
    4: "abril",
    5: "mayo",
    6: "junio",
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
    11: "noviembre",
    12: "diciembre",
}

@dataclass(frozen=True)
class Licence:
    """One licence whose exams are extracted, with its official exam layout."""

    code: str  # as detected in the section header ("PER", "PY")
    slug: str  # as stored in the dataset and the database ("per", "py")
    questions: int  # questions in a full test
    # Canonical topics and the question numbers they cover. Used as a fallback
    # when a topic heading can't be read from the PDF, and to cross-check the
    # headings that are found.
    topics: tuple[tuple[str, range], ...]

    def topic_for_question(self, number: int) -> str | None:
        for name, numbers in self.topics:
            if number in numbers:
                return name
        return None


PER = Licence(
    code="PER",
    slug="per",
    questions=45,
    topics=(
        ("Nomenclatura náutica", range(1, 5)),
        ("Elementos de amarre y fondeo", range(5, 7)),
        ("Seguridad", range(7, 11)),
        ("Legislación", range(11, 13)),
        ("Balizamiento", range(13, 18)),
        ("Reglamento (RIPA)", range(18, 28)),
        ("Maniobra y navegación", range(28, 30)),
        ("Emergencias en la mar", range(30, 33)),
        ("Meteorología", range(33, 37)),
        ("Teoría de la navegación", range(37, 42)),
        ("Carta de navegación", range(42, 46)),
    ),
)

# Patrón de Yate: 40 questions in four units of 10 (RD 875/2014, anexo II).
PY = Licence(
    code="PY",
    slug="py",
    questions=40,
    topics=(
        ("Seguridad en la mar", range(1, 11)),
        ("Meteorología", range(11, 21)),
        ("Teoría de navegación", range(21, 31)),
        ("Navegación carta", range(31, 41)),
    ),
)

LICENCES = {licence.code: licence for licence in (PER, PY)}


def fold(text: str) -> str:
    """Lowercase, strip accents and collapse whitespace, for loose comparisons."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text).strip().lower()


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


@dataclass
class Issues:
    """Collects warnings and errors found while parsing, keyed by source file."""

    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def warn(self, source: str, message: str) -> None:
        self.warnings.append(f"{source}: {message}")

    def error(self, source: str, message: str) -> None:
        self.errors.append(f"{source}: {message}")
