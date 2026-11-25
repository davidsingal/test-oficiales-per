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

QUESTIONS_PER_TEST = 45

# Canonical topics and the question numbers they cover in the official exam layout.
# Used as a fallback when a topic heading can't be read from the PDF, and to
# cross-check the headings that are found.
TOPICS: list[tuple[str, range]] = [
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
]


def topic_for_question(number: int) -> str | None:
    for name, numbers in TOPICS:
        if number in numbers:
            return name
    return None


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
