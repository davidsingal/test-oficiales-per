"""The list of official exam sessions and where their original PDFs live.

sources.json is the single source of truth for which PDFs belong to which
session. It is (re)built from the ministry's exams page with `import-page`,
completed by `discover`, and `extract` keeps the sha256 of each file current.

Per session:
  exams          the "Enunciados exámenes" PDF(s)
  answers        the "Plantilla de respuestas" PDF(s)
  modifications  the "Modificación de respuestas" PDF(s). Either a re-issued
                 answer key (applied automatically, after `answers`) or a letter
                 from the exam board, whose PER changes must be transcribed
                 into `overrides` (or the document marked `"reviewed": true`
                 if it does not affect PER).
  overrides      [{"test": 2, "question": 8, "answers": ["B", "C"], "source": <letter URL>}]
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

SOURCES_FILE = Path(__file__).with_name("sources.json")
KINDS = ("exams", "answers")  # every session needs both
DOC_KINDS = (*KINDS, "modifications")


@dataclass
class Document:
    url: str
    sha256: str | None = None
    # Page number -> {"licence": "PER", "test": 1}, for sections whose printed
    # header is missing or unreadable in the source PDF.
    hints: dict[int, dict] | None = None
    # A modification letter that has been read and transcribed into `overrides`
    # (or that does not affect PER).
    reviewed: bool | None = None

    def __post_init__(self) -> None:
        if self.hints:
            self.hints = {int(page): value for page, value in self.hints.items()}

    @property
    def filename(self) -> str:
        return self.url.rsplit("/", 1)[-1]


@dataclass
class Session:
    session: str  # "YYYY-MM"
    exams: list[Document] = field(default_factory=list)
    answers: list[Document] = field(default_factory=list)
    modifications: list[Document] = field(default_factory=list)
    overrides: list[dict] = field(default_factory=list)

    @property
    def year(self) -> int:
        return int(self.session[:4])

    @property
    def month(self) -> int:
        return int(self.session[5:7])


def load(path: Path = SOURCES_FILE) -> list[Session]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [
        Session(
            session=entry["session"],
            overrides=entry.get("overrides", []),
            **{kind: [Document(**doc) for doc in entry.get(kind, [])] for kind in DOC_KINDS},
        )
        for entry in raw["sessions"]
    ]


def _doc_dict(doc: Document) -> dict:
    return {k: v for k, v in asdict(doc).items() if v is not None}


def save(sessions: list[Session], path: Path = SOURCES_FILE) -> None:
    entries = []
    for s in sorted(sessions, key=lambda s: s.session):
        entry: dict = {"session": s.session}
        for kind in DOC_KINDS:
            docs = [_doc_dict(d) for d in getattr(s, kind)]
            if docs or kind in KINDS:
                entry[kind] = docs
        if s.overrides:
            entry["overrides"] = s.overrides
        entries.append(entry)
    path.write_text(json.dumps({"sessions": entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
