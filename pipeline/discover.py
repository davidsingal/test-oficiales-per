"""Find the official PDFs of exam sessions that are not in sources.json yet.

The ministry's listing page blocks automated clients, but the PDFs themselves
are served from a public CDN. Filenames are not fully consistent, so for each
month we try the naming patterns the ministry has used so far (most recent
first) and keep the first one that exists. Requests are HEAD only and paced.

    python main.py discover [--from YYYY-MM] [--to YYYY-MM] [--retry-gaps] [--write]
"""

from __future__ import annotations

import time
import urllib.error
import urllib.request
from datetime import date

from common import MONTHS
from sources import Document, Session

CDN = "https://cdn.transportes.gob.es/portal-web-transportes/maritimo"
FOLDERS = ("examenes-teoricos", "examenes_y_formacion")
USER_AGENT = "test-per-data-pipeline"
DELAY_SECONDS = 0.25

# Filename stems seen on the CDN, most recent conventions first.
PATTERNS = {
    "exams": (
        "enunciados-examenes-recreo_{month}-{year}",  # since 2026-11
        "enunciados_examenes_{month}_{year}",
        "enunciados_examenes_recreo_{month}_{year}",
        "enunciados_examenes_titulos_recreo_{month}_{year}",
        "examenes_recreo_{month}_{year}",
        "examenes_titulos_recreo_{month}_{year}",
        "examenes_{month}_{year}",
        "enunciados_examenes_convocatoria_de_{month}_{year}",
        "examenes_convocatoria_de_{month}_{year}",
    ),
    "answers": (
        "plantillas-respuestas-examenes_{month}-{year}",  # since 2026-11
        "plantilla_respuestas_{month}_{year}",
        "plantillas_respuestas_{month}_{year}",
        "plantillas_respuestas_examenes_{month}_{year}",
        "plantillas_respuestas_examenes_recreo_{month}_{year}",
        "plantillas_respuestas_examenes_titulos_recreo_{month}_{year}",
        "plantillas_examenes_recreo_{month}_{year}",
        "plantillas_examenes_{month}_{year}",
        "respuestas_examenes_recreo_{month}_{year}",
        "plantillas_respuesta_{month}_{year}",
        "plantilla_respuestas_examenes_{month}_{year}",
        "plantilla_de_respuestas_examenes_convocatoria_de_{month}_{year}",
        "plantillas_de_respuestas_examenes_convocatoria_de_{month}_{year}",
    ),
}


def is_pdf(url: str) -> bool:
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status == 200 and "pdf" in response.headers.get("Content-Type", "")
    except urllib.error.HTTPError:
        return False
    finally:
        time.sleep(DELAY_SECONDS)


def candidates(kind: str, year: int, month: int) -> list[str]:
    stems = [p.format(month=MONTHS[month], year=year) for p in PATTERNS[kind]]
    return [f"{CDN}/{folder}/{stem}.pdf" for stem in stems for folder in FOLDERS]


def find(kind: str, year: int, month: int) -> str | None:
    return next((url for url in candidates(kind, year, month) if is_pdf(url)), None)


def months_between(start: str, end: str) -> list[tuple[int, int]]:
    y, m = int(start[:4]), int(start[5:7])
    ey, em = int(end[:4]), int(end[5:7])
    result = []
    while (y, m) <= (ey, em):
        result.append((y, m))
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return result


def next_month(session: str) -> str:
    y, m = int(session[:4]), int(session[5:7])
    return f"{y + 1}-01" if m == 12 else f"{y}-{m + 1:02d}"


def discover(
    sessions: list[Session], start: str | None, end: str | None, retry_gaps: bool = False
) -> list[Session]:
    """Returns the sessions found or completed. Mutates `sessions` in place."""
    by_key = {s.session: s for s in sessions}
    start = start or (next_month(max(by_key)) if by_key else "2020-01")
    end = end or date.today().strftime("%Y-%m")
    changed: list[Session] = []

    # New months, plus (on request) known sessions still missing their exams or answers.
    incomplete = {(s.year, s.month) for s in sessions if retry_gaps and not (s.exams and s.answers)}
    for year, month in sorted(set(months_between(start, end)) | incomplete):
        key = f"{year}-{month:02d}"
        session = by_key.get(key) or Session(session=key)
        found = False
        for kind in ("exams", "answers"):
            if getattr(session, kind):
                continue
            url = find(kind, year, month)
            print(f"  {key} {kind:7s} {url or '-'}")
            if url:
                getattr(session, kind).append(Document(url=url))
                found = True
        if found:
            if key not in by_key:
                by_key[key] = session
                sessions.append(session)
            changed.append(session)

    return changed
