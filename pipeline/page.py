"""Import the exam PDF links from a saved copy of the ministry's exams page.

The page blocks automated clients, so a person saves it from the browser
(View source / Save as) and passes it here. Its links are labelled
consistently even though the filenames are not:

    Enunciados exámenes convocatoria de noviembre 2026
    Plantilla de respuestas convocatoria de noviembre 2026
    Modificación de respuestas a exámenes de abril 2025

The page is the authoritative list: for every session it mentions, the
session's documents in sources.json are replaced by the page's (keeping the
sha256, hints and review flags of documents whose URL did not change).
"""

from __future__ import annotations

import re
from html.parser import HTMLParser
from urllib.parse import urljoin

from common import MONTHS, fold
from sources import DOC_KINDS, Document, Session

PAGE_URL = "https://www.transportes.gob.es/marina-mercante/titulaciones/titulaciones-de-recreo/examenes/"
MONTH_NUMBERS = {name: number for number, name in MONTHS.items()} | {"setiembre": 9}
LABEL_RE = re.compile(
    r"^(?P<kind>enunciados examenes|plantilla de respuestas|modificacion(?: \d+)? de respuestas)"
    r".*?\b(?P<month>" + "|".join(MONTH_NUMBERS) + r")\b(?: de)? (?P<year>\d{4})"
)
KIND_BY_LABEL = {"enunciados": "exams", "plantilla": "answers", "modificacion": "modifications"}


class _Links(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []  # (text, href)
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        href = dict(attrs).get("href") or ""
        if tag == "a" and href.lower().split("?")[0].endswith(".pdf"):
            self._href, self._text = href, []

    def handle_data(self, data: str) -> None:
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href:
            self.links.append((" ".join("".join(self._text).split()), self._href))
            self._href = None


def parse_page(html: str, since: str) -> dict[str, dict[str, list[str]]]:
    """Returns {session: {kind: [url, ...]}} for sessions from `since` (YYYY-MM) on."""
    parser = _Links()
    parser.feed(html)
    found: dict[str, dict[str, list[str]]] = {}
    for text, href in parser.links:
        match = LABEL_RE.match(fold(text))
        if not match:
            continue
        session = f"{match['year']}-{MONTH_NUMBERS[match['month']]:02d}"
        if session < since:
            continue
        kind = KIND_BY_LABEL[match["kind"].split()[0]]
        url = urljoin(PAGE_URL, href)
        urls = found.setdefault(session, {}).setdefault(kind, [])
        if url not in urls:
            urls.append(url)
    return found


def merge(sessions: list[Session], found: dict[str, dict[str, list[str]]]) -> list[str]:
    """Applies the page's links to `sessions` in place. Returns a change log."""
    by_key = {s.session: s for s in sessions}
    changes: list[str] = []
    for key in sorted(found):
        session = by_key.get(key)
        if session is None:
            session = Session(session=key)
            sessions.append(session)
            by_key[key] = session
            changes.append(f"{key}: new session")
        # Documents are matched by filename across all kinds: the same file is sometimes
        # linked from another CDN folder or from the www host (which blocks automated
        # downloads), so an already known, downloadable URL is kept.
        known = {d.filename: d for kind in DOC_KINDS for d in getattr(session, kind)}
        for kind in DOC_KINDS:
            before = {d.filename for d in getattr(session, kind)}
            names = [url.rsplit("/", 1)[-1] for url in found[key].get(kind, [])]
            new = [known.get(name) or Document(url=url) for name, url in zip(names, found[key].get(kind, []))]
            changes += [f"{key}: + {kind:13s} {name}" for name in names if name not in before]
            changes += [f"{key}: - {kind:13s} {name}" for name in before if name not in names]
            setattr(session, kind, new)
    return changes
